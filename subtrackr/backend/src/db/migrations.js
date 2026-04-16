const { db } = require('./client');

function runMigrations() {
  db.serialize(() => {
    db.run(`CREATE TABLE IF NOT EXISTS users (
      id          INTEGER PRIMARY KEY AUTOINCREMENT,
      email       TEXT UNIQUE NOT NULL,
      password    TEXT NOT NULL,
      onboarded   INTEGER DEFAULT 0,
      created_at  DATETIME DEFAULT CURRENT_TIMESTAMP
    )`);

    db.run(`CREATE TABLE IF NOT EXISTS refresh_tokens (
      id          INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id     INTEGER NOT NULL,
      token       TEXT UNIQUE NOT NULL,
      expires_at  DATETIME NOT NULL,
      created_at  DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE
    )`);

    db.run(`CREATE TABLE IF NOT EXISTS subscriptions (
      id              INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id         INTEGER NOT NULL,
      name            TEXT NOT NULL,
      cost            REAL NOT NULL,
      category        TEXT DEFAULT 'Other',
      billing_cycle   TEXT DEFAULT 'monthly',
      billing_date    INTEGER,
      website         TEXT,
      status          TEXT DEFAULT 'active',
      trial_end_date  DATE,
      last_used_date  DATE,
      notes           TEXT,
      created_at      DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at      DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE
    )`);

    // Non-destructive migrations for existing DBs
    db.run(`ALTER TABLE subscriptions ADD COLUMN billing_cycle TEXT DEFAULT 'monthly'`, () => {});
    db.run(`ALTER TABLE subscriptions ADD COLUMN updated_at DATETIME DEFAULT CURRENT_TIMESTAMP`, () => {});
    db.run(`ALTER TABLE users ADD COLUMN onboarded INTEGER DEFAULT 0`, () => {});

    // Indexes
    db.run(`CREATE INDEX IF NOT EXISTS idx_subs_user    ON subscriptions(user_id)`);
    db.run(`CREATE INDEX IF NOT EXISTS idx_subs_status  ON subscriptions(user_id, status)`);
    db.run(`CREATE INDEX IF NOT EXISTS idx_rt_token     ON refresh_tokens(token)`);
  });
}

module.exports = { runMigrations };
