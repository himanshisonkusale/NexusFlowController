const TIERS = {
  anonymous: {
    maxRequests: 5,
    windowSize: 60,
  },
  premium: {
    maxRequests: 100,
    windowSize: 60,
  },
};

module.exports = TIERS;