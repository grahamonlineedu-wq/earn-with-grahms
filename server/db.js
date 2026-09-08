// db.js
const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL || 'postgresql://localhost:5432/grahms_platform'
});

module.exports = {
  query: (text, params) => pool.query(text, params),
};

