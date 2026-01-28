const db = require('../db');

const refunds = {
    create(transactionId, userId, reason, image, status, callback){
        console.log('requesting refund')
        sql = 'INSERT INTO refunds (transaction_id, userId, reason, image, status, created_at) VALUES (?,?,?,?,?,?)'
        db.query(sql, [transactionId, userId, reason, image, status, new Date()], callback);
    },

    refundcheck(transactionId, callback){
        const sql = 'SELECT * FROM refunds WHERE transaction_id = ?';
        db.query(sql, [transactionId], callback);
    }
,
    refundcheckMany(transactionIds, callback) {
        if (!Array.isArray(transactionIds) || transactionIds.length === 0) return callback(null, []);
        const placeholders = transactionIds.map(() => '?').join(',');
        const sql = `SELECT transaction_id FROM refunds WHERE transaction_id IN (${placeholders})`;
        db.query(sql, transactionIds, callback);
    }
    ,
    getById(id, callback) {
        const sql = 'SELECT * FROM refunds WHERE transaction_id = ? LIMIT 1';
        db.query(sql, [id], (err, results) => {
            if (err) return callback(err);
            return callback(null, results && results.length ? results[0] : null);
        });
    }
    ,
    getAllPending(callback) {
        const sql = 'SELECT * FROM refunds WHERE status = "PENDING" ORDER BY created_at DESC';
        db.query(sql, callback);
    }
    ,
    updateStatus(id, status, refundId, callback) {
        const sql = 'UPDATE refunds SET status = ?, refund_id = ? WHERE id = ?';
        db.query(sql, [status, refundId || null, id], callback);
    }
    ,
    completeByTransaction(transactionId, callback) {
        const sql = 'UPDATE refunds SET status = ? WHERE transaction_id = ?';
        db.query(sql, ['COMPLETED', transactionId], callback);
    }
}
module.exports = refunds;