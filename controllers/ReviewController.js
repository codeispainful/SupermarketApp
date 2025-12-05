const Review = require('../models/Review');

const ReviewController = {
    addReview(req, res) {
        const review = {
            userid: req.session.user.userId,
            productid: req.params.id,
            title: req.body.title,
            rating: req.body.rating,
            description: req.body.description,
            created_at: new Date()
        }
        Review.addReview(review, (error, result) => {
            if (error) {
                req.flash("error", "Failed to add review. Please try again.");
                res.redirect(`/productDetails/${req.params.id}`);
            } else {
                req.flash("success", "Review added successfully!");
                res.redirect(`/productDetails/${req.params.id}`);
            }
        });
    },

    deleteReviewAdmin(req, res) {
        const reviewId = req.params.id;
        Review.deleteById(reviewId, (error, result) => {
            if (error) {
                req.flash("error", "Failed to delete review. Please try again.");
                res.redirect('/adminReviews');
            } else {
                req.flash("success", "Review deleted successfully!");
                res.redirect('/adminReviews');
            }
        });
    },

    getReviewbyUserId(req, res) {
        const user = req.session.user;
        const userId = user.userId;
        const search = req.query.search || "";
        const sort   = req.query.sort || "desc";

        Review.getAllbyUserId(userId,search,sort, (err, reviews) => {
            if (err) return res.status(500).json({ error: 'Database error', details: err.message });
            return res.render('viewReviews', { reviews, user, search, sort });
        });
    },

    getAllReviewsAdmin(req, res) {
        const search = req.query.search || "";
        Review.getAllReviews(search,(err, reviews) => {
            if (err) return res.status(500).json({ error: 'Database error', details: err.message });
            return res.render('reviewsAdmin', { reviews});
        });
    },

};

module.exports = ReviewController;