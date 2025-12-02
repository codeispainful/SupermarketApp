const User = require('../models/User');
const Orders = require('../models/Orders');

const UserController = {
    viewById(req, res) {
        const userId = req.session.user.userId;
        User.viewById(userId, (err, user) => {
            if (err) return res.status(500).json({ error: 'Database error', details: err.message });
            if (!user) return res.status(404).json({ error: 'User not found' });
            Orders.getOrdersByUser(userId, (err, history) => {
                if (err) return res.status(500).json({ error: 'Orders error', details: err.message });
                history.forEach(item => {
                    item.total_amount = parseFloat(item.total_amount);
                });
                return res.render('viewProfile', {
                    user,
                    history
                });
            });
        });
    },

    editView(req, res) {
        const userId = req.session.user.userId;
        User.viewById(userId, (err, user) => {
            if (err) return res.status(500).json({ error: 'Database error', details: err.message });
            if (!user) return res.status(404).json({ error: 'User not found' });
            return res.render('editProfile', { user });
        });
    },
    editbyId(req, res) {
        const userId = req.session.user.userId;
        const userdetails = {};
        if (req.body.email !== undefined) userdetails.email = req.body.email;
        if (req.body.contact !== undefined) userdetails.contact = req.body.contact;
        if (req.body.password !== undefined) userdetails.password = req.body.password;
        User.editbyId(userId, userdetails, (err, result) => {
            if (err) return res.status(500).json({ error: 'Database error', details: err.message });
            req.flash("success", "Profile updated successfully");
            return res.redirect('/viewProfile');
        });
    },
    viewAll(req, res) {
        User.viewAll((err, users) => {
            if (err) return res.status(500).json({ error: 'Database error', details: err.message });
            return res.render('viewUsersAdmin', { users });
        });
    },
    banById(req, res) {
        const userId = req.params.id;
        User.banById(userId, (err, result) => {
            if (err) return res.status(500).json({ error: 'Database error', details: err.message });
            req.flash("success", "User banned successfully");
            return res.redirect('/adminViewUsers');
        });
    },
    editViewAdmin(req, res) {
        const userId = req.params.id;
        User.viewById(userId, (err, user) => {
            if (err) return res.status(500).json({ error: 'Database error', details: err.message });
            if (!user) return res.status(404).json({ error: 'User not found' });
            return res.render('editUserAdmin', { user });
        });
    },
    editbyIdAdmin(req, res) {
        const userId = req.params.id;
        const userdetails = {};
        console.log(req.body);

        if (req.body.user !== undefined) userdetails.user = req.body.user;
        if (req.body.email !== undefined) userdetails.email = req.body.email;
        if (req.body.contact !== undefined) userdetails.contact = req.body.contact;
        if (req.body.password !== undefined) userdetails.password = req.body.password;
        if (req.body.role !== undefined) userdetails.role = req.body.role;
        if (req.body.banned !== undefined) {
            let banned = req.body.banned;
            if (Array.isArray(banned)) banned = banned[banned.length - 1];
            userdetails.banned = banned === "1" ? 1 : 0;
        }

        User.editbyIdAdmin(userId, userdetails, (err, result) => {
            if (err) return res.status(500).json({ error: 'Database error', details: err.message });
            req.flash("success", "User profile updated successfully");
            return res.redirect('/adminViewUsers');
        });
    },
};

module.exports = UserController;