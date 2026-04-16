const jwt    = require('jsonwebtoken');
const crypto = require('crypto');

const JWT_SECRET         = process.env.JWT_SECRET;
const JWT_REFRESH_SECRET = process.env.JWT_REFRESH_SECRET;

if (!JWT_SECRET || !JWT_REFRESH_SECRET) {
  console.error('FATAL: JWT_SECRET and JWT_REFRESH_SECRET must be set in .env');
  process.exit(1);
}

const generateTokenPair = (userId) => ({
  accessToken:  jwt.sign({ userId }, JWT_SECRET, { expiresIn: '15m' }),
  refreshToken: crypto.randomBytes(40).toString('hex')
});

module.exports = { JWT_SECRET, JWT_REFRESH_SECRET, generateTokenPair };
