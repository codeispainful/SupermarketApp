const db = require('../db');
const Cart = require('./Cart');

const Supermarket = {
  getAll(params, callback) {
    let sql = 'SELECT productId, productName, quantity, price, image, category, hidden FROM products';
    const values = [];

    if (params && params.search) {
      sql += ' WHERE productName LIKE ?';
      values.push(`%${params.search}%`);
    }

    if (params && Number.isInteger(params.limit)) {
      sql += ' LIMIT ?';
      values.push(params.limit);
      if (params && Number.isInteger(params.offset)) {
        sql += ' OFFSET ?';
        values.push(params.offset);
      }
    }

    db.query(sql, values, callback);
  },
  getById(productId, callback) {
    const sql = 'SELECT productId, productName, quantity, price, image, hidden, category FROM products WHERE productId = ?';
    db.query(sql, [productId], (err, results) => {
      if (err) return callback(err);
      callback(null, results[0] || null);
    });
  },
  getByIdPayPal(productId) {
    return new Promise((resolve, reject) => {
        const sql = 'SELECT productId, productName, quantity, price, image, hidden, category FROM products WHERE productId = ?';
        db.query(sql, [productId], (err, results) => {
            if (err) return reject(err);
            resolve(results[0] || null);
        });
    });
  },
  add(product, callback) {
    const checkSql = 'SELECT * FROM products WHERE productName = ?';
    db.query(checkSql, [product.productName], (err, results) => {
      if (err) return callback(err);

      if (results.length > 0) {
        return callback({ type: "duplicate", message: "Product already exists" });
      }

      const sql = `INSERT INTO products 
        (productName, quantity, price, category, image)
        VALUES (?, ?, ?, ?, ?)`;

      const params = [
        product.productName || null,
        product.quantity ?? null,
        product.price ?? null,
        product.category || null,
        product.image || null,
      ];

      db.query(sql, params, (err, result) => {
        if (err) return callback(err);
        
        callback(null, result.insertId);
      });
    });
  },
  update(productId, product, callback) {
    const fields = [];
    const values = [];

    if (product.productName !== undefined) {
      fields.push('productName = ?');
      values.push(product.productName);
    }
    if (product.quantity !== undefined) {
      fields.push('quantity = ?');
      values.push(product.quantity);
    }
    if (product.price !== undefined) {
      fields.push('price = ?');
      values.push(product.price);
    }
    if (product.image !== undefined) {
      fields.push('image = ?');
      values.push(product.image);
    }
    if (product.category !== undefined) {
      fields.push('category = ?');
      values.push(product.category);
    }
    if (product.hidden !== undefined) {
      fields.push('hidden = ?');
      values.push(product.hidden);
    }

    if (fields.length === 0) {
      return callback(null, { affectedRows: 0, message: 'No fields to update' });
    }

    const sql = `UPDATE products SET ${fields.join(', ')} WHERE productId = ?`;
    values.push(productId);

    db.query(sql, values, (err, result) => {
      if (err) return callback(err);
      callback(null, result);
    });
  },
  delete(productId, callback) {
    const sql = 'UPDATE products SET hidden = 1 WHERE productId = ?';
    db.query(sql, [productId], callback);
  },

  unhide(productId, callback) {
    const sql = 'UPDATE products SET hidden = 0 WHERE productId = ?';
    db.query(sql, [productId], callback);
  },
  
  getStockById(productId, callback) {
    const sql = "SELECT quantity FROM products WHERE productId = ?";
    db.query(sql, [productId], (err, rows) => {
        if (err) return callback(err);
        if (rows.length === 0) return callback({ message: "Product not found" });
        callback(null, rows[0].quantity);
    });
  },

  updateStockById(productId, newQuantity, callback) {
    if (newQuantity === 0) {
      Cart.deleteByProductId(productId, (err) => {
        if (err) console.error("Error deleting product from carts:", err);
          const sql = "UPDATE products SET quantity = ? WHERE productId = ?";
          db.query(sql, [newQuantity, productId], callback);
      });
    }
    const sql = "UPDATE products SET quantity = ? WHERE productId = ?";
    db.query(sql, [newQuantity, productId], callback);
  },

  getProductPriceById(productId, callback) {
    const sql = "SELECT price FROM products WHERE productId = ?";
    db.query(sql, [productId], callback);
  }
};

module.exports = Supermarket;