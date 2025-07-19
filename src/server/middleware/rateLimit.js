const rateLimit = require('express-rate-limit');
const config = require('../config/config');

// Rate limiter for HTTP requests
const httpRateLimit = rateLimit({
  windowMs: config.rateLimit.windowMs,
  max: config.rateLimit.maxRequests,
  message: {
    error: 'Too many requests from this IP, please try again later.',
    retryAfter: Math.ceil(config.rateLimit.windowMs / 1000)
  },
  standardHeaders: true,
  legacyHeaders: false,
});

// Rate limiter for socket messages
class SocketRateLimit {
  constructor() {
    this.userLimits = new Map();
    this.cleanupInterval = setInterval(() => {
      this.cleanup();
    }, config.rateLimit.messageLimit.windowMs);
  }

  checkLimit(userId) {
    const now = Date.now();
    const userLimit = this.userLimits.get(userId) || {
      count: 0,
      resetTime: now + config.rateLimit.messageLimit.windowMs
    };

    // Reset counter if window has expired
    if (now > userLimit.resetTime) {
      userLimit.count = 0;
      userLimit.resetTime = now + config.rateLimit.messageLimit.windowMs;
    }

    // Check if limit exceeded
    if (userLimit.count >= config.rateLimit.messageLimit.maxMessages) {
      return {
        allowed: false,
        retryAfter: Math.ceil((userLimit.resetTime - now) / 1000)
      };
    }

    // Increment counter
    userLimit.count++;
    this.userLimits.set(userId, userLimit);

    return {
      allowed: true,
      remaining: config.rateLimit.messageLimit.maxMessages - userLimit.count
    };
  }

  cleanup() {
    const now = Date.now();
    for (const [userId, limit] of this.userLimits.entries()) {
      if (now > limit.resetTime) {
        this.userLimits.delete(userId);
      }
    }
  }

  removeUser(userId) {
    this.userLimits.delete(userId);
  }

  destroy() {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
    }
    this.userLimits.clear();
  }
}

module.exports = {
  httpRateLimit,
  SocketRateLimit
};