const path = require('path');
const sqlite3 = require('sqlite3').verbose();

const DB_PATH = path.join(__dirname, 'database.sqlite');

const db = new sqlite3.Database(DB_PATH);

db.serialize(() => {
  db.run(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      email TEXT NOT NULL UNIQUE,
      password_hash TEXT NOT NULL,
      created_at TEXT NOT NULL
    )
  `);
});

function createUser({ name, email, passwordHash }) {
  return new Promise((resolve, reject) => {
    const stmt = `
      INSERT INTO users (name, email, password_hash, created_at)
      VALUES (?, ?, ?, datetime('now'))
    `;
    db.run(stmt, [name, email, passwordHash], function (err) {
      if (err) return reject(err);
      resolve({ id: this.lastID, name, email });
    });
  });
}

function getUserByEmail(email) {
  return new Promise((resolve, reject) => {
    db.get(
      'SELECT * FROM users WHERE email = ?',
      [email],
      (err, row) => {
        if (err) return reject(err);
        resolve(row || null);
      }
    );
  });
}

function getAllUsers() {
  return new Promise((resolve, reject) => {
    db.all(
      'SELECT id, name, email, created_at FROM users ORDER BY id DESC',
      (err, rows) => {
        if (err) return reject(err);
        resolve(rows);
      }
    );
  });
}

module.exports = {
  createUser,
  getUserByEmail,
  getAllUsers,
};

