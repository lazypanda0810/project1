module.exports = {
  apps: [
    {
      name: 'watch-backend',
      script: './src/index.js',
      cwd: __dirname,
      instances: 1,
      exec_mode: 'fork',
      watch: false,
      env: {
        NODE_ENV: 'development',
        USE_IN_MEMORY_DB: 'true',
        PORT: 5000,
        CORS_ORIGIN: 'http://localhost:8080'
      }
    }
  ]
};
