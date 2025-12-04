const db = require('../db');
const Review = {
    addReview(review, callback) {
        const sql = 'INSERT INTO reviews (userid, productid, title, rating, description, created_at) VALUES (?, ?, ?, ?, ?, ?)';
        db.query(sql, [review.userid, review.productid, review.title, review.rating, review.description, review.created_at], callback);
    },
    reviewChecker(productId, userId, callback) {
        const sql = 'SELECT * FROM reviews WHERE productid = ? AND userid = ?';
        db.query(sql, [productId, userId], (err, results) => {
            if (err) return callback(err);

            if (results.length > 0) {
                return callback(null, true);
            } else {
                return callback(null, false);
            }
        });
    },
    getAllbyProductId(productId, rating, sort, callback) {
        let sql = `
            SELECT r.reviewid, r.userid, r.productid, r.title, r.rating, r.description, r.created_at, u.username
            FROM reviews r
            JOIN users u ON r.userid = u.userId
            WHERE r.productid = ?
        `;

        const params = [productId];

        // Filter by rating
        if (rating && rating !== 'all') {
            sql += ' AND r.rating = ?';
            params.push(rating);
        }

        // Sort
        if (sort === 'oldest') {
            sql += ' ORDER BY r.created_at ASC';
        } else {
            sql += ' ORDER BY r.created_at DESC'; // default newest
        }

        db.query(sql, params, callback);
    },
    getAllbyUserId(userId, search, sort, callback) {
        const sql = `
            SELECT r.reviewid, r.userid, r.productid, r.title, r.rating, r.description, r.created_at, 
            p.productName AS product_name
            FROM reviews r
            JOIN products p ON r.productid = p.productId
            WHERE r.userid = ?
            AND p.productName LIKE ?
            ORDER BY r.created_at ${sort === 'asc' ? 'ASC' : 'DESC'}
        `;
        db.query(sql, [userId, `%${search}%`], callback);
    },

    deleteById(reviewId, callback) {
        const sql = 'DELETE FROM reviews WHERE reviewid = ?';
        db.query(sql, [reviewId], callback);
    },

    getById(reviewId, callback) {
        const sql = `
            SELECT r.reviewid, r.userid, r.productid, r.title, r.rating, r.description, r.created_at, p.productName AS product_name
            FROM reviews r
            JOIN products p ON r.productid = p.productId
            WHERE r.reviewid = ?
        `;
        db.query(sql, [reviewId], callback);
    },

    editById(reviewId, reviewDetails, callback) {
        const sql = 'UPDATE reviews SET title = ?, rating = ?, description = ? WHERE reviewid = ?';
        const params = [
            reviewDetails.title,
            reviewDetails.rating,
            reviewDetails.description,
            reviewId
        ];
        db.query(sql, params, callback);
    },

    deleteById(reviewId, callback) {
        const sql = 'DELETE FROM reviews WHERE reviewid = ?';
        db.query(sql, [reviewId], callback);
    },

    getAllAvgRating(callback) {
        const sql = 'SELECT AVG(rating) AS avgRating, productid FROM reviews GROUP BY productid';
        db.query(sql, callback);
    },

    getAllReviews(search, callback) {
    let sql = `
        SELECT 
        r.*, 
        u.username AS username,
        p.productName AS productName
        FROM reviews r
        LEFT JOIN users u ON r.userid = u.userid
        LEFT JOIN products p ON r.productid = p.productId
    `;

    let params = [];

    if (search) {
        sql += " WHERE r.reviewid LIKE ?";
        params.push(`%${search}%`);
    }

    db.query(sql, params, callback);
    }
};

module.exports = Review;