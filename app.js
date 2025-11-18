const express = require('express');
const multer = require('multer');
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

// Set up view engine
app.set('view engine', 'ejs');
// enable static files
app.use(express.static('public'));

// Body parsing
app.use(express.urlencoded({ extended: false }));

// Routes using controller methods
// Login Reg -------------------------------------------------------------------------------------------------------------------------------
app.get('/registerUser', (req, res) => {
  res.render('register');
});

app.post('/registerUser', (req, res) => {
  if (req.body.username !== undefined)
    {req.body.username = req.body.username;}
  if (req.body.password !== undefined) 
    {req.body.password = req.body.password;}
  return LoginRegController.add(req, res);
});


//ADMIN DASHBOARD----------------------------------------------------------------------------------------------------------------------------------
// List products (home)
app.get('/', (req, res) => {
  return SupermarketController.list(req, res);
});

// View single product
app.get('/product/:id', (req, res) => {
  return SupermarketController.getById(req, res);
});

// Render add product form
app.get('/addProduct', (req, res) => {
  res.render('addProduct');
});

// Handle add product (with file upload)
app.post('/addProduct', upload.single('image'), (req, res) => {
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
app.get('/editProduct/:id', (req, res) => {
  const productId = req.params.id;
  // Use model directly to render edit form (keeps edit view separate from controller's product view)
  Supermarket.getById(productId, (err, product) => {
    if (err) {
      console.error('Database error:', err.message);
      return res.status(500).send('Error retrieving product');
    }
    if (!product) return res.status(404).send('Product not found');
    return res.render('editProduct', { product });
  });
});

// Handle update product (with optional file upload)
app.post('/editProduct/:id', upload.single('image'), (req, res) => {
  // Map incoming fields to controller/model expected names
  if (req.body.name !== undefined) req.body.productName = req.body.name;
  // For image: if new file uploaded use it, otherwise keep currentImage field from the form
  if (req.file) {
    req.body.image = req.file.filename;
  } else if (req.body.currentImage !== undefined) {
    req.body.image = req.body.currentImage;
  }
  return SupermarketController.update(req, res);
});

// Delete product
app.get('/deleteProduct/:id', (req, res) => {
  return SupermarketController.delete(req, res);
});

//USER DASHBOARD----------------------------------------------------------------------------------------------------------------------------------


const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));