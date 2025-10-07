const required = [
  'NODE_ENV',
  'PORT',
  // DB: either MONGODB_URI or USE_IN_MEMORY_DB=true
  // Auth & payments are optional depending on deploy stage
];

function missingEnv() {
  const missing = required.filter(k => !process.env[k]);

  // DB check
  if (!process.env.MONGODB_URI && process.env.USE_IN_MEMORY_DB !== 'true') {
    missing.push('MONGODB_URI (or set USE_IN_MEMORY_DB=true)');
  }

  return missing;
}

function run() {
  const miss = missingEnv();
  if (miss.length) {
    console.error('Missing required environment variables:');
    miss.forEach(m => console.error(` - ${m}`));
    process.exit(3);
  }
  console.log('Environment check passed.');
}

if (require.main === module) run();

module.exports = { run };
