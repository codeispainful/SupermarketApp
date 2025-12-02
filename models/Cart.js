const db = require('../db');

const Cart = {
    addbyid(productId, userId, qty, callback) {
        const sqlcheck = 'SELECT * FROM cart WHERE userId = ? AND productId = ?';
        db.query(sqlcheck, [userId, productId], (err, results) => {
            if (err) return callback(err);
            if (results.length > 0) {
                const newQty = results[0].quantity + qty;
                const sqlUpdate = 'UPDATE cart SET quantity = ? WHERE userId = ? AND productId = ?';
                db.query(sqlUpdate, [newQty, userId, productId], (err, result) => {
                    if (err) return callback(err);
                    callback(null, { updated: true, userId, productId, quantity: newQty });
                });
            } else {
                const sql = 'INSERT INTO cart (userId, productId, quantity) VALUES (?, ?, ?)';
                    db.query(sql, [userId, productId, qty], (err, result) => {
                        if (err) return callback(err);
                        callback(null, { insertId: result.insertId, userId, productId, qty});
                    });
            }
        });
    },
    updateQuantity(userId, productId, quantity, callback) {
    const sql = 'UPDATE cart SET quantity = ? WHERE userId = ? AND productId = ?';
    console.log("Updating cart:", { userId, productId, quantity });
    db.query(sql, [quantity, userId, productId], callback);
    },
    deleteById(userId, productId, callback) {
        const sql = 'DELETE FROM cart WHERE userId = ? AND productId = ?';
        db.query(sql, [userId, productId], callback);
    },
    deleteAll(userId, callback){
        const sql = 'DELETE FROM cart WHERE userId = ?';
        db.query(sql, [userId], callback);
    },
    checkout(userId, callback) {
        const sql = 'DELETE FROM cart WHERE userId = ?';
        db.query(sql, [userId], callback);
    },
    getUserCart(userId, callback) {
        const sql = "SELECT productId, quantity FROM cart WHERE userId = ?";
        db.query(sql, [userId], (err, results) => {
            if (err) return callback(err);
            callback(null, results);
        });
    },
    deleteByProductId(productId, callback) {
        const sql = 'DELETE FROM cart WHERE productId = ?';
        db.query(sql, [productId], callback);
    },
    createOrder(userId, cartItems, callback) {
        // Generate new orderId
        db.query('SELECT IFNULL(MAX(orderid),0)+1 AS newOrderId FROM orders', (err, results) => {
            if (err) return callback(err);
            const orderId = results[0].newOrderId;
            const now = new Date();
            const values = cartItems.map(item => [
                orderId,
                userId,
                item.productId,
                item.quantity,
                item.quantity * item.price, // subtotal
                now
            ]);
            const sql = 'INSERT INTO orders (orderid, userid, productid, quantity, subtotal, order_datetime) VALUES ?';
            db.query(sql, [values], (err, result) => {
                if (err) return callback(err);
                callback(null, orderId);
            });
        });
    },
    getOrderById(orderId, callback) {
        const sql = 'SELECT * FROM orders WHERE orderid = ?';
        db.query(sql, [orderId], (err, results) => {
            if (err) return callback(err);
            callback(null, results);
        });
    }
}
module.exports = Cart;