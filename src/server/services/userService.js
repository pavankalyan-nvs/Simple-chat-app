const User = require('../models/User');
const Sanitizer = require('../utils/sanitizer');

class UserService {
  constructor() {
    this.users = new Map(); // userId -> User
    this.usersBySocket = new Map(); // socketId -> userId
    this.usersByUsername = new Map(); // username -> userId
  }

  createUser(username, socketId) {
    const sanitizedUsername = Sanitizer.sanitizeUsername(username);
    
    if (!sanitizedUsername) {
      throw new Error('Invalid username format');
    }

    // Check if username is already taken
    if (this.usersByUsername.has(sanitizedUsername.toLowerCase())) {
      throw new Error('Username already taken');
    }

    const user = new User(sanitizedUsername, socketId);
    
    this.users.set(user.id, user);
    this.usersBySocket.set(socketId, user.id);
    this.usersByUsername.set(sanitizedUsername.toLowerCase(), user.id);

    return user;
  }

  getUserById(userId) {
    return this.users.get(userId);
  }

  getUserBySocketId(socketId) {
    const userId = this.usersBySocket.get(socketId);
    return userId ? this.users.get(userId) : null;
  }

  getUserByUsername(username) {
    const userId = this.usersByUsername.get(username.toLowerCase());
    return userId ? this.users.get(userId) : null;
  }

  removeUser(socketId) {
    const userId = this.usersBySocket.get(socketId);
    if (!userId) return null;

    const user = this.users.get(userId);
    if (!user) return null;

    // Clean up all references
    this.users.delete(userId);
    this.usersBySocket.delete(socketId);
    this.usersByUsername.delete(user.username.toLowerCase());

    return user;
  }

  updateUserActivity(socketId) {
    const user = this.getUserBySocketId(socketId);
    if (user) {
      user.updateActivity();
    }
    return user;
  }

  getOnlineUsers() {
    return Array.from(this.users.values())
      .filter(user => user.isOnline)
      .map(user => user.toJSON());
  }

  getUsersInRoom(roomName) {
    return Array.from(this.users.values())
      .filter(user => user.isOnline && user.rooms.includes(roomName))
      .map(user => user.toJSON());
  }

  addUserToRoom(userId, roomName) {
    const user = this.users.get(userId);
    if (user) {
      user.joinRoom(roomName);
      return true;
    }
    return false;
  }

  removeUserFromRoom(userId, roomName) {
    const user = this.users.get(userId);
    if (user) {
      user.leaveRoom(roomName);
      return true;
    }
    return false;
  }

  getUserCount() {
    return Array.from(this.users.values())
      .filter(user => user.isOnline).length;
  }

  isUsernameAvailable(username) {
    return !this.usersByUsername.has(username.toLowerCase());
  }
}

module.exports = UserService;