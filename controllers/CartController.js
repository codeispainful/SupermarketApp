const Cart = require('../models/Cart');
const Supermarket = require('../models/Supermarket');

const CartController = {
addToCart(req, res) {
    const productId = req.params.id;
    const userId = req.session.user.userId;
    const qtyRequested = parseInt(req.body.quantity) || 1;

    Supermarket.getStockById(productId, (err, stock) => {
        if (err) {
            req.flash("error", "Failed to retrieve product stock.");
            return res.redirect('/');
        }

        Cart.getUserCart(userId, (err, cartItems) => {
            if (err) {
                req.flash("error", "Failed to retrieve cart.");
                return res.redirect('/');
            }

            const existingItem = cartItems.find(item => item.productId == productId);
            const currentQty = existingItem ? existingItem.quantity : 0;

            const newTotalQty = currentQty + qtyRequested;

            if (newTotalQty > stock) {
                req.flash("error", `Not enough stock! Available: ${stock}, You already have: ${currentQty} in the cart.`);
                return res.redirect('/');
            }

            Cart.addbyid(productId, userId, qtyRequested, (err, result) => {
                if (err) {
                    req.flash("error", "Database error updating cart.");
                    return res.redirect('/');
                }
                if (result.insertId) {
                    req.flash("success", `Product added to cart (Qty: ${qtyRequested})`);
                    return res.redirect('/');
                } else if (result.updated) {
                    req.flash("success", `Cart updated! New quantity: ${result.quantity}`);
                    return res.redirect('/');
                } else {
                    req.flash("success", "Cart updated");
                    return res.redirect('/');
                }
            });
        });
    });
},
viewCart(req, res) {
    const userId = req.session.user.userId;
    Cart.getUserCart(userId, (err, cartItems) => {
        if (err) {
            req.flash("error", "Failed to retrieve cart.");
            return res.redirect('/');
        }
        if (cartItems.length === 0) {
            return res.render('viewcart', { cartItems: [] });
        }

        let completed = 0;
        cartItems.forEach((item, index) => {
            Supermarket.getById(item.productId, (err, product) => {
                if (err) {
                    req.flash("error", `Failed to get product info for productId ${item.productId}`);
                    return res.redirect('/');
                }
                // Attach product info to cart item
                cartItems[index].productName = product.productName;
                cartItems[index].price = product.price;
                cartItems[index].availableQuantity = product.quantity;
                cartItems[index].image = product.image;

                completed++;
                if (completed === cartItems.length) {
                    // All product info fetched
                    res.render('viewcart', { cartItems });
                }
            });
        });
    });
},
updateCart(req, res) {
    const userId = req.session.user.userId;
    const updates = req.body; // now req.body has keys = productId, values = qty
    console.log("Received cart updates:", updates);

    if (!updates || Object.keys(updates).length === 0) {
        req.flash("error", "No changes made to cart.");
        return res.redirect('/viewcart');
    }

    const productIds = Object.keys(updates);
    let completed = 0;
    let errorOccurred = false;

    productIds.forEach(productId => {
        let qty = parseInt(updates[productId]);
        if (isNaN(qty) || qty < 1) qty = 1;

        Cart.updateQuantity(userId, productId, qty, (err, result) => {
            completed++;
            if (err) errorOccurred = true;

            if (completed === productIds.length) {
                if (errorOccurred) {
                    req.flash("error", "Some items could not be updated.");
                } else {
                    req.flash("success", "Cart updated successfully!");
                }
                return res.redirect('/viewcart');
            }
        });
    });
},
deleteFromCart(req, res) {
    const userId = req.session.user.userId;
    const productId = req.params.id;
    Cart.deleteById(userId, productId, (err, result) => {
        if (err) {
            req.flash("error", "Failed to delete item from cart.");
            return res.redirect('/viewcart');
        }
        req.flash("success", "Item deleted from cart.");
        return res.redirect('/viewcart');
    });
},
checkout(req, res) {
    const userId = req.session.user.userId;
    Cart.getUserCart(userId, (err, cartItems) => {
        if (err) {
            req.flash("error", "Failed to retrieve cart for checkout.");
            return res.redirect('/viewcart');
        }
        if (cartItems.length === 0) {
            req.flash("error", "Your cart is empty.");
            return res.redirect('/viewcart');
        }
        let processed = 0;
        let errorOccurred = false;
        cartItems.forEach(item => {
            // Step 1: Get stock
            Supermarket.getStockById(item.productId, (err, stock) => {
                if (errorOccurred) return; // stop further execution
                
                if (err || stock == null) {
                    errorOccurred = true;
                    req.flash("error", "Failed to retrieve product stock.");
                    return res.redirect('/viewcart');
                }
                const newStock = stock - item.quantity;
                if (newStock < 0) {
                    errorOccurred = true;
                    req.flash("error", "Not enough stock for one or more items.");
                    return res.redirect('/viewcart');
                }
                // Step 2: Update stock
                Supermarket.updateStockById(item.productId, newStock, (err) => {
                    if (errorOccurred) return;
                    if (err) {
                        errorOccurred = true;
                        req.flash("error", "Failed to update product stock.");
                        return res.redirect('/viewcart');
                    }
                    processed++;
                    // Step 3: When ALL operations are complete
                    if (processed === cartItems.length) {
                        Cart.checkout(userId, (err) => {
                            if (err) {
                                req.flash("error", "Checkout failed.");
                                return res.redirect('/viewcart');
                            }
                            req.flash("success", "Checkout successful! Thank you for your purchase.");
                            return res.redirect('/');
                        });
                    }
                });
            });
        });
    });
}
}
module.exports = CartController;