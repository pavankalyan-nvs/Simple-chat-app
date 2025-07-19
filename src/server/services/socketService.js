const { SocketRateLimit } = require('../middleware/rateLimit');

class SocketService {
  constructor(io, userService, messageService) {
    this.io = io;
    this.userService = userService;
    this.messageService = messageService;
    this.rateLimiter = new SocketRateLimit();
    
    this.setupSocketHandlers();
  }

  setupSocketHandlers() {
    this.io.on('connection', (socket) => {
      console.log(`Socket connected: ${socket.id}`);
      
      this.handleUserJoin(socket);
      this.handleChatMessage(socket);
      this.handleDisconnect(socket);
      this.handleRoomEvents(socket);
      this.handleMessageEvents(socket);
    });
  }

  handleUserJoin(socket) {
    socket.on('user join', (username) => {
      try {
        const user = this.userService.createUser(username, socket.id);
        
        // Join default room
        socket.join('general');
        
        // Send welcome message to user
        socket.emit('user joined', {
          user: user.toJSON(),
          message: 'Welcome to the chat!'
        });

        // Send message history for general room
        const messageHistory = this.messageService.getMessagesForRoom('general');
        socket.emit('message history', messageHistory);

        // Notify other users
        socket.to('general').emit('user join notification', {
          user: user.toJSON(),
          message: `${user.username} joined the chat`
        });

        // Send updated online users list
        const onlineUsers = this.userService.getUsersInRoom('general');
        this.io.to('general').emit('online users', onlineUsers);

        console.log(`User joined: ${user.username} (${user.id})`);
      } catch (error) {
        console.error('Error in user join:', error.message);
        socket.emit('error', {
          type: 'join_error',
          message: error.message
        });
      }
    });
  }

  handleChatMessage(socket) {
    socket.on('chat message', (messageData) => {
      try {
        const user = this.userService.getUserBySocketId(socket.id);
        if (!user) {
          socket.emit('error', {
            type: 'auth_error', 
            message: 'You must join first'
          });
          return;
        }

        // Check rate limit
        const rateLimitResult = this.rateLimiter.checkLimit(user.id);
        if (!rateLimitResult.allowed) {
          socket.emit('error', {
            type: 'rate_limit',
            message: `Too many messages. Try again in ${rateLimitResult.retryAfter} seconds.`
          });
          return;
        }

        // Update user activity
        this.userService.updateUserActivity(socket.id);

        // Create message
        const room = messageData.room || 'general';
        const message = this.messageService.createMessage(
          user.id,
          user.username,
          messageData.text,
          room
        );

        // Emit message to all users in the room
        this.io.to(room).emit('chat message', message.toJSON());

        console.log(`Message in ${room} from ${user.username}: ${message.text}`);
      } catch (error) {
        console.error('Error in chat message:', error.message);
        socket.emit('error', {
          type: 'message_error',
          message: error.message
        });
      }
    });
  }

