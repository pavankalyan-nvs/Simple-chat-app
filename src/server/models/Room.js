const { v4: uuidv4 } = require('uuid');

class Room {
  constructor(name, createdBy) {
    this.id = uuidv4();
    this.name = name;
    this.createdBy = createdBy;
    this.createdAt = new Date();
    this.description = '';
    this.isPrivate = false;
    this.maxUsers = null;
    this.userIds = [];
  }

  addUser(userId) {
    if (!this.userIds.includes(userId)) {
      if (this.maxUsers && this.userIds.length >= this.maxUsers) {
        return false; // Room is full
      }
      this.userIds.push(userId);
      return true;
    }
    return true; // User already in room
  }

  removeUser(userId) {
    const index = this.userIds.indexOf(userId);
    if (index > -1) {
      this.userIds.splice(index, 1);
      return true;
    }
    return false;
  }

  hasUser(userId) {
    return this.userIds.includes(userId);
  }

  getUserCount() {
    return this.userIds.length;
  }

  setPrivate(isPrivate) {
    this.isPrivate = isPrivate;
  }

  setMaxUsers(maxUsers) {
    this.maxUsers = maxUsers;
  }

  setDescription(description) {
    this.description = description;
  }

  toJSON() {
    return {
      id: this.id,
      name: this.name,
      description: this.description,
      createdBy: this.createdBy,
      createdAt: this.createdAt,
      isPrivate: this.isPrivate,
      maxUsers: this.maxUsers,
      userCount: this.getUserCount()
    };
  }
}

module.exports = Room;