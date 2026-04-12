# How to Handle Database Transactions in API Endpoints with MySQL

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MySQL, Transaction, REST API, InnoDB, Data Integrity

Description: Learn how to correctly handle MySQL transactions in API endpoints to ensure data integrity, proper rollback on errors, and connection pool safety.

---

## Why Transactions Matter in APIs

API endpoints often need to perform multiple related database operations atomically. For example, creating an order should also deduct inventory and create a payment record. If any step fails, all changes must be rolled back. Without a transaction, partial writes leave your database in an inconsistent state.

## Basic Transaction Pattern in Node.js

The most important rule: always release the connection back to the pool, even on errors. Use a helper function to manage this:

```javascript
// src/db.js
const pool = require('./pool');

async function withTransaction(callback) {
  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();
    const result = await callback(connection);
    await connection.commit();
    return result;
  } catch (err) {
    await connection.rollback();
    throw err;
  } finally {
    connection.release();
  }
}

module.exports = { pool, withTransaction };
```

## Using the Transaction Helper

```javascript
// routes/orders.js
const { withTransaction } = require('../db');

router.post('/orders', async (req, res) => {
  const { user_id, items } = req.body;

  try {
    const order = await withTransaction(async (conn) => {
      // 1. Create the order header
      const [orderResult] = await conn.execute(
        'INSERT INTO orders (user_id, total, status) VALUES (?, ?, ?)',
        [user_id, 0, 'pending']
      );
      const orderId = orderResult.insertId;

      let total = 0;

      // 2. Insert order items and deduct inventory
      for (const item of items) {
        // Lock the product row to prevent race conditions
        const [products] = await conn.execute(
          'SELECT id, price, stock FROM products WHERE id = ? FOR UPDATE',
          [item.product_id]
        );

        if (products.length === 0) throw new Error(`Product ${item.product_id} not found`);
        const product = products[0];

        if (product.stock < item.quantity) {
          throw new Error(`Insufficient stock for product ${item.product_id}`);
        }

        await conn.execute(
          'INSERT INTO order_items (order_id, product_id, quantity, price) VALUES (?, ?, ?, ?)',
          [orderId, item.product_id, item.quantity, product.price]
        );

        await conn.execute(
          'UPDATE products SET stock = stock - ? WHERE id = ?',
          [item.quantity, item.product_id]
        );

        total += product.price * item.quantity;
      }

      // 3. Update the order total
      await conn.execute('UPDATE orders SET total = ? WHERE id = ?', [total, orderId]);

      return { id: orderId, user_id, total, status: 'pending' };
    });

    res.status(201).json(order);
  } catch (err) {
    if (err.message.includes('Insufficient stock') || err.message.includes('not found')) {
      return res.status(422).json({ error: err.message });
    }
    console.error(err);
    res.status(500).json({ error: 'Internal server error' });
  }
});
```

## Python Context Manager Pattern

```python
# Python Flask with SQLAlchemy
from contextlib import contextmanager
from app.database import db

@contextmanager
def transaction():
    try:
        yield db.session
        db.session.commit()
    except Exception:
        db.session.rollback()
        raise
    finally:
        db.session.close()

@orders_bp.post('/orders')
def create_order():
    data = request.get_json()
    try:
        with transaction() as session:
            order = Order(user_id=data['user_id'], total=0, status='pending')
            session.add(order)
            session.flush()  # Get order.id without committing

            total = 0
            for item in data['items']:
                product = session.query(Product).with_for_update().get(item['product_id'])
                if product.stock < item['quantity']:
                    raise ValueError(f"Insufficient stock for {product.id}")
                product.stock -= item['quantity']
                total += product.price * item['quantity']

            order.total = total
            order_data = order.to_dict()
        return jsonify(order_data), 201
    except ValueError as e:
        return jsonify({'error': str(e)}), 422
```

## Deadlock Retry in Transactions

```javascript
async function withTransactionRetry(callback, maxRetries = 3) {
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      return await withTransaction(callback);
    } catch (err) {
      if (err.code === 'ER_LOCK_DEADLOCK' && attempt < maxRetries) {
        await new Promise(r => setTimeout(r, 50 * attempt));
        continue;
      }
      throw err;
    }
  }
}
```

## Summary

Handling MySQL transactions in API endpoints requires acquiring a dedicated connection from the pool, beginning the transaction, and ensuring `ROLLBACK` is called on any error using try-catch-finally or a context manager. For concurrent writes, `SELECT ... FOR UPDATE` prevents race conditions by locking rows for the duration of the transaction. Always implement deadlock retry logic for multi-step transactions.
