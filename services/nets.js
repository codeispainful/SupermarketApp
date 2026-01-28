const axios = require("axios");
const Cart = require("../models/Cart");
const Supermarket = require("../models/Supermarket");
require('dotenv').config();

function getProductPrice(productId) {
  return new Promise((resolve, reject) => {
    Supermarket.getProductPriceById(productId, (err, result) => {
      if (err) return reject(err);
      // `result` may be an array of rows or a single object depending on model implementation
      let price;
      if (Array.isArray(result)) {
        price = result[0] ? result[0].price : undefined;
      } else if (result && typeof result === 'object') {
        price = result.price;
      }
      if (price === undefined || price === null) return reject(new Error('Product price not found'));
      resolve(Number(price));
    });
  });
}

function getUserCart(userId) {
  return new Promise((resolve, reject) => {
    Cart.getUserCart(userId, (err, cartItems) => {
      if (err) return reject(err);
      resolve(cartItems);
    });
  });
}

exports.generateQrCode = async (req, res) => {
  let cartTotal = 0;
  try {
    const userid = req.session.user.userId;

    if (!userid) {
      req.flash("error", "Please log in to proceed with payment.");
      return res.redirect("/login");
    }

    const cartItems = await getUserCart(userid);

    //calculates each item's total price (cost * qty) in parallel(more efficient)
    const prices = await Promise.all(
      cartItems.map(item =>
        getProductPrice(item.productId)
          .then(price => price * item.quantity)
      )
    );
    //sums promises
    cartTotal = prices.reduce((sum, v) => sum + v, 0);

  } catch (error) {
    console.error("Error calculating cart total:", error.message);
    req.flash("error", "Unable to calculate cart total. Please try again.");
    return res.redirect("/");
  }

  cartTotal = cartTotal.toFixed(2);
  console.log("SECURE CART TOTAL:", cartTotal);
  try {
    const requestBody = {
      txn_id: "sandbox_nets|m|8ff8e5b6-d43e-4786-8ac5-7accf8c5bd9b", // Default for testing
      amt_in_dollars: cartTotal,
      notify_mobile: 0,
    };

    const response = await axios.post(
      `https://sandbox.nets.openapipaas.com/api/v1/common/payments/nets-qr/request`,
      requestBody,
      {
        headers: {
          "api-key": process.env.API_KEY,
          "project-id": process.env.PROJECT_ID,
        },
      }
    );

    const getCourseInitIdParam = () => {
      try {
        require.resolve("./../course_init_id");
        const { courseInitId } = require("../course_init_id");
        console.log("Loaded courseInitId:", courseInitId);

        return courseInitId ? `${courseInitId}` : "";
      } catch (error) {
        return "";
      }
    };

    const qrData = response.data.result.data;
    console.log({ qrData });

    if (
      qrData.response_code === "00" &&
      qrData.txn_status === 1 &&
      qrData.qr_code
    ) {
      console.log("QR code generated successfully");

      // Store transaction retrieval reference for later use
      const txnRetrievalRef = qrData.txn_retrieval_ref;
      const courseInitId = getCourseInitIdParam();

      const webhookUrl = `https://sandbox.nets.openapipaas.com/api/v1/common/payments/nets/webhook?txn_retrieval_ref=${txnRetrievalRef}&course_init_id=${courseInitId}`;

      console.log("Transaction retrieval ref:" + txnRetrievalRef);
      console.log("courseInitId:" + courseInitId);
      console.log("webhookUrl:" + webhookUrl);

      
      // Render the QR code page with required data
      res.render("netsQr", {
        total: cartTotal,
        title: "Scan to Pay",
        qrCodeUrl: `data:image/png;base64,${qrData.qr_code}`,
        txnRetrievalRef: txnRetrievalRef,
        courseInitId: courseInitId,
        networkCode: qrData.network_status,
        timer: 300, // Timer in seconds
        webhookUrl: webhookUrl,
        fullNetsResponse: response.data,
        apiKey: process.env.API_KEY,
        projectId: process.env.PROJECT_ID,
      });
    } else {
      // Handle partial or failed responses
      let errorMsg = "An error occurred while generating the QR code.";
      if (qrData.network_status !== 0) {
        errorMsg =
          qrData.error_message || "Transaction failed. Please try again.";
      }
      res.render("netsQrFail", {
        title: "Error",
        responseCode: qrData.response_code || "N.A.",
        instructions: qrData.instruction || "",
        errorMsg: errorMsg,
      });
    }
  } catch (error) {
    console.error("Error in generateQrCode:", error.message);
    res.redirect("/nets-qr/fail");
  }
};
