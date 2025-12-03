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
    deleteReview(req, res) {
        const reviewId = req.params.id;
        Review.deleteById(reviewId, (error, result) => {
            if (error) {
                req.flash("error", "Failed to delete review. Please try again.");
                res.redirect('/myReviews');
            } else {
                req.flash("success", "Review deleted successfully!");
                res.redirect('/myReviews');
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

    getEditReview(req, res) {
        const user = req.session.user;
        const reviewId = user.userId;
        Review.getById(reviewId, (err, results) => {
            if(err) return res.status(500).send('Database error');
            if(!results) return res.status(404).send('Review not found');
            review = results[0];
            res.render('editReview', { review, user });
        });
    },

    editReviewById(req, res) {
        const reviewId = req.params.id;
        const reviewDetails = {};
        if (req.body.title !== undefined) reviewDetails.title = req.body.title;
        if (req.body.rating !== undefined) reviewDetails.rating = req.body.rating;
        if (req.body.description !== undefined) reviewDetails.description = req.body.description;
        Review.editById(reviewId, reviewDetails, (err, result) => {
            if (err) return res.status(500).json({ error: 'Database error', details: err.message });
            req.flash("success", "Review updated successfully");
            return res.redirect('/myReviews');
        });
    }
}

module.exports = ReviewController;