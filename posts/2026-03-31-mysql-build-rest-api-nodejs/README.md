# How to Build a REST API with MySQL and Node.js

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MySQL, Node.js, REST API, Express, Backend

Description: Build a production-ready REST API using Node.js, Express, and MySQL with connection pooling, error handling, and proper SQL parameterization.

---

## Project Setup

Create a Node.js Express API backed by MySQL. This guide covers a CRUD API for an `orders` resource with proper connection pooling and security.

```bash
mkdir mysql-node-api && cd mysql-node-api
npm init -y
npm install express mysql2 dotenv
npm install --save-dev nodemon
```

## Project Structure

```text
mysql-node-api/
├── src/
│   ├── db.js
│   ├── routes/
│   │   └── orders.js
│   └── app.js
├── .env
└── package.json
```

## Database Connection Pool

```javascript
// src/db.js
const mysql = require('mysql2/promise');

const pool = mysql.createPool({
  host:             process.env.DB_HOST,
  port:             parseInt(process.env.DB_PORT || '3306'),
  user:             process.env.DB_USER,
  password:         process.env.DB_PASSWORD,
  database:         process.env.DB_NAME,
  connectionLimit:  20,
  waitForConnections: true,
  queueLimit:       50,
  timezone:         'Z',
});

module.exports = pool;
```

## Orders Route

```javascript
// src/routes/orders.js
const express = require('express');
const router = express.Router();
const pool = require('../db');

// GET /api/orders
router.get('/', async (req, res) => {
  try {
    const [rows] = await pool.query(
      'SELECT id, user_id, total, status, created_at FROM orders ORDER BY created_at DESC LIMIT 50'
    );
    res.json({ data: rows, count: rows.length });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /api/orders/:id
router.get('/:id', async (req, res) => {
  try {
    const [rows] = await pool.query(
      'SELECT * FROM orders WHERE id = ?',
      [req.params.id]
    );
    if (rows.length === 0) {
      return res.status(404).json({ error: 'Order not found' });
    }
    res.json(rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /api/orders
router.post('/', async (req, res) => {
  const { user_id, total } = req.body;
  if (!user_id || !total) {
    return res.status(400).json({ error: 'user_id and total are required' });
  }
  try {
    const [result] = await pool.query(
      'INSERT INTO orders (user_id, total, status) VALUES (?, ?, ?)',
      [user_id, total, 'pending']
    );
    res.status(201).json({ id: result.insertId, user_id, total, status: 'pending' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// PATCH /api/orders/:id/status
router.patch('/:id/status', async (req, res) => {
  const validStatuses = ['pending', 'processing', 'shipped', 'completed', 'cancelled'];
  const { status } = req.body;
  if (!validStatuses.includes(status)) {
    return res.status(400).json({ error: 'Invalid status' });
  }
  try {
    const [result] = await pool.query(
      'UPDATE orders SET status = ? WHERE id = ?',
      [status, req.params.id]
    );
    if (result.affectedRows === 0) {
      return res.status(404).json({ error: 'Order not found' });
    }
    res.json({ id: req.params.id, status });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;
```

## Express App

```javascript
// src/app.js
require('dotenv').config();
const express = require('express');
const app = express();

app.use(express.json());
app.use('/api/orders', require('./routes/orders'));

app.get('/health', async (req, res) => {
  const pool = require('./db');
  try {
    await pool.query('SELECT 1');
    res.json({ status: 'ok', database: 'connected' });
  } catch {
    res.status(503).json({ status: 'error', database: 'disconnected' });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
```

## Environment Configuration

```text
# .env
DB_HOST=localhost
DB_PORT=3306
DB_USER=app_user
DB_PASSWORD=app_password
DB_NAME=myapp
PORT=3000
```

## Summary

Building a REST API with Node.js and MySQL requires a connection pool (`mysql2/promise`) to manage database connections efficiently, parameterized queries to prevent SQL injection, and proper error handling that returns appropriate HTTP status codes. The `/health` endpoint checks database connectivity, making it easy to integrate with load balancers and monitoring tools.
