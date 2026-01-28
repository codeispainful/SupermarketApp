const { exists } = require('../controllers/TransactionController');
const db = require('../db');

const Transaction = {
    add(details, callback){
        const sql = 'INSERT INTO transactions_paypal (id, orderId, payerId, payerEmail, amount, currency, status, time) VALUES (?, ?, ?, ?, ?, ?, ?, ?)';
        const mysqlTime = new Date(details.time)
            .toISOString()
            .slice(0, 19)
            .replace('T', ' ');
        const params = [
            details.id,
            details.orderId,
            details.payerId,
            details.payerEmail,
            details.amount,
            details.currency,
            details.status,
            mysqlTime
        ]
        console.log("Adding transaction:", params);
        db.query(sql, params, (err, result)=>{
            if(err){
                console.log("Error adding transaction:", err);
                callback(err, null);
            } else {
                console.log("Transaction added:", result);
                callback(null, result);
            }
        })
    },
    exists(id, callback){
        const sql = 'SELECT COUNT(*) AS count FROM transactions_paypal WHERE id = ?';
        db.query(sql, [id], (err, results)=>{
            if(err){
                console.log("Error checking transaction existence:", err);
                callback(err, null);
            } else {
                const exists = results[0].count > 0;
                callback(null, exists);
            }
        });
    }
    ,
    getById(id, callback) {
        const sql = 'SELECT * FROM transactions_paypal WHERE id = ? LIMIT 1';
        db.query(sql, [id], (err, results) => {
            if (err) return callback(err, null);
            if (!results || results.length === 0) return callback(null, null);
            callback(null, results[0]);
        });
    }
    ,
    getAll(search, callback) {
        let sql = 'SELECT * FROM transactions_paypal';
        const params = [];
        if (search) {
            sql += ' WHERE id LIKE ? OR payerEmail LIKE ?';
            params.push(`%${search}%`, `%${search}%`);
        }
        sql += ' ORDER BY time DESC';
        db.query(sql, params, callback);
    }
    ,
    markRefunded(id, refundId, callback) {
        const sql = "UPDATE transactions_paypal SET refunded = 1, refund_id = ?, status = 'REFUNDED' WHERE id = ?";
        db.query(sql, [refundId, id], callback);
    }
};

module.exports = Transaction;