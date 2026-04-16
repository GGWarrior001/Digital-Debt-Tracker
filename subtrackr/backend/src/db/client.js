const sqlite3 = require('sqlite3').verbose();

const db = new sqlite3.Database(process.env.DATABASE_URL || './data.db');

// Promisified DB helpers
const dbGet = (sql, params = []) => new Promise((resolve, reject) =>
  db.get(sql, params, (err, row) => err ? reject(err) : resolve(row)));

const dbAll = (sql, params = []) => new Promise((resolve, reject) =>
  db.all(sql, params, (err, rows) => err ? reject(err) : resolve(rows || [])));

const dbRun = (sql, params = []) => new Promise((resolve, reject) =>
  db.run(sql, params, function(err) { err ? reject(err) : resolve(this); }));

module.exports = { db, dbGet, dbAll, dbRun };
