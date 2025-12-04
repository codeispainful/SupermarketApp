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

// For session management and flash messages
const { checkAuthenticated, checkAuthorised } = require('./middleware');

// Set up view engine
app.set('view engine', 'ejs');
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

app.get('/editReview/:id', checkAuthenticated, (req, res) => {
  return ReviewController.getEditReview(req, res);
});

app.post('/editReview/:id', checkAuthenticated, (req, res) => {
  return ReviewController.editReviewById(req, res);
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

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));