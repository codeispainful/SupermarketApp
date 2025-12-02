const Orders = require('../models/Orders');

const OrdersController = {
    viewInvoice(req, res) {
    const orderId = req.params.orderId;

    Orders.getOrderById(orderId, (err, orders) => {
        if (err || orders.length === 0) {
            req.flash("error", "Invoice not found.");
            return res.redirect('/');
        }

        // 🔒 Get logged in user ID
        const loggedInUserId = req.session.user.userId;

        // 🔒 Check if this order belongs to the logged-in user
        if (orders[0].userid !== loggedInUserId) {
            req.flash("error", "Unauthorized access to invoice.");
            return res.redirect('/');
        }

        // Convert subtotal to numbers
        orders.forEach(item => {
            item.subtotal = parseFloat(item.subtotal);
        });

        res.render('invoice', {
            orderId,
            orders,
            orderDatetime: orders[0].order_datetime
        });
    });
},
}

module.exports = OrdersController;