const Transaction = require('../models/Transaction');

const Refund = require('../models/Refund');
const Orders = require('../models/Orders');
const paypal = require('../services/paypal');

const TransactionController = {
    createTransaction (details, callback) {
        Transaction.add(details, (err, result)=>{
            if(err){
                console.log("Error in TransactionController.createTransaction:", err);
                return callback(err, null);
            } else {
                console.log("TransactionController.createTransaction successful:", result);
                return callback(null, result);
            }
        });
    },
    exists(id) {
        return new Promise((resolve, reject) => {
            Transaction.exists(id, (err, result) => {
                if (err) {
                    console.log("Error in TransactionController.exists:", err);
                    return reject(err);
                }
                // `Transaction.exists` may return different shapes depending on implementation:
                // - boolean (preferred in models/Transaction.exists)
                // - SQL result rows (e.g. [{ count: 1 }])
                let existsBool = false;
                if (typeof result === 'boolean') {
                    existsBool = result;
                } else if (Array.isArray(result)) {
                    if (result.length > 0) {
                        const first = result[0];
                        if (first && typeof first.count !== 'undefined') {
                            existsBool = first.count > 0;
                        } else {
                            // any non-empty rows -> treat as exists
                            existsBool = true;
                        }
                    } else {
                        existsBool = false;
                    }
                } else if (result && typeof result === 'object') {
                    if (typeof result.count !== 'undefined') {
                        existsBool = result.count > 0;
                    } else {
                        existsBool = Boolean(result);
                    }
                } else {
                    existsBool = Boolean(result);
                }

                console.log(`TransactionController.exists: Transaction ID ${id} exists:`, existsBool);
                resolve(existsBool);
            });
        });
    }
}

// Admin helpers
TransactionController.adminList = function(req, res) {
    const search = req.query.search || '';
    Transaction.getAll(search, (err, rows) => {
        if (err) {
            console.error('Error fetching transactions:', err);
            req.flash('error', 'Failed to load transactions');
            return res.redirect('/adminView');
        }

        return res.render('adminTransactions', { transactions: rows, search });
    });
}

TransactionController.adminRefund = async function(req, res) {
    const captureId = req.params.id;
    try {
        // perform PayPal refund
        const refund = await paypal.refundCapture(captureId);

        // mark transaction refunded in DB
        await new Promise((resolve, reject) => {
            Transaction.markRefunded(captureId, refund.id || null, (err) => err ? reject(err) : resolve());
        });

        // Try to associate and create a refund record for tracking
        Transaction.getById(captureId, async (err, tx) => {
            if (err || !tx) {
                req.flash('success', 'Refund issued (transaction record not found).');
                return res.redirect('/admin/transactions');
            }

            try {
                const userId = await Orders.getUserIdByOrderID(tx.orderId);
                Refund.create(captureId, userId, 'Admin-issued refund', null, 'APPROVED', (rerr) => {
                    if (rerr) console.error('Failed to create refund record:', rerr);
                    req.flash('success', 'Refund issued successfully.');
                    return res.redirect('/admin/transactions');
                });
            } catch (e) {
                console.error('Error finding user for order:', e);
                req.flash('success', 'Refund issued (user association failed).');
                return res.redirect('/admin/transactions');
            }
        });
    } catch (err) {
        console.error('Admin refund error:', err);
        req.flash('error', 'Failed to process refund');
        return res.redirect('/admin/transactions');
    }
}

module.exports = TransactionController;