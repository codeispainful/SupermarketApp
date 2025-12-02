const { viewById } = require('../controllers/SupermarketController');
const db = require('../db');

const User = {
    viewById(userId, callback) {
        const sql = 'SELECT * FROM users WHERE userId = ?';
        db.query(sql, [userId], (err, results) => {
            if (err) return callback(err);
            callback(null, results[0] || null);
        });
    },

    viewAll(callback) {
        const sql = 'SELECT * FROM users';
        db.query(sql, (err, results) => {
            if (err) return callback(err);
            callback(null, results);
        });
    },

    banById(userId, callback) {
        const sql = 'UPDATE users SET banned = 1 WHERE userId = ?';
        db.query(sql, [userId], callback);
    },

    editbyId(userId, userdetails, callback) {
        const sql = 'UPDATE users SET  password = ?, email = ?, contact = ? WHERE userId = ?';
        const params = [
            userdetails.password,
            userdetails.email,
            userdetails.contact,
            userId,
        ];
        db.query(sql, params, callback);
    },

    editbyIdAdmin(userId, userdetails, callback) {
        const fields = [];
        const params = [];

        if ('user' in userdetails) { fields.push("username=?"); params.push(userdetails.user); }
        if ('password' in userdetails) { fields.push("password=?"); params.push(userdetails.password); }
        if ('email' in userdetails) { fields.push("email=?"); params.push(userdetails.email); }
        if ('contact' in userdetails) { fields.push("contact=?"); params.push(userdetails.contact); }
        if ('role' in userdetails) { fields.push("role=?"); params.push(userdetails.role); }
        if ('banned' in userdetails) {
            fields.push("banned=?");
            params.push(Number(userdetails.banned) === 1 ? 1 : 0);
        }

        const sql = `UPDATE users SET ${fields.join(', ')} WHERE userId = ?`;
        params.push(userId);

        db.query(sql, params, callback);
    }

};

module.exports = User;