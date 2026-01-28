const express = require('express');
const path = require('path');
const multer = require('multer');
const session = require('express-session'); 
const flash = require('connect-flash'); 
const app = express();
const bodyParser = require("body-parser");
const axios = require('axios');

// set up multer for file uploads
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, 'public/images'); // Directory to save uploaded files
    },
    filename: (req, file, cb) => {
        cb(null, file.originalname);
    }
});

const upload = multer({ storage: storage });

// Use MVC controller/model
const SupermarketController = require('./controllers/SupermarketController');
const Supermarket = require('./models/Supermarket');

const LoginRegController = require('./controllers/LoginRegController');
const LoginReg = require('./models/LoginReg');

const CartController = require('./controllers/CartController');
const Cart = require('./models/Cart');

const UserController = require('./controllers/UserController');
const User = require('./models/User');

const OrdersController = require('./controllers/OrdersController');
const Orders = require('./models/Orders');

const ReviewController = require('./controllers/ReviewController');
const Review = require('./models/Review');

const TransactionController = require('./controllers/TransactionController');
const Transaction = require('./models/Transaction');

const RefundController = require('./controllers/RefundController')
const Refund = require('./models/Refund');

const paypal = require('./services/paypal');
const paymentNotifier = require('./services/paymentNotifier');

const netsQr = require('./services/nets');

// For session management and flash messages
const { checkAuthenticated, checkAuthorised } = require('./middleware');

// Set up view engine
app.set('view engine', 'ejs');

// set up middleware to handle PayPal webhooks
app.use('/api/paypal/webhook', express.raw({ type: 'application/json' }));

// enable json parsing
app.use(express.json());

// enable static files
app.use(express.static('public'));

// Body parsing
app.use(express.urlencoded({ extended: true }));

// use session and flash for login messages
app.use(session({
  secret: process.env.SESSION_SECRET || 'secret',
  resave: false,
  saveUninitialized: false,
  cookie: { maxAge: 1000 * 60 * 60 * 24 } // 1 day
}));

app.use(flash());

app.use((req, res, next) => {
    res.locals.success = req.flash("success");
    res.locals.error = req.flash("error");
    next();
});

app.use(bodyParser.json());

// Routes using controller methods
// Login Reg -------------------------------------------------------------------------------------------------------------------------------
app.get('/registerUser', (req, res) => {
  res.render('register');
});

app.post('/registerUser', (req, res) => {
  return LoginRegController.add(req, res);
});

app.get('/loginUser', (req, res) => {
  res.render('login');
});

app.post('/loginUser', (req, res) => {
  return LoginRegController.login(req, res);
});

app.get('/logout', (req, res) => {
  return LoginRegController.logout(req, res);
});

//USER DASHBOARD----------------------------------------------------------------------------------------------------------------------------------
app.get('/', (req, res) => {
  return SupermarketController.userdashboardlist(req, res);
});

app.get('/viewProfile',checkAuthenticated, (req, res) => {
  return UserController.viewById(req, res);
});

app.get('/editProfile',checkAuthenticated, (req, res) => {
  return UserController.editView(req, res);
});

app.post('/editProfile',checkAuthenticated, (req, res) => {
  return UserController.editbyId(req, res);
});

app.get('/productDetails/:id', (req, res) => {
  return SupermarketController.getByIdDetails(req, res);
});

app.post('/addReview/:id',checkAuthenticated, (req, res) => {
  return ReviewController.addReview(req, res);
});

app.get('/myReviews',checkAuthenticated, (req, res) => {
  return ReviewController.getReviewbyUserId(req, res);
});

app.get('/deleteReview/:id', checkAuthenticated, (req, res) => {
  return ReviewController.deleteReview(req, res);
});

app.get('/reqRefund/:id', checkAuthenticated, (req,res) =>{
  return RefundController.getRequestForm(req, res);
})

//CART HANDLER-----------------------------------------------------------------------------------------------------------------------------------
app.post('/addtocart/:id',checkAuthenticated, (req, res) => {
  return CartController.addToCart(req, res);
});

app.get('/viewcart',checkAuthenticated, (req, res) => {
  return CartController.viewCart(req, res);
});

app.post('/cartupdate',checkAuthenticated, (req, res) => {
  return CartController.updateCart(req, res);
});

app.get('/cartdelete/:id',checkAuthenticated, (req, res) => {
  return CartController.deleteFromCart(req, res);
});

app.get('/checkout',checkAuthenticated, (req, res) => {
  return CartController.checkout(req, res);
});

