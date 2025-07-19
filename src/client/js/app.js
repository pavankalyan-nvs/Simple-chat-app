// Main application entry point
class ChatApp {
  constructor() {
    this.socketClient = null;
    this.chat = null;
    this.isInitialized = false;
    
    this.init();
  }

  async init() {
    try {
      console.log('Initializing Chat App...');
      Utils.showLoading();

      // Initialize socket client
      this.socketClient = new SocketClient();
      
      // Wait for socket connection
      await this.waitForConnection();
      
      // Initialize chat
      this.chat = new Chat(this.socketClient);
      
      // Setup global event handlers
      this.setupGlobalEventHandlers();
      
      // Setup error handlers
      this.setupErrorHandlers();
      
      // Mark as initialized
      this.isInitialized = true;
      
      console.log('Chat App initialized successfully');
      Utils.hideLoading();
      
      // Show welcome message
      this.showWelcomeMessage();
      
    } catch (error) {
      console.error('Failed to initialize Chat App:', error);
      Utils.hideLoading();
      Utils.showToast('Failed to initialize chat application. Please refresh the page.', 'error');
    }
  }

  waitForConnection(timeout = 10000) {
    return new Promise((resolve, reject) => {
      if (this.socketClient.isSocketConnected()) {
        resolve();
        return;
      }

      const timeoutId = setTimeout(() => {
        reject(new Error('Connection timeout'));
      }, timeout);

      this.socketClient.on('socket:connected', () => {
        clearTimeout(timeoutId);
        resolve();
      });
    });
  }

  setupGlobalEventHandlers() {
    // Handle page visibility changes
    document.addEventListener('visibilitychange', () => {
      if (document.hidden) {
        console.log('Page hidden');
      } else {
        console.log('Page visible');
        // Could trigger read receipts or reconnection here
      }
    });

    // Handle online/offline events
    window.addEventListener('online', () => {
      console.log('Browser back online');
      Utils.showToast('Back online', 'success', 2000);
      if (!this.socketClient.isSocketConnected()) {
        this.socketClient.reconnect();
      }
    });

    window.addEventListener('offline', () => {
      console.log('Browser went offline');
      Utils.showToast('You are offline', 'error', 3000);
    });

    // Handle beforeunload (user leaving page)
    window.addEventListener('beforeunload', (e) => {
      if (this.socketClient && this.chat && this.chat.isUserJoined()) {
        // Don't show confirmation dialog for modern browsers
        // Just cleanup connections
        this.cleanup();
      }
    });

    // Handle keyboard shortcuts
    document.addEventListener('keydown', (e) => {
      // Ctrl/Cmd + Enter to send message
      if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
        e.preventDefault();
        if (this.chat) {
          this.chat.handleFormSubmit();
        }
      }
      
      // Escape to close modals
      if (e.key === 'Escape') {
        const modal = document.querySelector('.modal:not(.hidden)');
        if (modal) {
          modal.classList.add('hidden');
        }
        
        const toasts = document.querySelectorAll('.toast:not(.hidden)');
        toasts.forEach(toast => toast.classList.add('hidden'));
      }
    });

    // Handle focus events for better UX
    window.addEventListener('focus', () => {
      // Clear any notifications when window gets focus
      if (this.clearNotificationTimeout) {
        clearTimeout(this.clearNotificationTimeout);
      }
    });

    window.addEventListener('blur', () => {
      // Could set up notifications for when window loses focus
    });
  }

  setupErrorHandlers() {
    // Global error handler
    window.addEventListener('error', (event) => {
      console.error('Global error:', event.error);
      // Don't show toast for every error to avoid spam
    });

    // Unhandled promise rejection handler
    window.addEventListener('unhandledrejection', (event) => {
      console.error('Unhandled promise rejection:', event.reason);
      event.preventDefault(); // Prevent console spam
    });

    // Socket connection error handling
    this.socketClient.on('socket:disconnected', (reason) => {
      if (reason === 'transport close' || reason === 'ping timeout') {
        Utils.showToast('Connection lost. Attempting to reconnect...', 'error');
      }
    });

    this.socketClient.on('socket:reconnected', () => {
      Utils.showToast('Reconnected successfully!', 'success', 3000);
    });
  }

  showWelcomeMessage() {
    if (this.chat) {
      this.chat.displaySystemMessage('Welcome to Simple Chat App! Enter your username to get started.');
      this.chat.displaySystemMessage('Type /help to see available commands.');
    }
  }

  // API methods for external access
  getSocketClient() {
    return this.socketClient;
  }

  getChat() {
    return this.chat;
  }

  isReady() {
    return this.isInitialized && this.socketClient && this.socketClient.isSocketConnected();
  }

  // Statistics and debugging
  getStats() {
    if (!this.isInitialized) {
      return { error: 'App not initialized' };
    }

    return {
      initialized: this.isInitialized,
      connected: this.socketClient.isSocketConnected(),
      user: this.chat.getCurrentUser(),
      room: this.chat.getCurrentRoom(),
      onlineUsers: this.chat.getOnlineUsers().length,
      messages: this.chat.messages.size
    };
  }

  // Cleanup method
  cleanup() {
    console.log('Cleaning up Chat App...');
    
    if (this.socketClient) {
      this.socketClient.destroy();
      this.socketClient = null;
    }
    
    if (this.chat) {
      this.chat = null;
    }
    
    this.isInitialized = false;
  }

  // Restart method for debugging
  async restart() {
    console.log('Restarting Chat App...');
    this.cleanup();
    await new Promise(resolve => setTimeout(resolve, 1000)); // Wait a bit
    await this.init();
  }
}

// Initialize the application when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
  console.log('DOM ready, starting Chat App...');
  
  // Create global app instance
  window.chatApp = new ChatApp();
  
  // Development helpers
  if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
    window.chatApp.debug = {
      getStats: () => window.chatApp.getStats(),
      restart: () => window.chatApp.restart(),
      cleanup: () => window.chatApp.cleanup(),
      socket: () => window.chatApp.getSocketClient(),
      chat: () => window.chatApp.getChat()
    };
    
    console.log('Development mode: Debug helpers available at window.chatApp.debug');
  }
});

// Handle page unload
window.addEventListener('unload', () => {
  if (window.chatApp) {
    window.chatApp.cleanup();
  }
});