  handleRoomEvents(socket) {
    socket.on('join room', (roomName) => {
      try {
        const user = this.userService.getUserBySocketId(socket.id);
        if (!user) {
          socket.emit('error', { type: 'auth_error', message: 'You must join first' });
          return;
        }

        // Leave current rooms (except general)
        user.rooms.forEach(room => {
          if (room !== 'general') {
            socket.leave(room);
          }
        });

        // Join new room
        socket.join(roomName);
        this.userService.addUserToRoom(user.id, roomName);

        // Send message history for the room
        const messageHistory = this.messageService.getMessagesForRoom(roomName);
        socket.emit('message history', messageHistory);

        // Notify room users
        socket.to(roomName).emit('user join notification', {
          user: user.toJSON(),
          message: `${user.username} joined ${roomName}`
        });

        // Send updated user list for the room
        const roomUsers = this.userService.getUsersInRoom(roomName);
        this.io.to(roomName).emit('room users', roomUsers);

        socket.emit('room joined', { room: roomName });

        console.log(`User ${user.username} joined room: ${roomName}`);
      } catch (error) {
        console.error('Error joining room:', error.message);
        socket.emit('error', {
          type: 'room_error',
          message: error.message
        });
      }
    });

    socket.on('leave room', (roomName) => {
      try {
        const user = this.userService.getUserBySocketId(socket.id);
        if (!user) return;

        if (roomName === 'general') {
          socket.emit('error', {
            type: 'room_error',
            message: 'Cannot leave the general room'
          });
          return;
        }

        socket.leave(roomName);
        this.userService.removeUserFromRoom(user.id, roomName);

        // Notify room users
        socket.to(roomName).emit('user leave notification', {
          user: user.toJSON(),
          message: `${user.username} left ${roomName}`
        });

        // Send updated user list for the room
        const roomUsers = this.userService.getUsersInRoom(roomName);
        this.io.to(roomName).emit('room users', roomUsers);

        socket.emit('room left', { room: roomName });
      } catch (error) {
        console.error('Error leaving room:', error.message);
      }
    });
  }

  handleMessageEvents(socket) {
    socket.on('edit message', (data) => {
      try {
        const user = this.userService.getUserBySocketId(socket.id);
        if (!user) {
          socket.emit('error', { type: 'auth_error', message: 'You must join first' });
          return;
        }

        const editedMessage = this.messageService.editMessage(
          data.messageId,
          user.id,
          data.newText
        );

        // Emit updated message to all users in the room
        this.io.to(editedMessage.room).emit('message edited', editedMessage.toJSON());

        console.log(`Message edited by ${user.username}: ${editedMessage.id}`);
      } catch (error) {
        console.error('Error editing message:', error.message);
        socket.emit('error', {
          type: 'edit_error',
          message: error.message
        });
      }
    });

    socket.on('delete message', (messageId) => {
      try {
        const user = this.userService.getUserBySocketId(socket.id);
        if (!user) {
          socket.emit('error', { type: 'auth_error', message: 'You must join first' });
          return;
        }

        const message = this.messageService.getMessageById(messageId);
        if (!message) {
          socket.emit('error', { type: 'message_error', message: 'Message not found' });
          return;
        }

        this.messageService.deleteMessage(messageId, user.id);

        // Emit deletion to all users in the room
        this.io.to(message.room).emit('message deleted', { messageId });

        console.log(`Message deleted by ${user.username}: ${messageId}`);
      } catch (error) {
        console.error('Error deleting message:', error.message);
        socket.emit('error', {
          type: 'delete_error',
          message: error.message
        });
      }
    });
  }

  handleDisconnect(socket) {
    socket.on('disconnect', () => {
      try {
        const user = this.userService.removeUser(socket.id);
        
        if (user) {
          // Remove from rate limiter
          this.rateLimiter.removeUser(user.id);

          // Notify all rooms the user was in
          user.rooms.forEach(room => {
            socket.to(room).emit('user leave notification', {
              user: user.toJSON(),
              message: `${user.username} left the chat`
            });

            // Send updated online users list for each room
            const roomUsers = this.userService.getUsersInRoom(room);
            this.io.to(room).emit('online users', roomUsers);
          });

          console.log(`User disconnected: ${user.username} (${user.id})`);
        }
      } catch (error) {
        console.error('Error in disconnect handler:', error.message);
      }

      console.log(`Socket disconnected: ${socket.id}`);
    });
  }

  // Utility methods
  broadcastToRoom(room, event, data) {
    this.io.to(room).emit(event, data);
  }

  broadcastToAll(event, data) {
    this.io.emit(event, data);
  }

  getStats() {
    return {
      connectedSockets: this.io.engine.clientsCount,
      onlineUsers: this.userService.getUserCount(),
      messageStats: this.messageService.getMessageStats()
    };
  }

  destroy() {
    if (this.rateLimiter) {
      this.rateLimiter.destroy();
    }
  }
}

module.exports = SocketService;