class EmojiReplacer {
  constructor() {
    this.emojiMapping = {
      'hey': '👋',
      'hello': '👋',
      'hi': '👋',
      'smile': '😊',
      'happy': '😊',
      'heart': '❤️',
      'love': '❤️',
      'react': '⚛️',
      'woah': '😲',
      'wow': '😲',
      'lol': '😂',
      'haha': '😂',
      'laugh': '😂',
      'like': '❤️',
      'congratulations': '🎉',
      'congrats': '🎉',
      'party': '🎉',
      'cool': '😎',
      'awesome': '😎',
      'fire': '🔥',
      'good': '👍',
      'thumbsup': '👍',
      'thumbsdown': '👎',
      'bad': '👎',
      'sad': '😢',
      'cry': '😢',
      'angry': '😠',
      'mad': '😠',
      'thinking': '🤔',
      'think': '🤔',
      'confused': '😕',
      'shrug': '🤷‍♂️',
      'coffee': '☕',
      'food': '🍕',
      'pizza': '🍕',
      'beer': '🍺',
      'music': '🎵',
      'star': '⭐',
      'rocket': '🚀',
      'check': '✅',
      'checkmark': '✅',
      'cross': '❌',
      'x': '❌'
    };
  }

  replaceEmojis(text) {
    if (!text || typeof text !== 'string') {
      return text;
    }

    const words = text.split(' ');
    
    for (let i = 0; i < words.length; i++) {
      const word = words[i].toLowerCase();
      // Remove punctuation for matching but preserve original word structure
      const cleanWord = word.replace(/[.,!?;:]$/, '');
      
      if (this.emojiMapping.hasOwnProperty(cleanWord)) {
        // Replace the word but preserve punctuation
        const punctuation = word.slice(cleanWord.length);
        words[i] = this.emojiMapping[cleanWord] + punctuation;
      }
    }

    return words.join(' ');
  }

  addEmojiMapping(word, emoji) {
    this.emojiMapping[word.toLowerCase()] = emoji;
  }

  removeEmojiMapping(word) {
    delete this.emojiMapping[word.toLowerCase()];
  }

  getAvailableEmojis() {
    return { ...this.emojiMapping };
  }
}

module.exports = EmojiReplacer;