module.exports = {
  mongodb: {
    url: process.env.MONGODB_URI || 'mongodb://localhost:27017/watchwebsite',
    databaseName: process.env.MIGRATE_DB_NAME || undefined,
    options: { useNewUrlParser: true, useUnifiedTopology: true }
  },
  migrationsDir: 'backend/migrations',
  changelogCollectionName: 'migrations'
};
