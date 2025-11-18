const LoginReg = require('../models/LoginReg');
const LoginRegController = {
    add(req, res) {
        const userdetails = {
            username: req.body.username,
            password: req.body.password,
            email: req.body.email,
            contact: req.body.contact,
        };

        LoginReg.add(userdetails, (err, result) => {
            if (err) return res.status(500).json({ error: 'Database error', details: err.message });
            // If form submit, redirect to list; otherwise return created resource
            if (req.headers.accept && req.headers.accept.includes('text/html')) {
                return res.redirect('/');
            }
            return res.status(201).json({ insertId: result.insertId, ...userdetails });
        });
    },
};

module.exports = LoginRegController;