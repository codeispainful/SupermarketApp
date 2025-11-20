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

// For session management and flash messages
const { checkAuthenticated, checkAuthorised } = require('./middleware');

// Set up view engine
app.set('view engine', 'ejs');
// enable static files
app.use(express.static('public'));

// Body parsing
app.use(express.urlencoded({ extended: false }));

// use session and flash for login messages
app.use(session({
  secret: process.env.SESSION_SECRET || 'secret',
  resave: false,
  saveUninitialized: false,
  cookie: { maxAge: 1000 * 60 * 60 * 24 } // 1 day
}));

app.use(flash());


// Routes using controller methods
// Login Reg -------------------------------------------------------------------------------------------------------------------------------
app.get('/registerUser', (req, res) => {
  res.render('register');
});

app.post('/registerUser', (req, res) => {
  return LoginRegController.add(req, res);
});

app.get('/loginUser', (req, res) => {
  res.render('login', { 
    errors: req.flash('error'),
    success: req.flash('success')
  });
});

app.post('/loginUser', (req, res) => {
  return LoginRegController.login(req, res);
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

// Render edit product form
app.get('/editProduct/:id',checkAuthenticated, checkAuthorised(['admin']), (req, res) => {
  return SupermarketController.getById(req, res);
});

// Handle update product (with optional file upload)
app.post('/editProduct/:id',checkAuthenticated, checkAuthorised(['admin']), upload.single('image'), (req, res) => {
  return SupermarketController.update(req, res);
});

// Delete product
app.get('/deleteProduct/:id',checkAuthenticated, checkAuthorised(['admin']), (req, res) => {
  return SupermarketController.delete(req, res);
});

//USER DASHBOARD----------------------------------------------------------------------------------------------------------------------------------


const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));