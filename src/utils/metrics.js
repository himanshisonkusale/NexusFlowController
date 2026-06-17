const client = require('prom-client');

const register = new client.Registry();

client.collectDefaultMetrics({ register });

const httpRequestsTotal = new client.Counter({
  name: 'http_requests_total',
  help: 'Total number of HTTP requests',
  labelNames: ['status'],
  registers: [register],
});

const rateLimitedRequests = new client.Counter({
  name: 'rate_limited_requests_total',
  help: 'Total number of rate limited requests',
  registers: [register],
});

const requestDuration = new client.Histogram({
  name: 'http_request_duration_ms',
  help: 'Request duration in milliseconds',
  buckets: [1, 5, 10, 25, 50, 100, 200, 500],
  registers: [register],
});

module.exports = {
  register,
  httpRequestsTotal,
  rateLimitedRequests,
  requestDuration,
};