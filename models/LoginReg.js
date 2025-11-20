const db = require('../db');
const LoginReg = {
    add(userdetails, callback) {
        const checkSql = 'SELECT * FROM users WHERE username = ?';
        db.query(checkSql, [userdetails.username], (err, results) => {
            if (err) return callback(err);
            if (results.length > 0) return callback({ message: "Username already exists" });
            else {
                const sql = 'INSERT INTO users (username, password, email, contact, role) VALUES (?, ?, ?, ?, ?)';
                const params = [
                    userdetails.username,
                    userdetails.password,
                    userdetails.email,
                    userdetails.contact,
                    userdetails.role,
                ];
                db.query(sql, params, (err, result) => {
                    if (err) return callback(err);
                    callback(null, { insertId: result.insertId, ...userdetails });
                });
            }
        });
    },
    login(username, password, callback) {
        const sql = 'SELECT * FROM users WHERE username = ? AND password = ?';  
        db.query(sql, [username, password], (err, results) => {
            if (err) return callback(err);
            if (results.length === 0) return callback({ message: "Invalid username or password" });
            callback(null, results[0]);
        });
    }
};

module.exports = LoginReg;