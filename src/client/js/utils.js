// Utility functions for the chat application
class Utils {
  // Sanitize text content to prevent XSS
  static sanitizeText(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }

  // Format timestamp to readable format
  static formatTime(timestamp) {
    const date = new Date(timestamp);
    const now = new Date();
    const diffInMinutes = Math.floor((now - date) / (1000 * 60));
    
    if (diffInMinutes < 1) {
      return 'Just now';
    } else if (diffInMinutes < 60) {
      return `${diffInMinutes}m ago`;
    } else if (diffInMinutes < 1440) { // 24 hours
      const hours = Math.floor(diffInMinutes / 60);
      return `${hours}h ago`;
    } else {
      return date.toLocaleDateString();
    }
  }

  // Generate a random ID
  static generateId() {
    return Math.random().toString(36).substr(2, 9);
  }

  // Debounce function to limit function calls
  static debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
      const later = () => {
        clearTimeout(timeout);
        func(...args);
      };
      clearTimeout(timeout);
      timeout = setTimeout(later, wait);
    };
  }

  // Throttle function to limit function calls
  static throttle(func, limit) {
    let inThrottle;
    return function(...args) {
      if (!inThrottle) {
        func.apply(this, args);
        inThrottle = true;
        setTimeout(() => inThrottle = false, limit);
      }
    };
  }

  // Validate username format
  static validateUsername(username) {
    if (!username || typeof username !== 'string') {
      return { valid: false, error: 'Username is required' };
    }

    const trimmed = username.trim();
    
    if (trimmed.length < 2) {
      return { valid: false, error: 'Username must be at least 2 characters long' };
    }

    if (trimmed.length > 30) {
      return { valid: false, error: 'Username must be no more than 30 characters long' };
    }

    if (!/^[a-zA-Z0-9_-]+$/.test(trimmed)) {
      return { valid: false, error: 'Username can only contain letters, numbers, underscore, and dash' };
    }

    return { valid: true, username: trimmed };
  }

  // Validate message format
  static validateMessage(message) {
    if (!message || typeof message !== 'string') {
      return { valid: false, error: 'Message is required' };
    }

    const trimmed = message.trim();
    
    if (trimmed.length === 0) {
      return { valid: false, error: 'Message cannot be empty' };
    }

    if (trimmed.length > 500) {
      return { valid: false, error: 'Message must be no more than 500 characters long' };
    }

    return { valid: true, message: trimmed };
  }

  // Show loading spinner
  static showLoading() {
    const loading = document.getElementById('loading');
    if (loading) {
      loading.classList.remove('hidden');
    }
  }

  // Hide loading spinner
  static hideLoading() {
    const loading = document.getElementById('loading');
    if (loading) {
      loading.classList.add('hidden');
    }
  }

  // Show toast notification
  static showToast(message, type = 'error', duration = 5000) {
    const toastId = type === 'error' ? 'error-toast' : 'success-toast';
    const messageId = type === 'error' ? 'error-message' : 'success-message';
    
    const toast = document.getElementById(toastId);
    const messageElement = document.getElementById(messageId);
    
    if (toast && messageElement) {
      messageElement.textContent = message;
      toast.classList.remove('hidden');
      
      // Auto-hide after duration
      setTimeout(() => {
        toast.classList.add('hidden');
      }, duration);
    }
  }

  // Hide toast notification
  static hideToast(type = 'error') {
    const toastId = type === 'error' ? 'error-toast' : 'success-toast';
    const toast = document.getElementById(toastId);
    
    if (toast) {
      toast.classList.add('hidden');
    }
  }

  // Scroll to bottom of messages
  static scrollToBottom(element) {
    if (element) {
      element.scrollTop = element.scrollHeight;
    }
  }

  // Play notification sound (if available)
  static playNotificationSound() {
    try {
      const audio = new Audio('data:audio/wav;base64,UklGRnoGAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQoGAACBhYqFbF1fdJivrJBhNjVgodDbq2EcBj+a2/LDciUFLIHO8tiJNwgZaLvt559NEAxQp+PwtmMcBjiR1/LMeSwFJHfH8N2QQAoUXrTp66hVFApGn+DyvmEBijN9zdzFgihSm+Xty4kpCy6Dy/LYeTQIGGS68d+dN');
      audio.play().catch(() => {
        // Ignore if sound fails to play
      });
    } catch (error) {
      // Ignore sound errors
    }
  }

  // Local storage helpers
  static setStorage(key, value) {
    try {
      localStorage.setItem(key, JSON.stringify(value));
    } catch (error) {
      console.warn('Failed to save to localStorage:', error);
    }
  }

  static getStorage(key) {
    try {
      const item = localStorage.getItem(key);
      return item ? JSON.parse(item) : null;
    } catch (error) {
      console.warn('Failed to read from localStorage:', error);
      return null;
    }
  }

  static removeStorage(key) {
    try {
      localStorage.removeItem(key);
    } catch (error) {
      console.warn('Failed to remove from localStorage:', error);
    }
  }

  // Handle slash commands
  static parseSlashCommand(message) {
    if (!message.startsWith('/')) {
      return null;
    }

    const parts = message.slice(1).split(' ');
    const command = parts[0].toLowerCase();
    const args = parts.slice(1);

    return { command, args, raw: message };
  }

  // Process slash commands
  static processSlashCommand(command, chat) {
    switch (command.command) {
      case 'help':
        chat.displaySystemMessage('Available Commands: /help, /random, /clearchat, /emojis, /time');
        break;
      case 'random':
        const randomNumber = Math.floor(Math.random() * 100);
        chat.displaySystemMessage(`Random Number: ${randomNumber}`);
        break;
      case 'clearchat':
        chat.clearMessages();
        chat.displaySystemMessage('Chat cleared locally');
        break;
      case 'emojis':
        chat.displaySystemMessage('😊 smile, ❤️ love/heart, 👋 hey/hello, 😂 lol, 🎉 congrats, 😎 cool, 🔥 fire, 👍 good, 🤔 thinking, ☕ coffee');
        break;
      case 'time':
        const now = new Date();
        chat.displaySystemMessage(`Current time: ${now.toLocaleTimeString()}`);
        break;
      default:
        chat.displaySystemMessage(`Unknown Command: /${command.command}`);
    }
  }

  // Copy text to clipboard
  static async copyToClipboard(text) {
    try {
      await navigator.clipboard.writeText(text);
      return true;
    } catch (error) {
      // Fallback for older browsers
      try {
        const textArea = document.createElement('textarea');
        textArea.value = text;
        document.body.appendChild(textArea);
        textArea.select();
        document.execCommand('copy');
        document.body.removeChild(textArea);
        return true;
      } catch (fallbackError) {
        console.error('Failed to copy to clipboard:', fallbackError);
        return false;
      }
    }
  }

  // Detect if user is on mobile
  static isMobile() {
    return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
  }

  // Focus element with virtual keyboard support
  static focusInput(element) {
    if (element) {
      element.focus();
      // On mobile, scroll into view
      if (this.isMobile()) {
        setTimeout(() => {
          element.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }, 300);
      }
    }
  }
}

// Export for use in other modules
window.Utils = Utils;