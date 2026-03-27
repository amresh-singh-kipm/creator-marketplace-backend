const pool = require('./db');

async function migrateNotifications() {
  try {
    console.log("Setting up notifications table...");
    const createTableQuery = `
      CREATE TABLE IF NOT EXISTS notifications (
        id VARCHAR(36) PRIMARY KEY,
        user_id VARCHAR(36) NOT NULL,
        title VARCHAR(255) NOT NULL,
        message TEXT NOT NULL,
        link VARCHAR(255),
        is_read BOOLEAN DEFAULT FALSE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        INDEX idx_notifications_user (user_id),
        INDEX idx_notifications_unread (user_id, is_read)
      )
    `;
    await pool.query(createTableQuery);

    console.log("Notifications table created successfully.");
    process.exit(0);
  } catch (err) {
    console.error("Migration failed:", err);
    process.exit(1);
  }
}

migrateNotifications();
