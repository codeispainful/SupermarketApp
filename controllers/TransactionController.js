const Transaction = require('../models/Transaction');

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
    }
}

module.exports = TransactionController;