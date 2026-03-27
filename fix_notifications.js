const pool = require('./db');

async function fixNotificationsTable() {
  try {
    console.log("Fixing notifications table schema...");
    
    try {
      await pool.query("ALTER TABLE notifications ADD COLUMN title VARCHAR(255) DEFAULT 'Notification'");
      console.log("Added column 'title'");
    } catch (e) { console.log("Column 'title' might already exist", e.message); }

    try {
      await pool.query("ALTER TABLE notifications ADD COLUMN link VARCHAR(255)");
      console.log("Added column 'link'");
    } catch (e) { console.log("Column 'link' might already exist", e.message); }

    try {
      await pool.query("ALTER TABLE notifications ADD COLUMN is_read BOOLEAN DEFAULT FALSE");
      console.log("Added column 'is_read'");
    } catch (e) { console.log("Column 'is_read' might already exist", e.message); }

    console.log("Notifications table fixed successfully.");
    process.exit(0);
  } catch (err) {
    console.error("Migration failed:", err);
    process.exit(1);
  }
}

fixNotificationsTable();
