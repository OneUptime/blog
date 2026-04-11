# How to Implement Read-Write Splitting in Application Code for MySQL

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MySQL, Replication, Read-Write Split, Connection Pool, Performance

Description: Learn how to implement read-write splitting in application code for MySQL to distribute read traffic to replicas and reduce load on the primary server.

---

## Why Read-Write Splitting?

In a MySQL primary-replica setup, only the primary accepts writes, but all replicas can serve reads. Directing read queries to replicas reduces load on the primary and increases overall read throughput. Implementing this in application code gives you fine-grained control without requiring an external proxy.

## Setting Up Two Connection Pools

Create one connection pool pointing to the primary and another pointing to a replica (or a load balancer in front of multiple replicas).

```javascript
const mysql = require('mysql2/promise');

const primaryPool = mysql.createPool({
  host: process.env.MYSQL_PRIMARY_HOST,
  user: process.env.MYSQL_USER,
  password: process.env.MYSQL_PASSWORD,
  database: process.env.MYSQL_DATABASE,
  connectionLimit: 10,
});

const replicaPool = mysql.createPool({
  host: process.env.MYSQL_REPLICA_HOST,
  user: process.env.MYSQL_USER,
  password: process.env.MYSQL_PASSWORD,
  database: process.env.MYSQL_DATABASE,
  connectionLimit: 20,
});
```

Give the replica pool a larger `connectionLimit` because it handles more concurrent queries.

## A Router Function

Encapsulate the routing logic so the rest of the application does not need to decide which pool to use:

```javascript
function getConnection(readOnly = false) {
  return readOnly ? replicaPool.getConnection() : primaryPool.getConnection();
}

async function query(sql, params, readOnly = false) {
  const conn = await getConnection(readOnly);
  try {
    const [rows] = await conn.execute(sql, params);
    return rows;
  } finally {
    conn.release();
  }
}
```

Usage in application code:

```javascript
// Write - goes to primary
await query('INSERT INTO orders (user_id, total) VALUES (?, ?)', [userId, total]);

// Read - goes to replica
const orders = await query(
  'SELECT * FROM orders WHERE user_id = ?',
  [userId],
  true  // readOnly flag
);
```

## Handling Replication Lag

Replicas are asynchronous and may lag behind the primary. After a write, reads that must reflect the new data should go to the primary:

```javascript
async function createOrder(userId, total) {
  // Write to primary
  await query('INSERT INTO orders (user_id, total) VALUES (?, ?)', [userId, total]);

  // Immediately read the new row from primary to avoid lag
  const [order] = await query(
    'SELECT * FROM orders WHERE user_id = ? ORDER BY id DESC LIMIT 1',
    [userId],
    false  // force primary
  );
  return order;
}
```

Alternatively, use `SELECT SOURCE_POS_WAIT()` to block until a replica catches up to a known binlog position. (In MySQL versions before 8.0.26, this function was called `MASTER_POS_WAIT()`.)

## Transaction Pinning

All statements inside a transaction must run on the primary because the replica may not have committed the preceding writes yet:

```javascript
async function transferFunds(fromId, toId, amount) {
  const conn = await primaryPool.getConnection();
  await conn.beginTransaction();
  try {
    await conn.execute('UPDATE accounts SET balance = balance - ? WHERE id = ?', [amount, fromId]);
    await conn.execute('UPDATE accounts SET balance = balance + ? WHERE id = ?', [amount, toId]);
    await conn.commit();
  } catch (err) {
    await conn.rollback();
    throw err;
  } finally {
    conn.release();
  }
}
```

## Health Checks and Failover

Monitor replica health and fall back to the primary if the replica is unavailable:

```javascript
async function safeReplicaQuery(sql, params) {
  try {
    return await query(sql, params, true);
  } catch (err) {
    console.warn('Replica unavailable, falling back to primary:', err.message);
    return await query(sql, params, false);
  }
}
```

## Summary

Read-write splitting in application code routes writes to the MySQL primary and reads to replicas using two separate connection pools and a routing function. Always send transactions and lag-sensitive reads to the primary. Use a fallback strategy to handle replica failures. This pattern scales read throughput significantly on read-heavy workloads without requiring middleware like ProxySQL.
