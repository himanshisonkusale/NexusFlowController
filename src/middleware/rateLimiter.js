const Redis = require('ioredis');
const jwt = require('jsonwebtoken');
const circuitBreaker = require('../utils/circuitBreaker');
const { httpRequestsTotal, rateLimitedRequests, requestDuration } = require('../utils/metrics');
const TIERS = require('../utils/tierConfig');

const redis = new Redis({
  host: process.env.REDIS_HOST || 'localhost',
  port: 6379,
  retryStrategy: () => null,
  lazyConnect: true,
  connectTimeout: 500,
  commandTimeout: 500,
});

redis.on('connect', () => {
  console.log('Redis connected successfully!');
});

redis.on('error', (err) => {
  console.error('Redis error:', err.message);
});

const luaScript = `
  local key = KEYS[1]
  local maxRequests = tonumber(ARGV[1])
  local windowSize = tonumber(ARGV[2])
  
  local current = redis.call('INCR', key)
  
  if current == 1 then
    redis.call('EXPIRE', key, windowSize)
  end
  
  if current > maxRequests then
    local ttl = redis.call('TTL', key)
    return {0, ttl}
  end
  
  return {1, -1}
`;

// JWT se tier nikalo
const getTier = (req) => {
  try {
    const authHeader = req.headers['authorization'];
    if (!authHeader) return 'anonymous';

    const token = authHeader.split(' ')[1];
    const decoded = jwt.verify(token, 'nexus-secret-key');
    return decoded.tier || 'anonymous';
  } catch (err) {
    return 'anonymous';
  }
};

const rateLimiter = async (req, res, next) => {
  const userIP = req.ip;
  const tier = getTier(req);
  const { maxRequests, windowSize } = TIERS[tier] || TIERS.anonymous;
  const key = `rate_limit:${tier}:${userIP}`;
  const end = requestDuration.startTimer();

  if (circuitBreaker.isOpen()) {
    console.warn('Circuit OPEN — allowing request (fail-open)');
    httpRequestsTotal.inc({ status: 'allowed' });
    end();
    return next();
  }

  try {
    const result = await redis.eval(
      luaScript,
      1,
      key,
      maxRequests,
      windowSize
    );

    circuitBreaker.recordSuccess();

    const allowed = result[0];
    const ttl = result[1];

    if (!allowed) {
      rateLimitedRequests.inc();
      httpRequestsTotal.inc({ status: 'blocked' });
      end();
      return res.status(429).json({
        message: 'Too Many Requests',
        tier: tier,
        retryAfter: `${ttl} seconds`,
      });
    }

    httpRequestsTotal.inc({ status: 'allowed' });
    end();
    next();
  } catch (err) {
    console.error('Redis error:', err.message);
    circuitBreaker.recordFailure();
    httpRequestsTotal.inc({ status: 'allowed' });
    end();
    next();
  }
};

module.exports = rateLimiter;