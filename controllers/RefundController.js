const Refunds = require('../models/Refund');


const RefundController = {
    getRequestForm (req, res) {
        const transactionId = req.params.id;
        res.render('requestRefund', { transactionId });
    },

    async getById(id) {
        return new Promise((resolve, reject) => {
            Refunds.getById(id, (err, row) => {
                if (err) return reject(err);
                console.log(row);
                resolve(row);
            });
        });
    },

    getAllPending(req, res) {
        Refunds.getAllPending((err, rows) => {
            if (err) {
                console.error('Failed to load pending refunds:', err);
                req.flash('error', 'Failed to load refund requests');
                return res.redirect('/adminView');
            }
            return res.render('refundReqs', { refunds: rows });
        });
    }
}

module.exports = RefundController;