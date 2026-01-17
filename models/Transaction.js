const db = require('../db');

const Transaction = {
    add(details, callback){
        const sql = 'INSERT INTO transactions (id, orderId, payerId, payerEmail, amount, currency, status, time) VALUES (?, ?, ?, ?, ?, ?, ?, ?)';
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
    }
};

module.exports = Transaction;