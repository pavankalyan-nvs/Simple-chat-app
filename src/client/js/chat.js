// Chat functionality and UI management
class Chat {
  constructor(socketClient) {
    this.socket = socketClient;
    this.currentUser = null;
    this.currentRoom = 'general';
    this.isJoined = false;
    this.messages = new Map();
    this.onlineUsers = [];
    
    this.initializeElements();
    this.setupEventListeners();
    this.setupSocketListeners();
  }

  initializeElements() {
    // Form elements
    this.chatForm = document.getElementById('chat-form');
    this.nameInput = document.getElementById('name-input');
    this.messageInput = document.getElementById('message-input');
    this.sendButton = document.getElementById('send-button');

    // Display elements
    this.messagesList = document.getElementById('messages');
    this.messagesContainer = document.getElementById('messages-container');
    this.onlineUsersElement = document.getElementById('online-users');
    this.usersListElement = document.getElementById('users-list');
    this.currentRoomElement = document.getElementById('current-room');

    // Modal elements
    this.roomModal = document.getElementById('room-modal');
    this.roomMenuBtn = document.getElementById('room-menu-btn');
    this.closeModalBtn = document.getElementById('close-modal');
    this.newRoomInput = document.getElementById('new-room-input');
    this.joinRoomBtn = document.getElementById('join-room-btn');
    this.availableRooms = document.getElementById('available-rooms');

    // Toast elements
    this.errorToast = document.getElementById('error-toast');
    this.successToast = document.getElementById('success-toast');
    this.closeErrorBtn = document.getElementById('close-error');
    this.closeSuccessBtn = document.getElementById('close-success');

    // Load saved username
    const savedUsername = Utils.getStorage('chat_username');
    if (savedUsername) {
      this.nameInput.value = savedUsername;
    }
  }

