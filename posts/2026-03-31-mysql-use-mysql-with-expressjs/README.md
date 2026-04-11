# How to Use MySQL with Express.js

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MySQL, Express.js, Node.js

Description: Connect Express.js to MySQL using mysql2 connection pools, build CRUD API routes, and manage transactions with async/await patterns.

---

Express.js is the most widely used Node.js web framework. Pairing it with MySQL through the `mysql2` library gives you a fast, promise-based database layer with full support for transactions and prepared statements.

## Installing Dependencies

```bash
npm install express mysql2 dotenv
```

## Setting Up the Connection Pool

Create `src/db.js`:

```javascript
require('dotenv').config();
const mysql = require('mysql2/promise');

const pool = mysql.createPool({
  host:             process.env.DB_HOST     || 'localhost',
  port:             process.env.DB_PORT     || 3306,
  user:             process.env.DB_USER,
  password:         process.env.DB_PASSWORD,
  database:         process.env.DB_NAME,
  connectionLimit:  20,
  waitForConnections: true,
});

module.exports = pool;
```

## Environment Variables

```text
DB_HOST=127.0.0.1
DB_PORT=3306
DB_USER=app_user
DB_PASSWORD=strongpassword
DB_NAME=app_db
```

## Basic CRUD Routes

```javascript
const express = require('express');
const pool    = require('./db');
const router  = express.Router();

// GET all products
router.get('/products', async (req, res) => {
  const [rows] = await pool.query('SELECT * FROM products ORDER BY id DESC LIMIT 50');
  res.json(rows);
});

// GET single product
router.get('/products/:id', async (req, res) => {
  const [rows] = await pool.execute(
    'SELECT * FROM products WHERE id = ?',
    [req.params.id]
  );
  if (!rows.length) return res.status(404).json({ error: 'Not found' });
  res.json(rows[0]);
});

// POST create product
router.post('/products', async (req, res) => {
  const { name, price } = req.body;
  const [result] = await pool.execute(
    'INSERT INTO products (name, price) VALUES (?, ?)',
    [name, price]
  );
  res.status(201).json({ id: result.insertId });
});

module.exports = router;
```

## Handling Transactions

```javascript
async function transferStock(fromId, toId, quantity) {
  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();
    await conn.execute(
      'UPDATE products SET stock = stock - ? WHERE id = ?',
      [quantity, fromId]
    );
    await conn.execute(
      'UPDATE products SET stock = stock + ? WHERE id = ?',
      [quantity, toId]
    );
    await conn.commit();
  } catch (err) {
    await conn.rollback();
    throw err;
  } finally {
    conn.release();
  }
}
```

Always release connections in a `finally` block to prevent pool exhaustion.

## Global Error Handler

```javascript
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ error: 'Internal server error' });
});
```

## Summary

Express.js and MySQL work well together via `mysql2` pools. Use `pool.execute()` for parameterized queries, acquire explicit connections only when you need transactions, and always release them in `finally`. Keep database credentials in `.env` files and load them with `dotenv` before the pool is initialized.
