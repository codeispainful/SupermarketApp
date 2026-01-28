const db = require('../db');

const Orders = {
createOrder(userId, transactionId, cartItems, callback) {
    console.log("Starting createOrder...");
    console.log("User ID:", userId);
    console.log("Cart Items:", cartItems);

    // Get new orderId
    db.query('SELECT IFNULL(MAX(orderid),0)+1 AS newOrderId FROM orders', (err, results) => {
        if (err) {
            console.error("Error fetching new orderId:", err);
            return callback(err);
        }
        console.log("Results from MAX(orderid):", results);

        const orderId = results[0].newOrderId;
        console.log("Generated orderId:", orderId);

        // Format current date for MySQL
        const now = new Date().toISOString().slice(0, 19).replace('T', ' ');
        console.log("Order datetime:", now);

        // Prepare bulk insert values
        const values = cartItems.map(item => [
            orderId,
            transactionId,
            userId,
            item.productId,
            item.quantity,
            item.quantity * item.price, // subtotal
            now
        ]);
        console.log("Prepared values for insert:", values);

        const sql = 'INSERT INTO orders (orderid, transaction_id, userid, productid, quantity, subtotal, order_datetime) VALUES ?';
        db.query(sql, [values], (err, result) => {
            if (err) {
                console.error("Error inserting orders:", err);
                return callback(err);
            }
            console.log("Insert result:", result);
            callback(null, orderId);
        });
    });
},
getOrderById(orderId, callback) {
    const sql = `
        SELECT o.*, p.productName 
        FROM orders o
        JOIN products p ON o.productid = p.productid
        WHERE o.orderid = ?`;
    
    db.query(sql, [orderId], (err, results) => {
        if (err) return callback(err);
        callback(null, results);
    });
},
getOrdersByUser(userId, callback) {
    const sql = `
        SELECT
            o.orderid,
            o.transaction_id,
            o.userid,
            MIN(o.order_datetime) AS order_datetime,
            SUM(o.subtotal) AS total_amount,
            tp.refunded AS refunded
        FROM orders o
        JOIN transactions_paypal tp
            ON o.transaction_id = tp.id
        WHERE o.userid = ?
        GROUP BY
            o.orderid,
            o.transaction_id,
            o.userid,
            tp.refunded
        ORDER BY order_datetime DESC;
    `;
    db.query(sql, [userId], callback);
},
getAll(params, callback) {
    let sql = `
        SELECT 
            orderid,
            userid,
            MIN(order_datetime) AS order_datetime,
            SUM(subtotal) AS total_amount
        FROM orders
        WHERE 1=1
    `;
    const values = [];

    if (params && params.search) {
        sql += ' AND orderid LIKE ?';
        values.push(`%${params.search}%`);
    }

    sql += `
        GROUP BY orderid, userid
        ORDER BY order_datetime DESC
    `;

    db.query(sql, values, callback);
},
orderChecker(userid, productid, callback) {
    const sql = `
        SELECT COUNT(*) AS count
        FROM orders
        WHERE userid = ? AND productid = ?
    `;
    db.query(sql, [userid, productid], (err, results) => {
        if (err) return callback(err);
        if (results[0].count > 0) {
            return callback(null, true);
        } else {
            return callback(null, false);
        }
    });
},
getUserIdByOrderID(orderID) {
    return new Promise((resolve, reject) => {
        const sql = 'SELECT userid FROM orders WHERE orderid = ? LIMIT 1';
        db.query(sql, [orderID], (err, results) => {
            if (err) {
                console.log("Error fetching userId by orderID:", err);
                return reject(err);
            }
            resolve(results[0].userid);
        });
    });
},
};

module.exports = Orders;