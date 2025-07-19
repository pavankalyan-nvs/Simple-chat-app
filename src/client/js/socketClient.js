// Socket.io client wrapper with connection management and event handling
class SocketClient {
  constructor() {
    this.socket = null;
    this.isConnected = false;
    this.reconnectAttempts = 0;
    this.maxReconnectAttempts = 5;
    this.reconnectDelay = 1000;
    this.eventHandlers = new Map();
    
    this.init();
  }

  init() {
    try {
      this.socket = io({
        transports: ['websocket', 'polling'],
        timeout: 20000,
        reconnection: true,
        reconnectionAttempts: this.maxReconnectAttempts,
        reconnectionDelay: this.reconnectDelay,
        reconnectionDelayMax: 5000,
        randomizationFactor: 0.5
      });

      this.setupConnectionHandlers();
    } catch (error) {
      console.error('Failed to initialize socket:', error);
      this.updateConnectionStatus('disconnected', 'Connection failed');
    }
  }

  setupConnectionHandlers() {
    this.socket.on('connect', () => {
      console.log('Connected to server');
      this.isConnected = true;
      this.reconnectAttempts = 0;
      this.updateConnectionStatus('connected', 'Connected');
      this.emit('socket:connected');
    });

    this.socket.on('disconnect', (reason) => {
      console.log('Disconnected from server:', reason);
      this.isConnected = false;
      this.updateConnectionStatus('disconnected', `Disconnected: ${reason}`);
      this.emit('socket:disconnected', reason);
    });

    this.socket.on('connect_error', (error) => {
      console.error('Connection error:', error);
      this.reconnectAttempts++;
      
      if (this.reconnectAttempts >= this.maxReconnectAttempts) {
        this.updateConnectionStatus('disconnected', 'Connection failed');
        Utils.showToast('Unable to connect to server. Please refresh the page.', 'error');
      } else {
        this.updateConnectionStatus('disconnected', `Reconnecting... (${this.reconnectAttempts}/${this.maxReconnectAttempts})`);
      }
    });

    this.socket.on('reconnect', (attemptNumber) => {
      console.log('Reconnected after', attemptNumber, 'attempts');
      this.isConnected = true;
      this.reconnectAttempts = 0;
      this.updateConnectionStatus('connected', 'Reconnected');
      Utils.showToast('Reconnected to server', 'success', 3000);
      this.emit('socket:reconnected');
    });

    this.socket.on('reconnect_attempt', (attemptNumber) => {
      console.log('Reconnection attempt:', attemptNumber);
      this.updateConnectionStatus('disconnected', `Reconnecting... (${attemptNumber}/${this.maxReconnectAttempts})`);
    });

    this.socket.on('reconnect_failed', () => {
      console.error('Failed to reconnect');
      this.updateConnectionStatus('disconnected', 'Connection failed');
      Utils.showToast('Failed to reconnect. Please refresh the page.', 'error');
    });

    // Handle server errors
    this.socket.on('error', (error) => {
      console.error('Socket error:', error);
      
      if (error.type === 'rate_limit') {
        Utils.showToast(error.message, 'error');
      } else if (error.type === 'auth_error') {
        Utils.showToast(error.message, 'error');
      } else if (error.type === 'join_error') {
        Utils.showToast(error.message, 'error');
      } else if (error.type === 'message_error') {
        Utils.showToast(error.message, 'error');
      } else if (error.type === 'room_error') {
        Utils.showToast(error.message, 'error');
      } else {
        Utils.showToast(error.message || 'An error occurred', 'error');
      }
    });
  }

  updateConnectionStatus(status, message) {
    const indicator = document.getElementById('status-indicator');
    const text = document.getElementById('status-text');
    
    if (indicator && text) {
      indicator.className = `status-indicator ${status}`;
      text.textContent = message;
    }
  }

  // Event system for internal communication
  on(event, handler) {
    if (!this.eventHandlers.has(event)) {
      this.eventHandlers.set(event, []);
    }
    this.eventHandlers.get(event).push(handler);
  }

  off(event, handler) {
    if (this.eventHandlers.has(event)) {
      const handlers = this.eventHandlers.get(event);
      const index = handlers.indexOf(handler);
      if (index > -1) {
        handlers.splice(index, 1);
      }
    }
  }

  emit(event, data) {
    if (this.eventHandlers.has(event)) {
      this.eventHandlers.get(event).forEach(handler => {
        try {
          handler(data);
        } catch (error) {
          console.error('Error in event handler:', error);
        }
      });
    }
  }

  // Socket.io wrapper methods
  send(event, data) {
    if (this.socket && this.isConnected) {
      this.socket.emit(event, data);
      return true;
    } else {
      console.warn('Cannot send data: socket not connected');
      Utils.showToast('Not connected to server', 'error');
      return false;
    }
  }

  listen(event, handler) {
    if (this.socket) {
      this.socket.on(event, handler);
    }
  }

  unlisten(event, handler) {
    if (this.socket) {
      this.socket.off(event, handler);
    }
  }

  // Chat-specific methods
  joinChat(username) {
    return this.send('user join', username);
  }

  sendMessage(messageData) {
    return this.send('chat message', messageData);
  }

  joinRoom(roomName) {
    return this.send('join room', roomName);
  }

  leaveRoom(roomName) {
    return this.send('leave room', roomName);
  }

  editMessage(messageId, newText) {
    return this.send('edit message', { messageId, newText });
  }

  deleteMessage(messageId) {
    return this.send('delete message', messageId);
  }

  // Connection state
  isSocketConnected() {
    return this.isConnected && this.socket && this.socket.connected;
  }

  // Manual reconnection
  reconnect() {
    if (this.socket) {
      this.socket.disconnect();
      this.socket.connect();
    }
  }

  // Disconnect
  disconnect() {
    if (this.socket) {
      this.socket.disconnect();
    }
  }

  // Cleanup
  destroy() {
    if (this.socket) {
      this.socket.removeAllListeners();
      this.socket.disconnect();
      this.socket = null;
    }
    this.eventHandlers.clear();
    this.isConnected = false;
  }
}

// Export for use in other modules
window.SocketClient = SocketClient;