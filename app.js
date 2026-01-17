const express = require('express');
const path = require('path');
const multer = require('multer');
const session = require('express-session'); 
const flash = require('connect-flash'); 
const app = express();

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

const paypal = require('./services/paypal');

// For session management and flash messages
const { checkAuthenticated, checkAuthorised } = require('./middleware');

// Set up view engine
app.set('view engine', 'ejs');

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

app.get('/adminReviews',checkAuthenticated, checkAuthorised(['admin']), (req, res) => {
  return ReviewController.getAllReviewsAdmin(req, res);
});

app.get('/deleteReviewAdmin/:id',checkAuthenticated, checkAuthorised(['admin']), (req, res) => {
  return ReviewController.deleteReviewAdmin(req, res);
});

//paypal routes ----------------------------------------------------------------
// PayPal: Create Order
app.post('/api/paypal/create-order', async (req, res) => {
  try {
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
    const order = await paypal.createOrder(total.toFixed(2));
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
app.post('/api/paypal/capture-order', async (req, res) => {
  try {
    //paypal order id
    const { orderID } = req.body;
    const userId = req.session.user.userId;

    //Capture PayPal payment
    const capture = await paypal.captureOrder(orderID);
    console.log('PayPal captureOrder response:', capture);

    if (capture.status !== "COMPLETED") {
      return res.status(400).json({ error: 'Payment not completed' });
    }

    //FINALIZE checkout (reuse existing logic)
    CartController.finalizeCheckout(userId, req, res, (err, orderId) => {
      if (err) {
        console.error(err.message);

        // IMPORTANT: Payment succeeded but checkout failed
        // Log this for admin/manual recovery
        return res.status(500).json({
          error: 'Payment succeeded but order processing failed'
        });
      }
      details = {
        id: capture.id,
        orderId: orderId,
        payerId: capture.payer.payer_id,
        payerEmail: capture.payer.email_address,
        amount: capture.purchase_units[0].payments.captures[0].amount.value,
        currency: 'SGD',
        status: capture.status,
        time: capture.purchase_units[0].payments.captures[0].create_time
      }
      console.log("Capture details:", details);

      //create transaction record
      TransactionController.createTransaction(details, (err, result)=>{
        if(err){
          console.error("Failed to record transaction:", err)
        } else {
          console.log("Transaction recorded:", result);
        }
      });
      //Success
      return res.json({
        success: true,
        orderId
      });
    });

  } catch (err) {
    console.error(err);
    res.status(500).json({
      error: 'Failed to capture PayPal order',
      message: err.message
    });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));