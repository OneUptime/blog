# How to Configure MySQL Connector/Node.js

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MySQL, Node.js, Connector, Configuration, Connection Pool

Description: Learn how to install, configure, and optimize MySQL Connector/Node.js for reliable database connections in your Node.js applications.

---

## Overview

MySQL Connector/Node.js is the official MySQL driver for Node.js applications. It uses the X DevAPI over the X Protocol, while the popular `mysql2` package uses the classic MySQL protocol. Understanding which driver fits your use case helps you build efficient database integrations.

## Installing the Driver

The two most common choices are the official `@mysql/xdevapi` connector and the widely-used `mysql2` package:

```bash
# Official X DevAPI connector
npm install @mysql/xdevapi

# Classic protocol driver (most widely used)
npm install mysql2
```

For most production applications, `mysql2` with the classic protocol is recommended due to broader compatibility and mature connection pooling support.

## Basic Connection Configuration

Configure a simple connection with `mysql2`:

```javascript
const mysql = require('mysql2');

const connection = mysql.createConnection({
  host: 'localhost',
  port: 3306,
  user: 'app_user',
  password: 'secure_password',
  database: 'myapp',
  charset: 'utf8mb4',
  timezone: '+00:00',
  connectTimeout: 10000
});

connection.connect((err) => {
  if (err) {
    console.error('Connection failed:', err.message);
    return;
  }
  console.log('Connected to MySQL');
});
```

## Setting Up a Connection Pool

For production workloads, always use a connection pool to avoid the overhead of creating a new connection per query:

```javascript
const mysql = require('mysql2');

const pool = mysql.createPool({
  host: 'localhost',
  port: 3306,
  user: 'app_user',
  password: 'secure_password',
  database: 'myapp',
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
  enableKeepAlive: true,
  keepAliveInitialDelay: 0
});

const promisePool = pool.promise();

async function getUser(id) {
  const [rows] = await promisePool.execute(
    'SELECT id, name, email FROM users WHERE id = ?',
    [id]
  );
  return rows[0];
}
```

## Configuring SSL for Secure Connections

When connecting to a remote MySQL server, enable SSL to encrypt traffic:

```javascript
const fs = require('fs');
const mysql = require('mysql2');

const pool = mysql.createPool({
  host: 'db.example.com',
  user: 'app_user',
  password: 'secure_password',
  database: 'myapp',
  ssl: {
    ca: fs.readFileSync('/path/to/ca-cert.pem'),
    cert: fs.readFileSync('/path/to/client-cert.pem'),
    key: fs.readFileSync('/path/to/client-key.pem'),
    rejectUnauthorized: true
  }
});
```

## Configuring Timeouts and Reconnect Behavior

Tune timeout settings to handle transient network issues:

```javascript
const pool = mysql.createPool({
  host: 'localhost',
  user: 'app_user',
  password: 'secure_password',
  database: 'myapp',
  connectTimeout: 10000,
  // Keep connections alive
  enableKeepAlive: true,
  keepAliveInitialDelay: 10000
});

// Handle disconnects gracefully
pool.on('connection', (connection) => {
  connection.on('error', (err) => {
    if (err.code === 'PROTOCOL_CONNECTION_LOST') {
      console.error('Database connection lost, pool will reconnect');
    }
  });
});
```

## Using Environment Variables for Configuration

Never hardcode credentials. Use environment variables:

```javascript
require('dotenv').config();
const mysql = require('mysql2');

const pool = mysql.createPool({
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT) || 3306,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  connectionLimit: parseInt(process.env.DB_POOL_SIZE) || 10
});
```

Install the `dotenv` package to load variables from a `.env` file:

```bash
npm install dotenv
```

Store your configuration in a `.env` file (never commit this to version control):

```text
DB_HOST=localhost
DB_PORT=3306
DB_USER=app_user
DB_PASSWORD=secure_password
DB_NAME=myapp
DB_POOL_SIZE=10
```

## Summary

MySQL Connector/Node.js with the `mysql2` package provides a robust foundation for database connectivity. Key configuration points include using connection pools with an appropriate `connectionLimit` for your workload, enabling SSL for remote connections, setting sensible timeouts, and loading credentials from environment variables. With promise-based APIs, you can write clean async/await code that integrates smoothly into modern Node.js applications.
