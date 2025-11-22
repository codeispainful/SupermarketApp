const Supermarket = require('../models/Supermarket');
const Cart = require('../models/Cart');

/**
 * Controller for products (Supermarket).
 * Each method accepts Express (req, res) and uses the Supermarket model (callback style).
 */
const SupermarketController = {
  /**
   * List products. Supports query params: search, limit, offset.
   */
  list(req, res) {
    const params = {};
    if (req.query.search) params.search = req.query.search;
    if (req.query.limit) {
      const n = parseInt(req.query.limit, 10);
      if (!Number.isNaN(n)) params.limit = n;
    }
    if (req.query.offset) {
      const n = parseInt(req.query.offset, 10);
      if (!Number.isNaN(n)) params.offset = n;
    }

    Supermarket.getAll(params, (err, rows) => {
      if (err) return res.status(500).json({ error: 'Database error', details: err.message });
      // prefer JSON for API requests, otherwise render index view
      if (req.xhr || (req.headers.accept && req.headers.accept.includes('application/json'))) {
        return res.json(rows);
      }
      return res.render('index', { products: rows, success: req.flash("success"), error: req.flash("error") });
    });
  },

  userdashboardlist(req, res) {
    const userId = req.session.user.userId;
    const params = {};
    if (req.query.search) params.search = req.query.search;
    if (req.query.limit) {
      const n = parseInt(req.query.limit, 10);
      if (!Number.isNaN(n)) params.limit = n;
    }
    if (req.query.offset) {
      const n = parseInt(req.query.offset, 10);
      if (!Number.isNaN(n)) params.offset = n;
    }

    Supermarket.getAll(params, (err, products) => {
        if (err) return res.status(500).json({ error: 'Database error', details: err.message });
        // Get user cart
        Cart.getUserCart(userId, (err, cartItems) => {
            if (err) return res.status(500).json({ error: 'Cart error', details: err.message });
            // Convert cart items into a map for fast lookup
            const cartMap = {};
            cartItems.forEach(item => {
                cartMap[item.productId] = item.quantity;
            });

            // Add cart quantity to products
            products.forEach(product => {
                product.cartQuantity = cartMap[product.productId] || 0;
            });

            return res.render("homepage", {
                products
            });
        });
    });
  },

  viewById(req, res) {
    const id = req.params.id || req.params.productId;
    Supermarket.getById(id, (err, product) => {
      if (err) return res.status(500).json({ error: 'Database error', details: err.message });
      if (!product) return res.status(404).json({ error: 'Product not found' });
      if (req.xhr || (req.headers.accept && req.headers.accept.includes('application/json'))) {
        return res.json(product);
      }
      return res.render('product', { product });
    });
  },

  getById(req, res) {
    const id = req.params.id || req.params.productId;
    Supermarket.getById(id, (err, product) => {
      if (err) return res.status(500).json({ error: 'Database error', details: err.message });
      if (!product) return res.status(404).json({ error: 'Product not found' });
      if (req.xhr || (req.headers.accept && req.headers.accept.includes('application/json'))) {
        return res.json(product);
      }
      return res.render('editProduct', { product });
    });
  },

  /**
   * Add a new product.
   */
  add(req, res) {
    const product = {
      productName: req.body.productName,
      quantity: req.body.quantity != null ? Number(req.body.quantity) : null,
      price: req.body.price != null ? Number(req.body.price) : null,
      image: req.body.image || null,
      category: req.body.category || null,
    };

    Supermarket.add(product, (err, result) => {
      if (err) return res.status(500).json({ error: 'Database error', details: err.message });
      // If form submit, redirect to list; otherwise return created resource
      if (req.headers.accept && req.headers.accept.includes('text/html')) {
        return res.redirect('/adminView');
      }
      return res.status(201).json({ productId: result.insertId, ...product });
    });
  },

  /**
   * Update a product by ID (partial updates supported).
   */
  update(req, res) {
    const id = req.params.id || req.params.productId;
    const product = {};
    if (req.body.productName !== undefined) product.productName = req.body.productName;
    if (req.body.quantity !== undefined) product.quantity = req.body.quantity !== '' ? Number(req.body.quantity) : null;
    if (req.body.price !== undefined) product.price = req.body.price !== '' ? Number(req.body.price) : null;
    if (req.body.image !== undefined) product.image = req.file.filename;
    if (req.body.category !== undefined) product.category = req.body.category;

    Supermarket.update(id, product, (err, result) => {
      if (err) return res.status(500).json({ error: 'Database error', details: err.message });
      // MySQL result: check affectedRows
      if (result && result.affectedRows === 0) {
        return res.status(404).json({ error: 'Product not found or no change' });
      }
      if (req.headers.accept && req.headers.accept.includes('text/html')) {
        return res.redirect(`/adminView`);
      }
      return res.json({ success: true, result });
    });
  },

  /**
   * Delete a product by ID.
   */
  delete(req, res) {
    const id = req.params.id || req.params.productId;
    Supermarket.delete(id, (err, result) => {
      if (err) return res.status(500).json({ error: 'Database error', details: err.message });
      if (result && result.affectedRows === 0) {
        return res.status(404).json({ error: 'Product not found' });
      }
      if (req.headers.accept && req.headers.accept.includes('text/html')) {
        return res.redirect('/adminView');
      }
      return res.json({ success: true });
    });
  },
};

module.exports = SupermarketController;