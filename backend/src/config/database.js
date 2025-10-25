const mongoose = require('mongoose');

// Optionally use an in-memory MongoDB for quick local tests when
// MONGODB_URI is not provided. Set USE_IN_MEMORY_DB=true to enable.
const connectDB = async () => {
  try {
    // If MONGODB_URI provided, use it
    if (process.env.MONGODB_URI) {
      const conn = await mongoose.connect(process.env.MONGODB_URI, {
        serverSelectionTimeoutMS: 10000, // 10 seconds
        socketTimeoutMS: 45000, // 45 seconds
        maxPoolSize: 10, // Maintain up to 10 socket connections
      });

      console.log(`🗄️  MongoDB Connected: ${conn.connection.host}`);
    } else if (process.env.USE_IN_MEMORY_DB === 'true') {
      // Lazy-load mongodb-memory-server only when requested
      const { MongoMemoryServer } = require('mongodb-memory-server');
      const mongoServer = await MongoMemoryServer.create();
      const uri = mongoServer.getUri();

      const conn = await mongoose.connect(uri, {
        serverSelectionTimeoutMS: 10000,
        socketTimeoutMS: 45000,
      });

      console.log('🧪 Connected to in-memory MongoDB for testing');

      // keep reference so the server can be stopped if needed
      connectDB._inMemoryServer = mongoServer;
    } else {
      throw new Error('MONGODB_URI environment variable is required. To run a quick local test without a DB, set USE_IN_MEMORY_DB=true');
    }

    // Handle connection events
    mongoose.connection.on('error', (err) => {
      console.error('❌ MongoDB connection error:', err);
    });

    mongoose.connection.on('disconnected', () => {
      console.warn('⚠️  MongoDB disconnected');
    });

  } catch (error) {
    // Don't exit process here - let caller decide. Throw the error so caller can handle.
    console.error('❌ MongoDB connection error:', error.message);
    throw error;
  }
};

module.exports = connectDB;