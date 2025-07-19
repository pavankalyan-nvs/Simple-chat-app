const { v4: uuidv4 } = require('uuid');

class Message {
  constructor(userId, username, text, room = 'general') {
    this.id = uuidv4();
    this.userId = userId;
    this.username = username;
    this.text = text;
    this.room = room;
    this.timestamp = new Date();
    this.edited = false;
    this.editedAt = null;
  }

  edit(newText) {
    this.text = newText;
    this.edited = true;
    this.editedAt = new Date();
  }

  toJSON() {
    return {
      id: this.id,
      userId: this.userId,
      username: this.username,
      text: this.text,
      room: this.room,
      timestamp: this.timestamp,
      edited: this.edited,
      editedAt: this.editedAt
    };
  }
}

module.exports = Message;