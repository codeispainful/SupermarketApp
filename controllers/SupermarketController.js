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
      return res.render('index', { products: rows});
    });
  },

userdashboardlist(req, res) {
    const user = req.session.user || null;  // ✅ user is null if not logged in
    const userId = user ? user.userId : null; // only use if user exists
    const params = {};

    // Search
    if (req.query.search) params.search = req.query.search;

    // Pagination
    if (req.query.limit) {
        const n = parseInt(req.query.limit, 10);
        if (!Number.isNaN(n)) params.limit = n;
    }
    if (req.query.offset) {
        const n = parseInt(req.query.offset, 10);
        if (!Number.isNaN(n)) params.offset = n;
    }

    const selectedCategory = req.query.category || null;
    const sort = req.query.sort || null;

    Supermarket.getAll(params, (err, products) => {
        if (err) return res.status(500).json({ error: 'Database error', details: err.message });

        // Filter by category
        let filteredProducts = products;
        if (selectedCategory) {
            filteredProducts = filteredProducts.filter(p => p.category === selectedCategory);
        }

        // Sort by price
        if (sort === 'asc') {
            filteredProducts.sort((a, b) => a.price - b.price);
        } else if (sort === 'desc') {
            filteredProducts.sort((a, b) => b.price - a.price);
        }

        if (userId) {
            // Only get cart if user is logged in
            Cart.getUserCart(userId, (err, cartItems) => {
                if (err) return res.status(500).json({ error: 'Cart error', details: err.message });

                const cartMap = {};
                cartItems.forEach(item => {
                    cartMap[item.productId] = item.quantity;
                });

                filteredProducts.forEach(product => {
                    product.cartQuantity = cartMap[product.productId] || 0;
                });

                return res.render("homepage", {
                    products: filteredProducts,
                    sort,
                    selectedCategory,
                    search: params.search || '', 
                    user
                });
            });
        } else {
            // For visitors, just render products without cart info
            return res.render("homepage", {
                products: filteredProducts,
                sort,
                selectedCategory,
                search: params.search || '', 
                user
            });
        }
    });
},

  viewById(req, res) {
    const id = req.params.id || req.params.productId;
    Supermarket.getById(id, (err, product) => {
      if (err) return res.status(500).json({ error: 'Database error', details: err.message });
      if (!product) return res.status(404).json({ error: 'Product not found' });
      return res.render('product', { product });
    });
  },

  getById(req, res) {
    const id = req.params.id || req.params.productId;
    Supermarket.getById(id, (err, product) => {
      if (err) return res.status(500).json({ error: 'Database error', details: err.message });
      if (!product) return res.status(404).json({ error: 'Product not found' });
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
      hidden: req.body.hidden
    };

    Supermarket.add(product, (err, result) => {
      if (err) return res.status(500).json({ error: 'Database error', details: err.message });
      return res.redirect('/adminView');
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
    if (req.body.hidden !== undefined) {
      let hidden = req.body.hidden;
      if (Array.isArray(hidden)) hidden = hidden[hidden.length - 1];
      product.hidden = hidden === "1" ? 1 : 0;
    }

    Supermarket.update(id, product, (err, result) => {
      if (err) return res.status(500).json({ error: 'Database error', details: err.message });
      // MySQL result: check affectedRows
      if (result && result.affectedRows === 0) {
        return res.status(404).json({ error: 'Product not found or no change' });
      }
      req.flash("success", "Product updated successfully");
      return res.redirect(`/adminView`);
    });
  },

  /**
   * Delete a product by ID.
   */
  delete(req, res) {
    const id = req.params.id || req.params.productId;

    // 1. Delete product from supermarket table
    Supermarket.delete(id, (err, result) => {
      if (err) {
        return res.status(500).json({
          error: "Database error while deleting product",
          details: err.message
        });
      }
      // Product not found
      if (result.affectedRows === 0) {
        return res.status(404).json({ error: "Product not found" });
      }
      // 2. Delete cart items referencing this product
      Cart.deleteByProductId(id, (cartErr, cartResult) => {
        if (cartErr) {
          console.error("Error deleting from cart:", cartErr);
          // Still allow user to continue
          return res.status(500).json({
            error: "Product deleted, but failed to delete related cart items"
          });
        }
        // ✔ SUCCESS — deleted from both tables
        req.flash("success", "Product hidden successfully");
        return res.redirect("/adminView");
      });
    });
  }
};

module.exports = SupermarketController;