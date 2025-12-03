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
            if (!result) {
            // username already exists case
                req.flash('error', 'Username already exists');
                return res.redirect('/registerUser');
            }
            if (err) return res.status(500).json({ error: 'Database error', details: err.message });
            // If form submit, redirect to list; otherwise return created resource
            return res.redirect('/loginUser');
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
            if (result.banned === 1) {
                req.flash('error', 'This account has been banned, please contact our support team at 1800-123-4567 or email support@supermarket.sg for more information.');
                return res.redirect('/loginUser');
            }
            if (!result) {
                req.flash("error", "Invalid email or password");
                req.flash("formData", req.body);
                return res.redirect("/loginUser");
            }
            req.session.user = {
                userId: result.userid,
                name: result.username,
                email: result.email,
                contact: result.contact,
                role: result.role,
            };
            req.flash("success", "Logged in");
            if (result.role === "admin") {
                req.flash("success", " welcome admin, "+result.username);
                return res.redirect("/adminView");
            } else {
                req.flash("success", " welcome user, "+result.username);
                return res.redirect("/");
            }
        });
    },
    logout(req, res) {
        req.session.destroy((err) => {
            res.redirect("/loginUser");
        });
    },
};

module.exports = LoginRegController;