app.get('/clearcart',checkAuthenticated, (req, res) => {
  return CartController.deleteAllFromCart(req, res);
});

app.get('/invoice/:orderId', checkAuthenticated, (req, res) => {
  return OrdersController.viewInvoice(req, res);
});


//ADMIN DASHBOARD----------------------------------------------------------------------------------------------------------------------------------
// List products (home)
app.get('/adminView',checkAuthenticated, checkAuthorised(['admin']), (req, res) => {
  return SupermarketController.list(req, res);
});

// View single product
app.get('/product/:id',checkAuthenticated, checkAuthorised(['admin']), (req, res) => {
  return SupermarketController.viewById(req, res);
});

// Render add product form
app.get('/addProduct',checkAuthenticated, checkAuthorised(['admin']), (req, res) => {
  res.render('addProduct');
});

// Handle add product (with file upload)
app.post('/addProduct',checkAuthenticated, checkAuthorised(['admin']), upload.single('image'), (req, res) => {
  // Map form fields to controller/model expected names
  if (req.body.name !== undefined) req.body.productName = req.body.name;
  if (req.file) {
    req.body.image = req.file.filename;
  } else {
    req.body.image = null;
  }
  return SupermarketController.add(req, res);
});

app.get('/editProduct/:id',checkAuthenticated, checkAuthorised(['admin']), (req, res) => {
  return SupermarketController.getById(req, res);
});

app.post('/editProduct/:id',checkAuthenticated, checkAuthorised(['admin']), upload.single('image'), (req, res) => {
  return SupermarketController.update(req, res);
});

app.get('/deleteProduct/:id',checkAuthenticated, checkAuthorised(['admin']), (req, res) => {
  return SupermarketController.delete(req, res);
});

app.get('/unhideProduct/:id',checkAuthenticated, checkAuthorised(['admin']), (req, res) => {
  return SupermarketController.unhide(req, res);
});

app.get('/adminViewUsers',checkAuthenticated, checkAuthorised(['admin']), (req, res) => {
  return UserController.viewAll(req, res);
});

app.get('/editUser/:id',checkAuthenticated, checkAuthorised(['admin']), (req, res) => {
  return UserController.editViewAdmin(req, res);
});

app.post('/editUser/:id',checkAuthenticated, checkAuthorised(['admin']), (req, res) => {
  return UserController.editbyIdAdmin(req, res);
});

app.get('/banuser/:id',checkAuthenticated, checkAuthorised(['admin']), (req, res) => {
  return UserController.banById(req, res);
});

app.get('/unbanuser/:id',checkAuthenticated, checkAuthorised(['admin']), (req, res) => {
  return UserController.unbanById(req, res);
});

app.get('/adminOrders',checkAuthenticated, checkAuthorised(['admin']), (req, res) => {
  return OrdersController.viewAll(req, res);
});

// Admin: view all transactions
app.get('/admin/transactions', checkAuthenticated, checkAuthorised(['admin']), (req, res) => {
  return TransactionController.adminList(req, res);
});

// Admin: refund a transaction
app.post('/admin/transactions/:id/refund', checkAuthenticated, checkAuthorised(['admin']), (req, res) => {
  return TransactionController.adminRefund(req, res);
});

app.get('/adminReviews',checkAuthenticated, checkAuthorised(['admin']), (req, res) => {
  return ReviewController.getAllReviewsAdmin(req, res);
});

app.get('/deleteReviewAdmin/:id',checkAuthenticated, checkAuthorised(['admin']), (req, res) => {
  return ReviewController.deleteReviewAdmin(req, res);
});

app.get('/refundReqs',checkAuthenticated, checkAuthorised(['admin']), (req, res) => {
  return RefundController.getAllPending(req, res);
});

//paypal routes ----------------------------------------------------------------

//webhooks
app.post(
  '/api/paypal/webhook',
  express.raw({ type: 'application/json' }), // keep this before any JSON parser
  async (req, res) => {
    try {
      // Pass raw body and headers to verifyWebhook
      const isValid = await paypal.verifyWebhook(req.body.toString(), req.headers);
      if (!isValid) {
        console.log('Invalid PayPal webhook');
        return res.sendStatus(400);
      }

      // Parse the event after verification
      const event = JSON.parse(req.body.toString());
      console.log('PayPal Webhook Event:', event.event_type);

      switch (event.event_type) {
        case 'PAYMENT.CAPTURE.COMPLETED':
          await paypal.handlePaymentCompleted(event);
          break;

        case 'PAYMENT.CAPTURE.REFUNDED':
          await paypal.handlePaymentRefunded(event);
          break;

        /*
        case 'PAYMENT.CAPTURE.DENIED':
          await paypal.handlePaymentDenied?.(event);
          break;
        */

        default:
          console.log('Unhandled event:', event.event_type);
      }

      res.sendStatus(200);
    } catch (err) {
      console.error('Webhook error:', err);
      res.sendStatus(500);
    }
  }
);

