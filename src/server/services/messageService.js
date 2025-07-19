const Message = require('../models/Message');
const Sanitizer = require('../utils/sanitizer');
const EmojiReplacer = require('../utils/emojiReplacer');
const config = require('../config/config');

class MessageService {
  constructor() {
    this.messages = new Map(); // messageId -> Message
    this.roomMessages = new Map(); // roomName -> Array of messageIds
    this.emojiReplacer = new EmojiReplacer();
  }

  createMessage(userId, username, text, room = 'general') {
    // Validate message data
    const validation = Sanitizer.validateMessageData({ text, name: username });
    if (!validation.isValid) {
      throw new Error(validation.errors.join(', '));
    }

    // Sanitize the message text
    const sanitizedText = Sanitizer.sanitizeMessage(text);
    if (!sanitizedText) {
      throw new Error('Message cannot be empty');
    }

    // Apply emoji replacement
    const processedText = this.emojiReplacer.replaceEmojis(sanitizedText);

    // Create the message
    const message = new Message(userId, username, processedText, room);

    // Store the message
    this.messages.set(message.id, message);

    // Add to room message list
    if (!this.roomMessages.has(room)) {
      this.roomMessages.set(room, []);
    }
    
    const roomMessageIds = this.roomMessages.get(room);
    roomMessageIds.push(message.id);

    // Maintain message history limit
    if (roomMessageIds.length > config.message.historyLimit) {
      const removedMessageId = roomMessageIds.shift();
      this.messages.delete(removedMessageId);
    }

    return message;
  }

  getMessageById(messageId) {
    return this.messages.get(messageId);
  }

  getMessagesForRoom(room, limit = config.message.historyLimit) {
    const messageIds = this.roomMessages.get(room) || [];
    const recentMessageIds = messageIds.slice(-limit);
    
    return recentMessageIds
      .map(id => this.messages.get(id))
      .filter(message => message) // Filter out any deleted messages
      .map(message => message.toJSON());
  }

  editMessage(messageId, userId, newText) {
    const message = this.messages.get(messageId);
    
    if (!message) {
      throw new Error('Message not found');
    }

    if (message.userId !== userId) {
      throw new Error('You can only edit your own messages');
    }

    // Validate and sanitize new text
    const validation = Sanitizer.validateMessageData({ text: newText, name: message.username });
    if (!validation.isValid) {
      throw new Error(validation.errors.join(', '));
    }

    const sanitizedText = Sanitizer.sanitizeMessage(newText);
    if (!sanitizedText) {
      throw new Error('Message cannot be empty');
    }

    // Apply emoji replacement
    const processedText = this.emojiReplacer.replaceEmojis(sanitizedText);

    // Update the message
    message.edit(processedText);

    return message;
  }

  deleteMessage(messageId, userId) {
    const message = this.messages.get(messageId);
    
    if (!message) {
      throw new Error('Message not found');
    }

    if (message.userId !== userId) {
      throw new Error('You can only delete your own messages');
    }

    // Remove from room messages
    const roomMessageIds = this.roomMessages.get(message.room);
    if (roomMessageIds) {
      const index = roomMessageIds.indexOf(messageId);
      if (index > -1) {
        roomMessageIds.splice(index, 1);
      }
    }

    // Delete the message
    this.messages.delete(messageId);

    return true;
  }

  getMessageStats() {
    return {
      totalMessages: this.messages.size,
      roomCount: this.roomMessages.size,
      roomStats: Array.from(this.roomMessages.entries()).map(([room, messageIds]) => ({
        room,
        messageCount: messageIds.length
      }))
    };
  }

  clearRoomMessages(room) {
    const messageIds = this.roomMessages.get(room) || [];
    messageIds.forEach(id => this.messages.delete(id));
    this.roomMessages.set(room, []);
  }

  addEmojiMapping(word, emoji) {
    this.emojiReplacer.addEmojiMapping(word, emoji);
  }

  getAvailableEmojis() {
    return this.emojiReplacer.getAvailableEmojis();
  }
}

module.exports = MessageService;