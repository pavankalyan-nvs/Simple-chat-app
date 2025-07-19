const config = {
  port: process.env.PORT || 3000,
  environment: process.env.NODE_ENV || 'development',
  
  // Rate limiting configuration
  rateLimit: {
    windowMs: 60 * 1000, // 1 minute
    maxRequests: 10, // limit each IP to 10 requests per windowMs
    messageLimit: {
      windowMs: 60 * 1000, // 1 minute  
      maxMessages: 10 // limit each user to 10 messages per minute
    }
  },

  // Message configuration
  message: {
    maxLength: 500,
    historyLimit: 100
  },

  // User configuration
  user: {
    maxUsernameLength: 30,
    minUsernameLength: 2,
    allowedUsernameChars: /^[a-zA-Z0-9_-]+$/
  },

  // Security configuration
  security: {
    corsOrigin: process.env.CORS_ORIGIN || 'http://localhost:3000',
    helmetConfig: {
      contentSecurityPolicy: {
        directives: {
          defaultSrc: ["'self'"],
          scriptSrc: ["'self'", "'unsafe-inline'", "https://cdn.socket.io"],
          styleSrc: ["'self'", "'unsafe-inline'"],
          connectSrc: ["'self'", "ws:", "wss:"]
        }
      }
    }
  }
};

module.exports = config;