// PayPal: Create Order
app.post('/api/paypal/create-order',checkAuthenticated, async (req, res) => {
  try {
    const userId = req.session.user.userId;
    const { cart } = req.body;
    let total = 0;
    for (const item of cart) {
      const product = await Supermarket.getByIdPayPal(item.productId);
      if (!product || product.stock < item.quantity) {
        return res.status(400).json({ error: 'Invalid cart' });
      }
      total += product.price * item.quantity;
    }
    console.log(total.toFixed(2));
    const order = await paypal.createOrder(total.toFixed(2),userId);
    console.log('PayPal createOrder response:', order);
    if (order && order.id) {
      res.json({ id: order.id });
    } else {
      res.status(500).json({ error: 'Failed to create PayPal order', details: order });
    }
  } catch (err) {
    res.status(500).json({ error: 'Failed to create PayPal order', message: err.message });
  }
});

// capture paypal order and finalize checkout
app.post('/api/paypal/capture-order', checkAuthenticated, async (req, res) => {
  try {
    const { orderID } = req.body;

    const capture = await paypal.captureOrder(orderID);
    console.log('PayPal captureOrder response:', capture);

    // Prefer the actual capture id (from payments.captures[0].id) over the top-level order id
    let captureId = undefined;
    try {
      captureId = capture?.purchase_units?.[0]?.payments?.captures?.[0]?.id;
    } catch (e) {
      captureId = undefined;
    }

    // fallback to other possible locations (but prefer captures array)
    if (!captureId) {
      captureId = capture?.capture?.id || capture?.id || (capture?.result && capture.result?.id) || undefined;
    }

    if (!captureId) console.warn('Could not extract captureId from PayPal response', capture);

    // Check completed status based on capture entry if available
    const isCompleted = Boolean(
      capture?.purchase_units?.[0]?.payments?.captures?.[0]?.status === 'COMPLETED' ||
      capture?.status === 'COMPLETED'
    );

    // DO NOT finalize checkout here! Let webhook handle it.
    res.json({ success: isCompleted, capture, captureId });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to capture PayPal order', message: err.message });
  }
});

// Render pending payment page
app.get('/pending-payment', checkAuthenticated, (req, res) => {
  res.render('pendingPayment');
});

// Check payment finalization (polled by frontend)
app.get('/api/payment-status', checkAuthenticated, async (req, res) => {
  try {
    const captureId = req.query.captureId;
    if (!captureId) return res.status(400).json({ error: 'captureId required' });

    // fetch transaction row if present to include orderId
    Transaction.getById(captureId, (err, row) => {
      if (err) {
        console.error('Payment status DB error:', err);
        return res.status(500).json({ error: err.message });
      }
      if (row) {
        return res.json({ finalized: true, orderId: row.orderId });
      }
      return res.json({ finalized: false });
    });
  } catch (err) {
    console.error('Payment status check error:', err);
    res.status(500).json({ error: err.message });
  }
});

// SSE for PayPal capture notifications (webhook will notify)
app.get('/sse/paypal/:captureId', checkAuthenticated, (req, res) => {
  res.set({
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache',
    'Connection': 'keep-alive'
  });

  const captureId = req.params.captureId;

  // Subscribe the response to be notified when webhook finalises
  paymentNotifier.subscribe(captureId, res);

  // send a small heartbeat to ensure connection opens
  res.write(`data: ${JSON.stringify({ connected: true })}\n\n`);
});

//refund request route
app.post('/api/refunds/request', checkAuthenticated, upload.single('image'), async (req, res) => {
  const userId = req.session.user.userId;
  // For multipart/form-data, multer parses fields into req.body and file into req.file
  console.log('refund form body:', req.body, 'file:', req.file);

  const { transactionId, reason } = req.body || {};
  const image = req.file ? req.file.filename : null;

  if (!transactionId || !reason) {
    return res.status(400).json({ error: 'transactionId and reason are required' });
  }

  Refund.create(
    transactionId,
    userId,
    reason,
    image,
    'PENDING',
    (err) => {
      if (err) {
        console.error('Refund request failed:', err);
        req.flash('error', 'Failed to submit refund request.');
        return res.redirect('/viewProfile');
      }

      req.flash("success", "Refund request submitted successfully, please wait patiently for approval.");
      return res.redirect('/viewProfile');
    }
  );
});

