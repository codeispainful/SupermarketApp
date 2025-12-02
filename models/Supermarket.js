const db = require('../db');

/**
 * Function-based model for products table.
 * Fields: productId, productName, quantity, price, image
 */
const Supermarket = {
  /**
   * Get all products. params may include { limit, offset, search }.
   * @param {Object} params
   * @param {Function} callback (err, rows)
   */
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

  /**
   * Get a product by ID.
   * @param {number} productId
   * @param {Function} callback (err, row)
   */
  getById(productId, callback) {
    const sql = 'SELECT productId, productName, quantity, price, image, hidden, category FROM products WHERE productId = ?';
    db.query(sql, [productId], (err, results) => {
      if (err) return callback(err);
      callback(null, results[0] || null);
    });
  },

  /**
   * Add a new product.
   * @param {Object} product { productName, quantity, price, image }
   * @param {Function} callback (err, result)
   */
  add(product, callback) {
    const sql = 'INSERT INTO products (productName, quantity, price, image, category, hidden) VALUES (?, ?, ?, ?, ?, ?)';
    const params = [
      product.productName || null,
      product.quantity != null ? product.quantity : null,
      product.price != null ? product.price : null,
      product.image || null,
      product.category || null,
      product.hidden || null,
    ];
    db.query(sql, params, (err, result) => {
      if (err) return callback(err);
      callback(null, { insertId: result.insertId, ...product });
    });
  },

  /**
   * Update a product by ID. Supports partial updates.
   * @param {number} productId
   * @param {Object} product Partial product fields to update
   * @param {Function} callback (err, result)
   */
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

  /**
   * Delete a product by ID.
   * @param {number} productId
   * @param {Function} callback (err, result)
   */
  delete(productId, callback) {
    const sql = 'UPDATE products SET hidden = 1 WHERE productId = ?';
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
    const sql = "UPDATE products SET quantity = ? WHERE productId = ?";
    db.query(sql, [newQuantity, productId], callback);
  },
};

module.exports = Supermarket;