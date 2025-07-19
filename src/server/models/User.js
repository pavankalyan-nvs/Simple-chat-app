const { v4: uuidv4 } = require('uuid');

class User {
  constructor(username, socketId) {
    this.id = uuidv4();
    this.username = username;
    this.socketId = socketId;
    this.joinedAt = new Date();
    this.lastActivity = new Date();
    this.isOnline = true;
    this.rooms = ['general']; // Default room
  }

  updateActivity() {
    this.lastActivity = new Date();
  }

  setOffline() {
    this.isOnline = false;
  }

  setOnline() {
    this.isOnline = true;
  }

  joinRoom(roomName) {
    if (!this.rooms.includes(roomName)) {
      this.rooms.push(roomName);
    }
  }

  leaveRoom(roomName) {
    const index = this.rooms.indexOf(roomName);
    if (index > -1) {
      this.rooms.splice(index, 1);
    }
  }

  toJSON() {
    return {
      id: this.id,
      username: this.username,
      joinedAt: this.joinedAt,
      lastActivity: this.lastActivity,
      isOnline: this.isOnline,
      rooms: this.rooms
    };
  }
}

module.exports = User;