const { JSDOM } = require('jsdom');
const createDOMPurify = require('dompurify');
const config = require('../config/config');

const window = new JSDOM('').window;
const DOMPurify = createDOMPurify(window);

class Sanitizer {
  static sanitizeMessage(message) {
    if (!message || typeof message !== 'string') {
      return '';
    }

    // Limit message length
    const truncated = message.slice(0, config.message.maxLength);
    
    // Sanitize HTML and potentially malicious content
    const sanitized = DOMPurify.sanitize(truncated, { 
      ALLOWED_TAGS: [],
      ALLOWED_ATTR: []
    });

    // Trim whitespace
    return sanitized.trim();
  }

  static sanitizeUsername(username) {
    if (!username || typeof username !== 'string') {
      return '';
    }

    // Remove any HTML tags and trim
    const cleaned = DOMPurify.sanitize(username, { 
      ALLOWED_TAGS: [],
      ALLOWED_ATTR: []
    }).trim();

    // Validate length
    if (cleaned.length < config.user.minUsernameLength || 
        cleaned.length > config.user.maxUsernameLength) {
      return '';
    }

    // Validate allowed characters
    if (!config.user.allowedUsernameChars.test(cleaned)) {
      return '';
    }

    return cleaned;
  }

  static validateMessageData(data) {
    const errors = [];

    if (!data.text || typeof data.text !== 'string') {
      errors.push('Message text is required');
    }

    if (!data.name || typeof data.name !== 'string') {
      errors.push('Username is required');
    }

    if (data.text && data.text.length > config.message.maxLength) {
      errors.push(`Message exceeds maximum length of ${config.message.maxLength} characters`);
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }
}

module.exports = Sanitizer;