app.post('/api/admin/refunds/:id/approve', checkAuthorised(['admin']), async (req, res) => {
  const transactionId = req.params.id;
  try {
    const refundRequest = await RefundController.getById(transactionId);

    const transaction = await new Promise((resolve, reject) => {
      Transaction.getById(transactionId, (err, row) => {
        if (err) return reject(err);
        resolve(row);
      });
    });

    if (!transaction) return res.status(404).json({ error: 'Transaction not found' });
    if (transaction.refunded === 1) {
      return res.status(400).send('Already refunded');
    }

    const refund = await paypal.refundCapture(transaction.id);

    if (refundRequest) {
      if (refundRequest.status !== 'PENDING') {
        return res.status(400).json({ error: 'Already processed' });
      }
      // update existing refund record to REFUNDED
      await new Promise((resolve, reject) => {
        Refund.updateStatus(refundRequest.id, 'REFUNDED', refund.id, (err) => err ? reject(err) : resolve());
      });
    } else {
      // do not create a new refund record; just log and continue
      console.log('No existing refund request for transaction', transactionId, '- skipping insert, will mark transaction refunded');
    }

    await new Promise((resolve, reject) => {
      Transaction.markRefunded(transactionId, refund.id || null, (err) => err ? reject(err) : resolve());
    });

    res.redirect('/adminView');
  } catch (err) {
    console.error('Admin refund approve error:', err);
    return res.status(500).json({ error: 'Failed to process refund' });
  }
});
//NETS NETS NETS NETS NETS NETS NETS NETS NETS NETS -----------------------------------------------------------------------------------------------------------------
//NETS QR code
app.get('/generateNETSQR',checkAuthenticated, netsQr.generateQrCode);
app.get("/nets-qr/success",checkAuthenticated, (req, res) => {
    res.render('netsTxnSuccessStatus', { message: 'Transaction Successful!' });
});
app.get("/nets-qr/fail",checkAuthenticated, (req, res) => {
    res.render('netsTxnFailStatus', { message: 'Transaction Failed. Please try again.' });
})

//SSE for polling payment status
app.get('/sse/payment-status/:txnRetrievalRef',checkAuthenticated, async (req, res) => {
    res.set({
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive'
    });

    const txnRetrievalRef = req.params.txnRetrievalRef;
    let pollCount = 0;
    const maxPolls = 60; // 5 minutes if polling every 5s
    let frontendTimeoutStatus = 0;

    const interval = setInterval(async () => {
        pollCount++;

        try {
            // Call the NETS query API
            const response = await axios.post(
                'https://sandbox.nets.openapipaas.com/api/v1/common/payments/nets-qr/query',
                { txn_retrieval_ref: txnRetrievalRef, frontend_timeout_status: frontendTimeoutStatus },
                {
                    headers: {
                        'api-key': process.env.API_KEY,
                        'project-id': process.env.PROJECT_ID,
                        'Content-Type': 'application/json'
                    }
                }
            );

            console.log("Polling response:", response.data);
            // Send the full response to the frontend
            res.write(`data: ${JSON.stringify(response.data)}\n\n`);
        
            const resData = response.data.result.data;

            // Decide when to end polling and close the connection
            //Check if payment is successful
            if (resData.response_code == "00" && resData.txn_status === 1) {
                // Payment success: send a success message
                res.write(`data: ${JSON.stringify({ success: true })}\n\n`);
                clearInterval(interval);
                res.end();
            } else if (frontendTimeoutStatus == 1 && resData && (resData.response_code !== "00" || resData.txn_status === 2)) {
                // Payment failure: send a fail message
                res.write(`data: ${JSON.stringify({ fail: true, ...resData })}\n\n`);
                clearInterval(interval);
                res.end();
            }

        } catch (err) {
            clearInterval(interval);
            res.write(`data: ${JSON.stringify({ error: err.message })}\n\n`);
            res.end();
        }


        // Timeout
        if (pollCount >= maxPolls) {
            clearInterval(interval);
            frontendTimeoutStatus = 1;
            res.write(`data: ${JSON.stringify({ fail: true, error: "Timeout" })}\n\n`);
            res.end();
        }
    }, 5000);

    req.on('close', () => {
        clearInterval(interval);
    });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));