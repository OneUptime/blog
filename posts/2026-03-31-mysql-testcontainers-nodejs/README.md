# How to Use MySQL Testcontainers in Node.js

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MySQL, Testcontainers, Node.js, Integration Test

Description: Learn how to use the Testcontainers Node.js library to spin up a real MySQL Docker container for integration tests with automatic lifecycle management and schema setup.

---

## Why Testcontainers in Node.js

Testcontainers for Node.js starts and stops real Docker containers programmatically from within your test suite. For MySQL integration tests, this means every test run gets a clean, isolated database without any manual setup, shared state, or environment drift.

## Installation

```bash
npm install --save-dev @testcontainers/mysql mysql2
```

Requires Docker to be running on the machine or CI agent.

## Basic Setup with Mocha

```javascript
// test/integration/order.test.js
const { MySqlContainer } = require('@testcontainers/mysql');
const mysql = require('mysql2/promise');
const assert = require('node:assert/strict');

let container;
let connection;

before(async function () {
  this.timeout(60_000); // allow time for Docker pull

  container = await new MySqlContainer('mysql:8.0')
    .withDatabase('app_test')
    .withUsername('testuser')
    .withUserPassword('testpass')
    .start();

  connection = await mysql.createConnection({
    host:     container.getHost(),
    port:     container.getPort(),
    database: container.getDatabase(),
    user:     container.getUsername(),
    password: container.getUserPassword(),
  });

  // Create schema
  await connection.execute(`
    CREATE TABLE IF NOT EXISTS orders (
      id          BIGINT        NOT NULL AUTO_INCREMENT PRIMARY KEY,
      customer_id BIGINT        NOT NULL,
      total       DECIMAL(10,2) NOT NULL,
      status      VARCHAR(20)   NOT NULL DEFAULT 'PENDING',
      created_at  TIMESTAMP     NOT NULL DEFAULT CURRENT_TIMESTAMP
    ) ENGINE=InnoDB
  `);
});

beforeEach(async () => {
  await connection.execute('TRUNCATE TABLE orders');
});

after(async () => {
  await connection.end();
  await container.stop();
});
```

## Writing Tests

```javascript
describe('Order Repository', () => {
  it('inserts and retrieves an order', async () => {
    const [result] = await connection.execute(
      'INSERT INTO orders (customer_id, total, status) VALUES (?, ?, ?)',
      [1, 49.99, 'PENDING']
    );
    assert.ok(result.insertId > 0);

    const [rows] = await connection.execute(
      'SELECT * FROM orders WHERE id = ?',
      [result.insertId]
    );
    assert.equal(rows.length, 1);
    assert.equal(rows[0].status, 'PENDING');
  });

  it('updates order status', async () => {
    const [insert] = await connection.execute(
      'INSERT INTO orders (customer_id, total) VALUES (?, ?)',
      [2, 99.00]
    );
    await connection.execute(
      'UPDATE orders SET status = ? WHERE id = ?',
      ['COMPLETED', insert.insertId]
    );
    const [rows] = await connection.execute(
      'SELECT status FROM orders WHERE id = ?',
      [insert.insertId]
    );
    assert.equal(rows[0].status, 'COMPLETED');
  });
});
```

## Setup with Jest

```javascript
// jest.setup.js
const { MySqlContainer } = require('@testcontainers/mysql');
const mysql = require('mysql2/promise');

let container;
let connection;

beforeAll(async () => {
  container = await new MySqlContainer('mysql:8.0')
    .withDatabase('app_test')
    .withUsername('testuser')
    .withUserPassword('testpass')
    .start();

  global.__MYSQL_CONNECTION__ = await mysql.createConnection({
    host:     container.getHost(),
    port:     container.getPort(),
    database: container.getDatabase(),
    user:     container.getUsername(),
    password: container.getUserPassword(),
  });

  await global.__MYSQL_CONNECTION__.execute(`
    CREATE TABLE orders (
      id BIGINT NOT NULL AUTO_INCREMENT PRIMARY KEY,
      customer_id BIGINT NOT NULL,
      total DECIMAL(10,2) NOT NULL,
      status VARCHAR(20) NOT NULL DEFAULT 'PENDING'
    ) ENGINE=InnoDB
  `);
}, 60000);

afterAll(async () => {
  await global.__MYSQL_CONNECTION__.end();
  await container.stop();
});
```

```javascript
// jest.config.js
module.exports = {
  setupFilesAfterFramework: ['./jest.setup.js'],
  testTimeout: 30000
};
```

## Loading a SQL Schema File

```javascript
const fs   = require('node:fs');
const path = require('node:path');

const schema = fs.readFileSync(
  path.join(__dirname, '../db/schema.sql'),
  'utf8'
);
// Split on semicolons to run multiple statements
for (const statement of schema.split(';').filter(s => s.trim())) {
  await connection.execute(statement);
}
```

## Summary

Testcontainers for Node.js makes MySQL integration testing portable and self-contained. Start a real MySQL 8.0 container before your suite, run your schema migrations, and use `TRUNCATE` between tests to reset state. The container stops automatically after tests finish, leaving no residual state. This pattern works equally well with Mocha, Jest, or any other Node.js test runner.
