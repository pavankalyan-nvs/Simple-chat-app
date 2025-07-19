const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const path = require('path');
const helmet = require('helmet');
const cors = require('cors');
const compression = require('compression');

// Import services and middleware
const config = require('./config/config');
const { httpRateLimit } = require('./middleware/rateLimit');
const UserService = require('./services/userService');
const MessageService = require('./services/messageService');
const SocketService = require('./services/socketService');

class ChatServer {
  constructor() {
    this.app = express();
    this.server = http.createServer(this.app);
    this.io = socketIo(this.server, {
      cors: {
        origin: config.security.corsOrigin,
        methods: ["GET", "POST"]
      }
    });

    // Initialize services
    this.userService = new UserService();
    this.messageService = new MessageService();
    this.socketService = new SocketService(this.io, this.userService, this.messageService);

    this.setupMiddleware();
    this.setupRoutes();
    this.setupErrorHandling();
  }

  setupMiddleware() {
    // Security middleware
    this.app.use(helmet(config.security.helmetConfig));
    
    // CORS
    this.app.use(cors({
      origin: config.security.corsOrigin,
      credentials: true
    }));

    // Compression
    this.app.use(compression());

    // Rate limiting
    this.app.use(httpRateLimit);

    // Body parsing
    this.app.use(express.json({ limit: '10mb' }));
    this.app.use(express.urlencoded({ extended: true }));

    // Static files - serve from client directory
    this.app.use(express.static(path.join(__dirname, '../client')));
    this.app.use('/public', express.static(path.join(__dirname, '../../public')));
  }

  setupRoutes() {
    // Main route - serve the chat application
    this.app.get('/', (req, res) => {
      res.sendFile(path.join(__dirname, '../client/index.html'));
    });

    // API routes
    this.app.get('/api/stats', (req, res) => {
      try {
        const stats = {
          server: {
            uptime: process.uptime(),
            memory: process.memoryUsage(),
            version: process.version
          },
          chat: this.socketService.getStats(),
          users: {
            online: this.userService.getUserCount(),
            total: this.userService.users.size
          },
          messages: this.messageService.getMessageStats()
        };
        res.json(stats);
      } catch (error) {
        console.error('Error getting stats:', error);
        res.status(500).json({ error: 'Internal server error' });
      }
    });

    this.app.get('/api/health', (req, res) => {
      res.json({ 
        status: 'healthy', 
        timestamp: new Date().toISOString(),
        uptime: process.uptime()
      });
    });

    this.app.get('/api/rooms/:roomName/messages', (req, res) => {
      try {
        const { roomName } = req.params;
        const limit = parseInt(req.query.limit) || 50;
        
        const messages = this.messageService.getMessagesForRoom(roomName, limit);
        res.json({ messages });
      } catch (error) {
        console.error('Error getting room messages:', error);
        res.status(500).json({ error: 'Internal server error' });
      }
    });

    this.app.get('/api/emojis', (req, res) => {
      try {
        const emojis = this.messageService.getAvailableEmojis();
        res.json({ emojis });
      } catch (error) {
        console.error('Error getting emojis:', error);
        res.status(500).json({ error: 'Internal server error' });
      }
    });

    // 404 handler
    this.app.use('*', (req, res) => {
      res.status(404).json({ error: 'Route not found' });
    });
  }

  setupErrorHandling() {
    // Global error handler
    this.app.use((error, req, res, next) => {
      console.error('Global error handler:', error);
      
      if (error.type === 'entity.too.large') {
        return res.status(413).json({ error: 'Request entity too large' });
      }
      
      res.status(500).json({ 
        error: config.environment === 'development' ? error.message : 'Internal server error'
      });
    });

    // Handle uncaught exceptions
    process.on('uncaughtException', (error) => {
      console.error('Uncaught Exception:', error);
      this.gracefulShutdown('UNCAUGHT_EXCEPTION');
    });

    // Handle unhandled rejections
    process.on('unhandledRejection', (reason, promise) => {
      console.error('Unhandled Rejection at:', promise, 'reason:', reason);
      this.gracefulShutdown('UNHANDLED_REJECTION');
    });

    // Handle shutdown signals
    process.on('SIGTERM', () => {
      console.log('SIGTERM received');
      this.gracefulShutdown('SIGTERM');
    });

    process.on('SIGINT', () => {
      console.log('SIGINT received');
      this.gracefulShutdown('SIGINT');
    });
  }

  gracefulShutdown(signal) {
    console.log(`Graceful shutdown initiated by ${signal}`);
    
    // Stop accepting new connections
    this.server.close((err) => {
      if (err) {
        console.error('Error during server close:', err);
        process.exit(1);
      }

      console.log('HTTP server closed');

      // Clean up services
      if (this.socketService) {
        this.socketService.destroy();
      }

      console.log('Cleanup completed');
      process.exit(0);
    });

    // Force exit after 30 seconds
    setTimeout(() => {
      console.error('Could not close connections in time, forcefully shutting down');
      process.exit(1);
    }, 30000);
  }

  start() {
    this.server.listen(config.port, () => {
      console.log(`\n🚀 Chat Server running on http://localhost:${config.port}`);
      console.log(`Environment: ${config.environment}`);
      console.log(`Process ID: ${process.pid}`);
      console.log(`Node version: ${process.version}`);
      console.log('Press Ctrl+C to stop\n');
    });
  }
}

// Start the server
if (require.main === module) {
  const server = new ChatServer();
  server.start();
}

module.exports = ChatServer;