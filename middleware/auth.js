const jwt = require("jsonwebtoken");
const TOKEN_KEY = '4556hghgjjjfftdfgcjvjkhfgchgfvjh'

// const config = process.env;

const verifyToken = (req, res, next) => {
  const token =
    req.body.access_token || req.query.access_token || req.headers["x-access-token"];

  if (!token) {
    return res.status(403).send("A token is required for authentication");
  }
  try {
    const decoded = jwt.verify(token, TOKEN_KEY);
    req.user = decoded;
  } catch (err) {
    return res.status(401).send("Invalid Token");
  }
  return next();
};

module.exports = verifyToken;