  setupEventListeners() {
    // Form submission
    this.chatForm.addEventListener('submit', (e) => {
      e.preventDefault();
      this.handleFormSubmit();
    });

    // Enter key handling
    this.messageInput.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        this.handleFormSubmit();
      }
    });

    // Username input handling
    this.nameInput.addEventListener('change', () => {
      this.handleUsernameSubmit();
    });

    this.nameInput.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        this.handleUsernameSubmit();
      }
    });

    // Room modal
    this.roomMenuBtn.addEventListener('click', () => {
      this.showRoomModal();
    });

    this.closeModalBtn.addEventListener('click', () => {
      this.hideRoomModal();
    });

    this.joinRoomBtn.addEventListener('click', () => {
      this.handleJoinRoom();
    });

    this.newRoomInput.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        this.handleJoinRoom();
      }
    });

    // Toast close buttons
    this.closeErrorBtn.addEventListener('click', () => {
      Utils.hideToast('error');
    });

    this.closeSuccessBtn.addEventListener('click', () => {
      Utils.hideToast('success');
    });

    // Click outside modal to close
    this.roomModal.addEventListener('click', (e) => {
      if (e.target === this.roomModal) {
        this.hideRoomModal();
      }
    });

    // Auto-scroll messages
    this.messagesContainer.addEventListener('scroll', 
      Utils.throttle(() => this.handleScroll(), 100)
    );
  }

  setupSocketListeners() {
    // User join confirmation
    this.socket.listen('user joined', (data) => {
      this.currentUser = data.user;
      this.isJoined = true;
      this.nameInput.readOnly = true;
      this.messageInput.disabled = false;
      this.sendButton.disabled = false;
      
      Utils.showToast(data.message, 'success', 3000);
      Utils.focusInput(this.messageInput);
      
      // Save username
      Utils.setStorage('chat_username', this.currentUser.username);
    });

    // Message history
    this.socket.listen('message history', (messages) => {
      this.clearMessages();
      messages.forEach(message => {
        this.displayMessage(message, false);
      });
      this.scrollToBottom();
    });

    // New messages
    this.socket.listen('chat message', (message) => {
      this.displayMessage(message, true);
      this.scrollToBottom();
      
      // Play notification sound for other users' messages
      if (message.userId !== this.currentUser?.id) {
        Utils.playNotificationSound();
      }
    });

    // Message edited
    this.socket.listen('message edited', (message) => {
      this.updateMessage(message);
    });

    // Message deleted
    this.socket.listen('message deleted', (data) => {
      this.removeMessage(data.messageId);
    });

    // Online users updates
    this.socket.listen('online users', (users) => {
      this.updateOnlineUsers(users);
    });

    // User notifications
    this.socket.listen('user join notification', (data) => {
      this.displaySystemMessage(data.message);
    });

    this.socket.listen('user leave notification', (data) => {
      this.displaySystemMessage(data.message);
    });

    // Room events
    this.socket.listen('room joined', (data) => {
      this.currentRoom = data.room;
      this.updateCurrentRoomDisplay();
      this.hideRoomModal();
      Utils.showToast(`Joined room: ${data.room}`, 'success', 3000);
    });

    this.socket.listen('room left', (data) => {
      Utils.showToast(`Left room: ${data.room}`, 'success', 3000);
    });

    this.socket.listen('room users', (users) => {
      this.updateOnlineUsers(users);
    });

    // Connection events
    this.socket.on('socket:connected', () => {
      if (this.isJoined && this.currentUser) {
        // Rejoin with existing username
        this.socket.joinChat(this.currentUser.username);
      }
    });

    this.socket.on('socket:disconnected', () => {
      this.isJoined = false;
      this.nameInput.readOnly = false;
      this.messageInput.disabled = true;
      this.sendButton.disabled = true;
    });
  }

  handleFormSubmit() {
    if (!this.isJoined) {
      this.handleUsernameSubmit();
      return;
    }

    const messageText = this.messageInput.value.trim();
    if (!messageText) return;

    // Validate message
    const validation = Utils.validateMessage(messageText);
    if (!validation.valid) {
      Utils.showToast(validation.error, 'error');
      return;
    }

    // Handle slash commands
    if (messageText.startsWith('/')) {
      const command = Utils.parseSlashCommand(messageText);
      if (command) {
        Utils.processSlashCommand(command, this);
        this.messageInput.value = '';
        return;
      }
    }

    // Send message
    const messageData = {
      text: validation.message,
      room: this.currentRoom
    };

    if (this.socket.sendMessage(messageData)) {
      this.messageInput.value = '';
    }
  }

  handleUsernameSubmit() {
    const username = this.nameInput.value.trim();
    if (!username) return;

    // Validate username
    const validation = Utils.validateUsername(username);
    if (!validation.valid) {
      Utils.showToast(validation.error, 'error');
      return;
    }

    // Join chat
    this.socket.joinChat(validation.username);
  }

  handleJoinRoom() {
    const roomName = this.newRoomInput.value.trim();
    if (!roomName) return;

    // Validate room name
    if (roomName.length < 1 || roomName.length > 50) {
      Utils.showToast('Room name must be 1-50 characters long', 'error');
      return;
    }

    if (!/^[a-zA-Z0-9_-]+$/.test(roomName)) {
      Utils.showToast('Room name can only contain letters, numbers, underscore, and dash', 'error');
      return;
    }

    this.socket.joinRoom(roomName);
    this.newRoomInput.value = '';
  }

  displayMessage(message, animate = true) {
    const messageElement = document.createElement('li');
    messageElement.className = `message ${message.userId === this.currentUser?.id ? 'own' : 'other'}`;
    messageElement.dataset.messageId = message.id;

    const isOwnMessage = message.userId === this.currentUser?.id;
    const timeStr = Utils.formatTime(message.timestamp);
    const editedLabel = message.edited ? ' (edited)' : '';

    messageElement.innerHTML = `
      <div class="message-header">
        <span class="message-username">${Utils.sanitizeText(message.username)}</span>
        <span class="message-time">${timeStr}</span>
      </div>
      <div class="message-text">${Utils.sanitizeText(message.text)}${editedLabel}</div>
    `;

    // Add animation class if specified
    if (animate) {
      messageElement.style.opacity = '0';
      messageElement.style.transform = 'translateY(20px)';
    }

    this.messagesList.appendChild(messageElement);
    this.messages.set(message.id, messageElement);

    // Animate in
    if (animate) {
      requestAnimationFrame(() => {
        messageElement.style.transition = 'opacity 0.3s ease, transform 0.3s ease';
        messageElement.style.opacity = '1';
        messageElement.style.transform = 'translateY(0)';
      });
    }
  }

  updateMessage(message) {
    const messageElement = this.messages.get(message.id);
    if (messageElement) {
      const textElement = messageElement.querySelector('.message-text');
      if (textElement) {
        textElement.textContent = message.text + ' (edited)';
      }
    }
  }

  removeMessage(messageId) {
    const messageElement = this.messages.get(messageId);
    if (messageElement) {
      messageElement.style.transition = 'opacity 0.3s ease, transform 0.3s ease';
      messageElement.style.opacity = '0';
      messageElement.style.transform = 'translateY(-20px)';
      
      setTimeout(() => {
        messageElement.remove();
        this.messages.delete(messageId);
      }, 300);
    }
  }

  displaySystemMessage(text) {
    const messageElement = document.createElement('li');
    messageElement.className = 'system-message';
    messageElement.textContent = text;
    this.messagesList.appendChild(messageElement);
    this.scrollToBottom();
  }

  updateOnlineUsers(users) {
    this.onlineUsers = users;
    
    // Update count
    const usersLabel = this.onlineUsersElement.querySelector('.users-label');
    if (usersLabel) {
      usersLabel.textContent = `Online Users (${users.length}):`;
    }

    // Update list
    this.usersListElement.innerHTML = '';
    users.forEach(user => {
      const userElement = document.createElement('li');
      userElement.textContent = user.username;
      if (user.id === this.currentUser?.id) {
        userElement.style.fontWeight = 'bold';
      }
      this.usersListElement.appendChild(userElement);
    });
  }

  updateCurrentRoomDisplay() {
    if (this.currentRoomElement) {
      this.currentRoomElement.textContent = this.currentRoom;
    }
  }

  showRoomModal() {
    this.roomModal.classList.remove('hidden');
    Utils.focusInput(this.newRoomInput);
  }

  hideRoomModal() {
    this.roomModal.classList.add('hidden');
  }

  clearMessages() {
    this.messagesList.innerHTML = '';
    this.messages.clear();
  }

  scrollToBottom() {
    requestAnimationFrame(() => {
      Utils.scrollToBottom(this.messagesContainer);
    });
  }

  handleScroll() {
    // Could implement auto-scroll behavior or read receipts here
  }

  // Public methods for external use
  getCurrentUser() {
    return this.currentUser;
  }

  getCurrentRoom() {
    return this.currentRoom;
  }

  getOnlineUsers() {
    return this.onlineUsers;
  }

  isUserJoined() {
    return this.isJoined;
  }
}

// Export for use in other modules
window.Chat = Chat;