/**
 * Sample migration: create an index on users.email and insert a sample record (if not exists)
 * This uses the migrate-mongo style exports. Adapt if using a different migration tool.
 */

module.exports = {
  async up(db, client) {
    // create unique index on users.email
    await db.collection('users').createIndex({ email: 1 }, { unique: true });

    // seed a low-privilege test user if not present
    const existing = await db.collection('users').findOne({ email: 'seed@example.com' });
    if (!existing) {
      await db.collection('users').insertOne({
        email: 'seed@example.com',
        password: 'REPLACE_ME_HASHED',
        role: 'user',
        createdAt: new Date()
      });
    }
  },

  async down(db, client) {
    // reverse seed and index (optional in prod)
    await db.collection('users').deleteOne({ email: 'seed@example.com' });
    await db.collection('users').dropIndex('email_1').catch(() => {});
  }
};
