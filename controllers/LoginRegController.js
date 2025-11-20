const LoginReg = require('../models/LoginReg');
const LoginRegController = {
    add(req, res) {
        const userdetails = {
            username: req.body.username,
            password: req.body.password,
            email: req.body.email,
            contact: req.body.contact,
            role: 'user', // default role
        };

        LoginReg.add(userdetails, (err, result) => {
            if (err) return res.status(500).json({ error: 'Database error', details: err.message });
            // If form submit, redirect to list; otherwise return created resource
            if (req.headers.accept && req.headers.accept.includes('text/html')) {
                return res.redirect('/login');
            }
            return res.status(201).json({ insertId: result.insertId, ...userdetails });
        });
    },
    login(req, res) {
        const username = req.body.username;
        const password = req.body.password;
        LoginReg.login(username, password, (err, result) => {
            if (err) {
                req.flash('error', 'Password or username incorrect. Please try again.');
                return res.redirect('/loginUser');
            }
            if (!result) {
                req.flash("error", "Invalid email or password");
                req.flash("formData", req.body);
                return res.redirect("/loginUser");
            }
            req.session.user = {
                userId: result.userId,
                name: result.username,
                email: result.email,
                contact: result.contact,
                role: result.role,
            };
            req.flash("success", "Logged in");
            if (result.role === "admin") {
                return res.redirect("/adminView");
            } else {
                return res.redirect("/");
            }
        });
    }
};

module.exports = LoginRegController;