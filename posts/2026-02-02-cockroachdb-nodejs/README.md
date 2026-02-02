# How to Use CockroachDB with Node.js

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: CockroachDB, Node.js, Database, SQL, Distributed Database, PostgreSQL, Backend

Description: Learn how to integrate CockroachDB with Node.js applications. A comprehensive guide covering connection setup, CRUD operations, transactions, connection pooling, and best practices for building scalable distributed applications.

---

CockroachDB is a distributed SQL database designed for cloud-native applications that require horizontal scalability, strong consistency, and PostgreSQL compatibility. Node.js developers can leverage familiar PostgreSQL drivers and ORMs to work with CockroachDB, making it an excellent choice for building resilient, globally distributed applications.

## Why CockroachDB for Node.js Applications

CockroachDB offers several advantages for Node.js applications that need to scale beyond a single database instance:

- **PostgreSQL compatibility** - Use existing Node.js PostgreSQL libraries without modification
- **Automatic sharding** - Data distribution is handled transparently
- **Strong consistency** - Serializable isolation by default
- **Survivability** - Automatic failover without manual intervention
- **Geo-distribution** - Deploy data close to users globally

## Architecture Overview

The following diagram illustrates how a Node.js application connects to a CockroachDB cluster:

```mermaid
graph TB
    subgraph "Node.js Application"
        APP[Express/Fastify Server]
        POOL[Connection Pool]
        ORM[Sequelize/Knex/pg]
    end

    subgraph "CockroachDB Cluster"
        NODE1[Node 1<br/>Range Leader]
        NODE2[Node 2<br/>Replica]
        NODE3[Node 3<br/>Replica]
    end

    subgraph "Storage Layer"
        RAFT[Raft Consensus]
        RANGES[Distributed Ranges]
    end

    APP --> POOL
    POOL --> ORM
    ORM --> NODE1
    ORM --> NODE2
    ORM --> NODE3

    NODE1 <--> RAFT
    NODE2 <--> RAFT
    NODE3 <--> RAFT
    RAFT --> RANGES
```

## Setting Up CockroachDB

### Local Development with Docker

Running CockroachDB locally for development is straightforward using Docker. The following command starts a single-node cluster suitable for testing.

```bash
# Start a single-node CockroachDB cluster for development
docker run -d \
  --name cockroach \
  -p 26257:26257 \
  -p 8080:8080 \
  cockroachdb/cockroach:latest \
  start-single-node \
  --insecure

# Access the SQL shell
docker exec -it cockroach ./cockroach sql --insecure

# Create a database for your application
CREATE DATABASE myapp;
CREATE USER app_user WITH PASSWORD 'secure_password';
GRANT ALL ON DATABASE myapp TO app_user;
```

### Production Cluster Setup

For production, deploy a multi-node cluster. CockroachDB Cloud provides a managed option, or you can self-host on Kubernetes.

```bash
# Example: CockroachDB Cloud connection string
cockroachdb://username:password@free-tier.gcp-us-central1.cockroachlabs.cloud:26257/myapp?sslmode=verify-full
```

## Connecting Node.js to CockroachDB

### Using the pg Driver

The native `pg` driver works seamlessly with CockroachDB. Install the required dependency and configure connection pooling for optimal performance.

```bash
npm install pg
```

The connection configuration below establishes a pool of reusable connections. Connection pooling is critical for production applications to avoid the overhead of creating new connections for each query.

```javascript
const { Pool } = require('pg');

// Configure connection pool with CockroachDB-specific settings
const pool = new Pool({
  // Connection string format: postgresql://user:password@host:port/database
  connectionString: process.env.DATABASE_URL ||
    'postgresql://app_user:secure_password@localhost:26257/myapp',

  // SSL configuration for production
  ssl: process.env.NODE_ENV === 'production' ? {
    rejectUnauthorized: true,
    ca: process.env.COCKROACH_CA_CERT,
  } : false,

  // Pool configuration
  max: 20,                    // Maximum number of connections in the pool
  idleTimeoutMillis: 30000,   // Close idle connections after 30 seconds
  connectionTimeoutMillis: 10000, // Timeout when acquiring a connection
});

// Test the connection
async function testConnection() {
  const client = await pool.connect();
  try {
    const result = await client.query('SELECT version()');
    console.log('Connected to CockroachDB:', result.rows[0].version);
  } finally {
    client.release();
  }
}

testConnection().catch(console.error);

module.exports = pool;
```

### Using Sequelize ORM

Sequelize provides a higher-level abstraction for database operations. CockroachDB works with Sequelize's PostgreSQL dialect with a few configuration adjustments.

```bash
npm install sequelize pg pg-hstore
```

The Sequelize configuration includes retry logic to handle transient errors that can occur in distributed systems.

```javascript
const { Sequelize } = require('sequelize');

// Initialize Sequelize with CockroachDB
const sequelize = new Sequelize(process.env.DATABASE_URL, {
  dialect: 'postgres',
  dialectOptions: {
    ssl: process.env.NODE_ENV === 'production' ? {
      require: true,
      rejectUnauthorized: true,
    } : false,
  },

  // Connection pool settings
  pool: {
    max: 20,
    min: 5,
    acquire: 30000,
    idle: 10000,
  },

  // Logging configuration
  logging: process.env.NODE_ENV === 'development' ? console.log : false,

  // Retry configuration for transient errors
  retry: {
    max: 3,
    match: [
      /restart transaction/,
      /TransactionRetryWithProtoRefreshError/,
      /RETRY_SERIALIZABLE/,
    ],
  },
});

// Test connection
async function authenticate() {
  try {
    await sequelize.authenticate();
    console.log('Sequelize connected to CockroachDB');
  } catch (error) {
    console.error('Connection failed:', error);
    process.exit(1);
  }
}

authenticate();

module.exports = sequelize;
```

### Using Knex Query Builder

Knex offers a flexible query builder approach that many developers prefer for its SQL-like syntax.

```bash
npm install knex pg
```

The Knex configuration includes settings optimized for CockroachDB's distributed nature.

```javascript
const knex = require('knex');

const db = knex({
  client: 'pg',
  connection: {
    connectionString: process.env.DATABASE_URL,
    ssl: process.env.NODE_ENV === 'production' ? {
      rejectUnauthorized: true,
    } : false,
  },

  // Pool configuration
  pool: {
    min: 2,
    max: 20,
    createTimeoutMillis: 10000,
    acquireTimeoutMillis: 30000,
    idleTimeoutMillis: 30000,
    reapIntervalMillis: 1000,
    createRetryIntervalMillis: 100,
  },

  // Enable debug logging in development
  debug: process.env.NODE_ENV === 'development',
});

module.exports = db;
```

## Schema Design and Migrations

### Creating Tables

CockroachDB supports standard PostgreSQL DDL with additional features for distributed data. Primary keys should be designed to avoid hot spots in writes.

```javascript
const pool = require('./db');

// Create tables with CockroachDB best practices
async function createSchema() {
  const client = await pool.connect();

  try {
    // Users table with UUID primary key to distribute writes evenly
    await client.query(`
      CREATE TABLE IF NOT EXISTS users (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        email STRING UNIQUE NOT NULL,
        username STRING NOT NULL,
        password_hash STRING NOT NULL,
        created_at TIMESTAMPTZ DEFAULT now(),
        updated_at TIMESTAMPTZ DEFAULT now(),

        -- Create an index on email for fast lookups
        INDEX idx_users_email (email),
        INDEX idx_users_created_at (created_at DESC)
      )
    `);

    // Orders table with composite primary key for better distribution
    await client.query(`
      CREATE TABLE IF NOT EXISTS orders (
        id UUID DEFAULT gen_random_uuid(),
        user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        status STRING NOT NULL DEFAULT 'pending',
        total_amount DECIMAL(10, 2) NOT NULL,
        created_at TIMESTAMPTZ DEFAULT now(),

        -- Composite primary key distributes data by user_id
        PRIMARY KEY (user_id, id),

        -- Index for status queries
        INDEX idx_orders_status (status)
      )
    `);

    // Order items with interleaved storage for locality
    await client.query(`
      CREATE TABLE IF NOT EXISTS order_items (
        order_id UUID NOT NULL,
        user_id UUID NOT NULL,
        product_id UUID NOT NULL,
        quantity INT NOT NULL DEFAULT 1,
        unit_price DECIMAL(10, 2) NOT NULL,

        PRIMARY KEY (user_id, order_id, product_id),
        FOREIGN KEY (user_id, order_id) REFERENCES orders(user_id, id) ON DELETE CASCADE
      )
    `);

    console.log('Schema created successfully');
  } finally {
    client.release();
  }
}

createSchema().catch(console.error);
```

### Migrations with Knex

Managing schema changes through migrations ensures reproducible database states across environments.

```javascript
// migrations/20260202_create_users.js
exports.up = async function(knex) {
  // Enable UUID extension
  await knex.raw('CREATE EXTENSION IF NOT EXISTS "uuid-ossp"');

  // Create users table
  await knex.schema.createTable('users', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table.string('email').unique().notNullable();
    table.string('username').notNullable();
    table.string('password_hash').notNullable();
    table.timestamp('created_at').defaultTo(knex.fn.now());
    table.timestamp('updated_at').defaultTo(knex.fn.now());

    // Create indexes
    table.index('email');
    table.index('created_at');
  });
};

exports.down = async function(knex) {
  await knex.schema.dropTableIfExists('users');
};
```

## CRUD Operations

### Create Operations

Inserting data with proper error handling ensures your application gracefully handles constraint violations and network issues.

```javascript
const pool = require('./db');

// Insert a single user with parameterized query to prevent SQL injection
async function createUser(email, username, passwordHash) {
  const query = `
    INSERT INTO users (email, username, password_hash)
    VALUES ($1, $2, $3)
    RETURNING id, email, username, created_at
  `;

  try {
    const result = await pool.query(query, [email, username, passwordHash]);
    return result.rows[0];
  } catch (error) {
    // Handle unique constraint violation
    if (error.code === '23505') {
      throw new Error('Email already exists');
    }
    throw error;
  }
}

// Batch insert for better performance
async function createUsers(users) {
  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    const insertedUsers = [];
    for (const user of users) {
      const result = await client.query(
        `INSERT INTO users (email, username, password_hash)
         VALUES ($1, $2, $3)
         RETURNING id, email, username, created_at`,
        [user.email, user.username, user.passwordHash]
      );
      insertedUsers.push(result.rows[0]);
    }

    await client.query('COMMIT');
    return insertedUsers;
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}

module.exports = { createUser, createUsers };
```

### Read Operations

Querying data efficiently requires understanding CockroachDB's query optimizer and index usage.

```javascript
const pool = require('./db');

// Find user by ID with prepared statement
async function findUserById(id) {
  const query = `
    SELECT id, email, username, created_at, updated_at
    FROM users
    WHERE id = $1
  `;

  const result = await pool.query(query, [id]);
  return result.rows[0] || null;
}

// Find users with pagination using keyset pagination for better performance
async function findUsers({ lastId, limit = 20 }) {
  let query;
  let params;

  if (lastId) {
    // Keyset pagination is more efficient than OFFSET for large datasets
    query = `
      SELECT id, email, username, created_at
      FROM users
      WHERE id > $1
      ORDER BY id ASC
      LIMIT $2
    `;
    params = [lastId, limit];
  } else {
    query = `
      SELECT id, email, username, created_at
      FROM users
      ORDER BY id ASC
      LIMIT $1
    `;
    params = [limit];
  }

  const result = await pool.query(query, params);
  return {
    users: result.rows,
    nextCursor: result.rows.length === limit
      ? result.rows[result.rows.length - 1].id
      : null,
  };
}

// Search users with ILIKE for case-insensitive matching
async function searchUsers(searchTerm) {
  const query = `
    SELECT id, email, username, created_at
    FROM users
    WHERE email ILIKE $1 OR username ILIKE $1
    ORDER BY created_at DESC
    LIMIT 50
  `;

  const result = await pool.query(query, [`%${searchTerm}%`]);
  return result.rows;
}

module.exports = { findUserById, findUsers, searchUsers };
```

### Update Operations

Updates in CockroachDB follow PostgreSQL syntax with support for RETURNING clause and conditional updates.

```javascript
const pool = require('./db');

// Update user with optimistic locking using updated_at timestamp
async function updateUser(id, updates, expectedUpdatedAt) {
  const { username, email } = updates;

  const query = `
    UPDATE users
    SET
      username = COALESCE($2, username),
      email = COALESCE($3, email),
      updated_at = now()
    WHERE id = $1 AND updated_at = $4
    RETURNING id, email, username, updated_at
  `;

  const result = await pool.query(query, [id, username, email, expectedUpdatedAt]);

  if (result.rowCount === 0) {
    // Either user not found or concurrent modification
    const user = await pool.query('SELECT id FROM users WHERE id = $1', [id]);
    if (user.rows.length === 0) {
      throw new Error('User not found');
    }
    throw new Error('Concurrent modification detected');
  }

  return result.rows[0];
}

// Bulk update with WHERE clause
async function deactivateInactiveUsers(daysSinceLogin) {
  const query = `
    UPDATE users
    SET status = 'inactive', updated_at = now()
    WHERE last_login_at < now() - INTERVAL '1 day' * $1
      AND status = 'active'
    RETURNING id
  `;

  const result = await pool.query(query, [daysSinceLogin]);
  return result.rows.map(row => row.id);
}

module.exports = { updateUser, deactivateInactiveUsers };
```

### Delete Operations

Soft deletes are often preferred over hard deletes to maintain data integrity and support audit trails.

```javascript
const pool = require('./db');

// Soft delete - preferred for audit trails
async function softDeleteUser(id) {
  const query = `
    UPDATE users
    SET
      deleted_at = now(),
      email = CONCAT(email, '_deleted_', id::text)
    WHERE id = $1 AND deleted_at IS NULL
    RETURNING id
  `;

  const result = await pool.query(query, [id]);
  return result.rowCount > 0;
}

// Hard delete with cascade
async function hardDeleteUser(id) {
  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    // Delete related records first if not using ON DELETE CASCADE
    await client.query('DELETE FROM order_items WHERE user_id = $1', [id]);
    await client.query('DELETE FROM orders WHERE user_id = $1', [id]);

    const result = await client.query(
      'DELETE FROM users WHERE id = $1 RETURNING id',
      [id]
    );

    await client.query('COMMIT');
    return result.rowCount > 0;
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}

module.exports = { softDeleteUser, hardDeleteUser };
```

## Transaction Handling

CockroachDB uses serializable isolation by default, which can cause transaction retries. Your application must handle these retries properly.

### Transaction Retry Flow

```mermaid
sequenceDiagram
    participant App as Node.js App
    participant Pool as Connection Pool
    participant CRDB as CockroachDB

    App->>Pool: Get Connection
    Pool->>App: Connection

    loop Retry Loop (max 3)
        App->>CRDB: BEGIN
        CRDB-->>App: OK

        App->>CRDB: UPDATE accounts SET balance = balance - 100 WHERE id = 1
        CRDB-->>App: OK

        App->>CRDB: UPDATE accounts SET balance = balance + 100 WHERE id = 2

        alt No Conflict
            CRDB-->>App: OK
            App->>CRDB: COMMIT
            CRDB-->>App: OK
        else Serialization Conflict
            CRDB-->>App: RETRY_SERIALIZABLE Error
            App->>CRDB: ROLLBACK
            Note over App: Wait with exponential backoff
        end
    end

    App->>Pool: Release Connection
```

### Implementing Retry Logic

The retry wrapper function handles CockroachDB's serializable transaction errors automatically.

```javascript
const pool = require('./db');

// Retry wrapper for handling serializable transaction conflicts
async function executeWithRetry(operation, maxRetries = 3) {
  let lastError;

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    const client = await pool.connect();

    try {
      await client.query('BEGIN');

      // Execute the operation
      const result = await operation(client);

      await client.query('COMMIT');
      return result;
    } catch (error) {
      await client.query('ROLLBACK').catch(() => {});
      lastError = error;

      // Check if this is a retryable error
      const isRetryable =
        error.code === '40001' || // Serialization failure
        error.message.includes('restart transaction') ||
        error.message.includes('TransactionRetryWithProtoRefreshError');

      if (isRetryable && attempt < maxRetries) {
        // Exponential backoff with jitter
        const backoff = Math.min(1000 * Math.pow(2, attempt - 1), 5000);
        const jitter = Math.random() * 100;
        await new Promise(resolve => setTimeout(resolve, backoff + jitter));
        continue;
      }

      throw error;
    } finally {
      client.release();
    }
  }

  throw lastError;
}

// Money transfer with automatic retry
async function transferMoney(fromAccountId, toAccountId, amount) {
  return executeWithRetry(async (client) => {
    // Check source balance
    const sourceResult = await client.query(
      'SELECT balance FROM accounts WHERE id = $1 FOR UPDATE',
      [fromAccountId]
    );

    if (sourceResult.rows.length === 0) {
      throw new Error('Source account not found');
    }

    const sourceBalance = parseFloat(sourceResult.rows[0].balance);
    if (sourceBalance < amount) {
      throw new Error('Insufficient funds');
    }

    // Deduct from source
    await client.query(
      'UPDATE accounts SET balance = balance - $1 WHERE id = $2',
      [amount, fromAccountId]
    );

    // Add to destination
    await client.query(
      'UPDATE accounts SET balance = balance + $1 WHERE id = $2',
      [amount, toAccountId]
    );

    // Record the transaction
    await client.query(
      `INSERT INTO transactions (from_account_id, to_account_id, amount, type)
       VALUES ($1, $2, $3, 'transfer')`,
      [fromAccountId, toAccountId, amount]
    );

    return { success: true, amount };
  });
}

module.exports = { executeWithRetry, transferMoney };
```

### Savepoints for Partial Rollbacks

Savepoints allow you to rollback part of a transaction without aborting the entire operation.

```javascript
async function processOrderWithSavepoints(orderData) {
  return executeWithRetry(async (client) => {
    // Create order
    const orderResult = await client.query(
      `INSERT INTO orders (user_id, total_amount)
       VALUES ($1, $2)
       RETURNING id`,
      [orderData.userId, orderData.totalAmount]
    );
    const orderId = orderResult.rows[0].id;

    // Process each item with savepoint
    const processedItems = [];

    for (const item of orderData.items) {
      await client.query('SAVEPOINT item_processing');

      try {
        // Check inventory
        const inventoryResult = await client.query(
          'SELECT quantity FROM inventory WHERE product_id = $1 FOR UPDATE',
          [item.productId]
        );

        if (inventoryResult.rows[0]?.quantity < item.quantity) {
          // Not enough inventory, skip this item
          await client.query('ROLLBACK TO SAVEPOINT item_processing');
          continue;
        }

        // Deduct inventory
        await client.query(
          'UPDATE inventory SET quantity = quantity - $1 WHERE product_id = $2',
          [item.quantity, item.productId]
        );

        // Add order item
        await client.query(
          `INSERT INTO order_items (order_id, user_id, product_id, quantity, unit_price)
           VALUES ($1, $2, $3, $4, $5)`,
          [orderId, orderData.userId, item.productId, item.quantity, item.unitPrice]
        );

        await client.query('RELEASE SAVEPOINT item_processing');
        processedItems.push(item);
      } catch (error) {
        await client.query('ROLLBACK TO SAVEPOINT item_processing');
        console.error(`Failed to process item ${item.productId}:`, error.message);
      }
    }

    if (processedItems.length === 0) {
      throw new Error('No items could be processed');
    }

    return { orderId, processedItems };
  });
}
```

## Connection Pooling Best Practices

### Pool Configuration

Proper connection pool configuration is essential for handling production workloads efficiently.

```javascript
const { Pool } = require('pg');

// Production-ready pool configuration
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,

  // Pool sizing based on workload
  // Formula: max connections = (number of cores * 2) + effective_spindle_count
  max: parseInt(process.env.DB_POOL_MAX) || 20,
  min: parseInt(process.env.DB_POOL_MIN) || 5,

  // Connection lifecycle
  idleTimeoutMillis: 30000,        // Close idle connections after 30s
  connectionTimeoutMillis: 10000,  // Fail acquisition after 10s

  // Statement timeout to prevent runaway queries
  statement_timeout: 30000,

  // SSL for production
  ssl: process.env.NODE_ENV === 'production' ? {
    rejectUnauthorized: true,
    ca: process.env.COCKROACH_CA_CERT,
  } : false,
});

// Monitor pool health
pool.on('connect', (client) => {
  console.log('New client connected to pool');
});

pool.on('acquire', (client) => {
  console.log('Client acquired from pool');
});

pool.on('remove', (client) => {
  console.log('Client removed from pool');
});

pool.on('error', (error, client) => {
  console.error('Unexpected error on idle client:', error);
});

// Health check endpoint
async function checkPoolHealth() {
  const poolStatus = {
    totalConnections: pool.totalCount,
    idleConnections: pool.idleCount,
    waitingRequests: pool.waitingCount,
  };

  try {
    const start = Date.now();
    await pool.query('SELECT 1');
    poolStatus.latencyMs = Date.now() - start;
    poolStatus.healthy = true;
  } catch (error) {
    poolStatus.healthy = false;
    poolStatus.error = error.message;
  }

  return poolStatus;
}

module.exports = { pool, checkPoolHealth };
```

### Graceful Shutdown

Properly closing connections during shutdown prevents connection leaks and ensures in-flight queries complete.

```javascript
const pool = require('./db');

async function gracefulShutdown(signal) {
  console.log(`Received ${signal}, starting graceful shutdown`);

  // Stop accepting new requests
  server.close(() => {
    console.log('HTTP server closed');
  });

  // Wait for in-flight requests to complete (max 30 seconds)
  const shutdownTimeout = setTimeout(() => {
    console.error('Shutdown timeout, forcing exit');
    process.exit(1);
  }, 30000);

  try {
    // Drain the connection pool
    await pool.end();
    console.log('Database pool closed');

    clearTimeout(shutdownTimeout);
    process.exit(0);
  } catch (error) {
    console.error('Error during shutdown:', error);
    process.exit(1);
  }
}

process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));
```

## Building a Complete Express API

### Project Structure

```mermaid
graph TB
    subgraph "Application Layer"
        ROUTES[Routes]
        MIDDLEWARE[Middleware]
        CONTROLLERS[Controllers]
    end

    subgraph "Business Layer"
        SERVICES[Services]
        VALIDATORS[Validators]
    end

    subgraph "Data Layer"
        REPOS[Repositories]
        MODELS[Models]
        DB[Database Pool]
    end

    ROUTES --> MIDDLEWARE
    MIDDLEWARE --> CONTROLLERS
    CONTROLLERS --> SERVICES
    SERVICES --> VALIDATORS
    SERVICES --> REPOS
    REPOS --> MODELS
    REPOS --> DB
```

### Repository Pattern Implementation

A repository layer abstracts database operations and makes testing easier.

```javascript
// repositories/userRepository.js
const pool = require('../db');
const { executeWithRetry } = require('../utils/transactions');

class UserRepository {
  async findById(id) {
    const query = `
      SELECT id, email, username, created_at, updated_at
      FROM users
      WHERE id = $1 AND deleted_at IS NULL
    `;
    const result = await pool.query(query, [id]);
    return result.rows[0] || null;
  }

  async findByEmail(email) {
    const query = `
      SELECT id, email, username, password_hash, created_at
      FROM users
      WHERE email = $1 AND deleted_at IS NULL
    `;
    const result = await pool.query(query, [email]);
    return result.rows[0] || null;
  }

  async create(userData) {
    const { email, username, passwordHash } = userData;
    const query = `
      INSERT INTO users (email, username, password_hash)
      VALUES ($1, $2, $3)
      RETURNING id, email, username, created_at
    `;
    const result = await pool.query(query, [email, username, passwordHash]);
    return result.rows[0];
  }

  async update(id, updates) {
    const fields = [];
    const values = [id];
    let paramIndex = 2;

    if (updates.username) {
      fields.push(`username = $${paramIndex++}`);
      values.push(updates.username);
    }
    if (updates.email) {
      fields.push(`email = $${paramIndex++}`);
      values.push(updates.email);
    }

    if (fields.length === 0) {
      return this.findById(id);
    }

    fields.push('updated_at = now()');

    const query = `
      UPDATE users
      SET ${fields.join(', ')}
      WHERE id = $1 AND deleted_at IS NULL
      RETURNING id, email, username, updated_at
    `;

    const result = await pool.query(query, values);
    return result.rows[0] || null;
  }

  async delete(id) {
    const query = `
      UPDATE users
      SET deleted_at = now()
      WHERE id = $1 AND deleted_at IS NULL
      RETURNING id
    `;
    const result = await pool.query(query, [id]);
    return result.rowCount > 0;
  }

  async findWithOrders(userId) {
    const query = `
      SELECT
        u.id, u.email, u.username, u.created_at,
        json_agg(
          json_build_object(
            'id', o.id,
            'total_amount', o.total_amount,
            'status', o.status,
            'created_at', o.created_at
          ) ORDER BY o.created_at DESC
        ) FILTER (WHERE o.id IS NOT NULL) as orders
      FROM users u
      LEFT JOIN orders o ON u.id = o.user_id
      WHERE u.id = $1 AND u.deleted_at IS NULL
      GROUP BY u.id
    `;
    const result = await pool.query(query, [userId]);
    return result.rows[0] || null;
  }
}

module.exports = new UserRepository();
```

### Express Routes with Error Handling

Well-structured routes with proper error handling ensure a robust API.

```javascript
// routes/users.js
const express = require('express');
const router = express.Router();
const userRepository = require('../repositories/userRepository');
const { validateUser, validateUserUpdate } = require('../validators/userValidator');

// Get user by ID
router.get('/:id', async (req, res, next) => {
  try {
    const user = await userRepository.findById(req.params.id);

    if (!user) {
      return res.status(404).json({
        error: 'User not found',
        code: 'USER_NOT_FOUND',
      });
    }

    res.json({ data: user });
  } catch (error) {
    next(error);
  }
});

// Create user
router.post('/', async (req, res, next) => {
  try {
    const validation = validateUser(req.body);
    if (!validation.valid) {
      return res.status(400).json({
        error: 'Validation failed',
        details: validation.errors,
      });
    }

    const user = await userRepository.create({
      email: req.body.email,
      username: req.body.username,
      passwordHash: await hashPassword(req.body.password),
    });

    res.status(201).json({ data: user });
  } catch (error) {
    if (error.message === 'Email already exists') {
      return res.status(409).json({
        error: 'Email already in use',
        code: 'DUPLICATE_EMAIL',
      });
    }
    next(error);
  }
});

// Update user
router.patch('/:id', async (req, res, next) => {
  try {
    const validation = validateUserUpdate(req.body);
    if (!validation.valid) {
      return res.status(400).json({
        error: 'Validation failed',
        details: validation.errors,
      });
    }

    const user = await userRepository.update(req.params.id, req.body);

    if (!user) {
      return res.status(404).json({
        error: 'User not found',
        code: 'USER_NOT_FOUND',
      });
    }

    res.json({ data: user });
  } catch (error) {
    next(error);
  }
});

// Delete user
router.delete('/:id', async (req, res, next) => {
  try {
    const deleted = await userRepository.delete(req.params.id);

    if (!deleted) {
      return res.status(404).json({
        error: 'User not found',
        code: 'USER_NOT_FOUND',
      });
    }

    res.status(204).send();
  } catch (error) {
    next(error);
  }
});

// Get user with orders
router.get('/:id/orders', async (req, res, next) => {
  try {
    const userWithOrders = await userRepository.findWithOrders(req.params.id);

    if (!userWithOrders) {
      return res.status(404).json({
        error: 'User not found',
        code: 'USER_NOT_FOUND',
      });
    }

    res.json({ data: userWithOrders });
  } catch (error) {
    next(error);
  }
});

module.exports = router;
```

## Performance Optimization

### Index Strategy

Creating appropriate indexes dramatically improves query performance. Analyze your query patterns to determine optimal indexes.

```javascript
// Analyze and create indexes based on query patterns
async function optimizeIndexes() {
  const client = await pool.connect();

  try {
    // Check existing indexes
    const indexResult = await client.query(`
      SELECT indexname, indexdef
      FROM pg_indexes
      WHERE tablename = 'orders'
    `);
    console.log('Existing indexes:', indexResult.rows);

    // Create covering index for common query
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_orders_user_status_created
      ON orders (user_id, status, created_at DESC)
      STORING (total_amount)
    `);

    // Create partial index for active orders only
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_orders_pending
      ON orders (created_at DESC)
      WHERE status = 'pending'
    `);

    // Analyze index usage
    const usageResult = await client.query(`
      SELECT
        table_name,
        index_name,
        idx_scan as scans,
        idx_tup_read as tuples_read
      FROM pg_stat_user_indexes
      WHERE schemaname = 'public'
      ORDER BY idx_scan DESC
    `);
    console.log('Index usage statistics:', usageResult.rows);

  } finally {
    client.release();
  }
}
```

### Query Analysis

Use EXPLAIN ANALYZE to understand query execution plans and identify optimization opportunities.

```javascript
async function analyzeQuery(query, params) {
  const client = await pool.connect();

  try {
    // Get query plan
    const explainQuery = `EXPLAIN ANALYZE ${query}`;
    const result = await client.query(explainQuery, params);

    console.log('Query Plan:');
    result.rows.forEach(row => console.log(row['QUERY PLAN']));

    // Parse execution time
    const lastRow = result.rows[result.rows.length - 1]['QUERY PLAN'];
    const timeMatch = lastRow.match(/Execution Time: ([\d.]+) ms/);

    return {
      plan: result.rows.map(r => r['QUERY PLAN']),
      executionTimeMs: timeMatch ? parseFloat(timeMatch[1]) : null,
    };
  } finally {
    client.release();
  }
}

// Example usage
analyzeQuery(
  'SELECT * FROM orders WHERE user_id = $1 AND status = $2 ORDER BY created_at DESC LIMIT 10',
  ['user-123', 'pending']
);
```

### Batch Operations

Batch operations reduce round trips and improve throughput for bulk data processing.

```javascript
// Efficient batch insert using UNNEST
async function batchInsertOrders(orders) {
  const client = await pool.connect();

  try {
    // Prepare arrays for UNNEST
    const userIds = orders.map(o => o.userId);
    const amounts = orders.map(o => o.totalAmount);
    const statuses = orders.map(o => o.status || 'pending');

    const query = `
      INSERT INTO orders (user_id, total_amount, status)
      SELECT * FROM UNNEST($1::uuid[], $2::decimal[], $3::text[])
      RETURNING id, user_id, total_amount, status, created_at
    `;

    const result = await client.query(query, [userIds, amounts, statuses]);
    return result.rows;
  } finally {
    client.release();
  }
}

// Batch update with VALUES
async function batchUpdateOrderStatus(updates) {
  const client = await pool.connect();

  try {
    // updates: [{ id: 'uuid', status: 'shipped' }, ...]
    const ids = updates.map(u => u.id);
    const statuses = updates.map(u => u.status);

    const query = `
      UPDATE orders
      SET status = updates.status, updated_at = now()
      FROM (
        SELECT UNNEST($1::uuid[]) as id, UNNEST($2::text[]) as status
      ) as updates
      WHERE orders.id = updates.id
      RETURNING orders.id, orders.status
    `;

    const result = await client.query(query, [ids, statuses]);
    return result.rows;
  } finally {
    client.release();
  }
}
```

## Monitoring and Observability

### Health Check Implementation

A comprehensive health check endpoint provides visibility into database connectivity and performance.

```javascript
const pool = require('./db');

async function healthCheck() {
  const health = {
    status: 'healthy',
    timestamp: new Date().toISOString(),
    checks: {},
  };

  // Database connectivity check
  try {
    const start = Date.now();
    const result = await pool.query('SELECT 1 as check');
    health.checks.database = {
      status: 'up',
      latencyMs: Date.now() - start,
    };
  } catch (error) {
    health.status = 'unhealthy';
    health.checks.database = {
      status: 'down',
      error: error.message,
    };
  }

  // Pool health
  health.checks.connectionPool = {
    total: pool.totalCount,
    idle: pool.idleCount,
    waiting: pool.waitingCount,
  };

  // Check cluster health
  try {
    const clusterResult = await pool.query(`
      SELECT
        node_id,
        is_live,
        is_available
      FROM crdb_internal.gossip_liveness
    `);

    const liveNodes = clusterResult.rows.filter(n => n.is_live).length;
    const totalNodes = clusterResult.rows.length;

    health.checks.cluster = {
      status: liveNodes === totalNodes ? 'healthy' : 'degraded',
      liveNodes,
      totalNodes,
    };
  } catch (error) {
    health.checks.cluster = {
      status: 'unknown',
      error: error.message,
    };
  }

  return health;
}

// Express health endpoint
app.get('/health', async (req, res) => {
  const health = await healthCheck();
  const statusCode = health.status === 'healthy' ? 200 : 503;
  res.status(statusCode).json(health);
});
```

### Query Metrics Collection

Tracking query performance helps identify slow queries and optimization opportunities.

```javascript
const pool = require('./db');

// Metrics storage - in production, use Prometheus or similar
const queryMetrics = {
  totalQueries: 0,
  slowQueries: 0,
  errors: 0,
  latencyHistogram: {},
};

// Wrapper for instrumented queries
async function instrumentedQuery(text, params, options = {}) {
  const start = Date.now();
  const slowThresholdMs = options.slowThresholdMs || 100;

  try {
    const result = await pool.query(text, params);
    const duration = Date.now() - start;

    // Update metrics
    queryMetrics.totalQueries++;

    // Track latency distribution
    const bucket = Math.floor(duration / 10) * 10;
    queryMetrics.latencyHistogram[bucket] =
      (queryMetrics.latencyHistogram[bucket] || 0) + 1;

    // Log slow queries
    if (duration > slowThresholdMs) {
      queryMetrics.slowQueries++;
      console.warn('Slow query detected:', {
        query: text.substring(0, 100),
        durationMs: duration,
        rowCount: result.rowCount,
      });
    }

    return result;
  } catch (error) {
    queryMetrics.errors++;
    throw error;
  }
}

// Metrics endpoint
app.get('/metrics', (req, res) => {
  res.json({
    queries: {
      total: queryMetrics.totalQueries,
      slow: queryMetrics.slowQueries,
      errors: queryMetrics.errors,
    },
    latency: queryMetrics.latencyHistogram,
    pool: {
      total: pool.totalCount,
      idle: pool.idleCount,
      waiting: pool.waitingCount,
    },
  });
});
```

## Testing with CockroachDB

### Integration Test Setup

Integration tests ensure your database code works correctly with CockroachDB.

```javascript
// test/setup.js
const pool = require('../db');

async function setupTestDatabase() {
  const client = await pool.connect();

  try {
    // Create test schema
    await client.query('DROP SCHEMA IF EXISTS test CASCADE');
    await client.query('CREATE SCHEMA test');
    await client.query('SET search_path TO test');

    // Create tables
    await client.query(`
      CREATE TABLE test.users (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        email STRING UNIQUE NOT NULL,
        username STRING NOT NULL,
        password_hash STRING NOT NULL,
        created_at TIMESTAMPTZ DEFAULT now()
      )
    `);

    // Insert test data
    await client.query(`
      INSERT INTO test.users (id, email, username, password_hash)
      VALUES
        ('11111111-1111-1111-1111-111111111111', 'test1@example.com', 'testuser1', 'hash1'),
        ('22222222-2222-2222-2222-222222222222', 'test2@example.com', 'testuser2', 'hash2')
    `);

  } finally {
    client.release();
  }
}

async function teardownTestDatabase() {
  const client = await pool.connect();
  try {
    await client.query('DROP SCHEMA IF EXISTS test CASCADE');
  } finally {
    client.release();
  }
}

module.exports = { setupTestDatabase, teardownTestDatabase };
```

### Writing Integration Tests

Integration tests verify database operations work correctly end-to-end.

```javascript
// test/userRepository.test.js
const { setupTestDatabase, teardownTestDatabase } = require('./setup');
const userRepository = require('../repositories/userRepository');

describe('UserRepository', () => {
  beforeAll(async () => {
    await setupTestDatabase();
  });

  afterAll(async () => {
    await teardownTestDatabase();
  });

  describe('findById', () => {
    it('should return user when found', async () => {
      const user = await userRepository.findById('11111111-1111-1111-1111-111111111111');

      expect(user).toBeDefined();
      expect(user.email).toBe('test1@example.com');
      expect(user.username).toBe('testuser1');
    });

    it('should return null when not found', async () => {
      const user = await userRepository.findById('99999999-9999-9999-9999-999999999999');

      expect(user).toBeNull();
    });
  });

  describe('create', () => {
    it('should create user and return with id', async () => {
      const userData = {
        email: 'newuser@example.com',
        username: 'newuser',
        passwordHash: 'securehash',
      };

      const user = await userRepository.create(userData);

      expect(user.id).toBeDefined();
      expect(user.email).toBe(userData.email);
      expect(user.username).toBe(userData.username);
    });

    it('should throw on duplicate email', async () => {
      const userData = {
        email: 'test1@example.com', // Already exists
        username: 'duplicate',
        passwordHash: 'hash',
      };

      await expect(userRepository.create(userData))
        .rejects.toThrow('Email already exists');
    });
  });
});
```

## Summary

CockroachDB provides a powerful distributed SQL database that integrates seamlessly with Node.js applications through standard PostgreSQL drivers and ORMs. Key takeaways for building production-ready applications include:

| Aspect | Recommendation |
|--------|----------------|
| **Connection** | Use connection pooling with proper sizing |
| **Transactions** | Implement retry logic for serializable conflicts |
| **Schema** | Use UUIDs for primary keys to distribute writes |
| **Performance** | Create appropriate indexes, use batch operations |
| **Testing** | Write integration tests with isolated test schemas |
| **Monitoring** | Implement health checks and query metrics |

CockroachDB's PostgreSQL compatibility means you can leverage existing Node.js tools and patterns while gaining the benefits of a globally distributed, strongly consistent database. Start with a simple setup and incrementally add features like geo-distribution as your application scales.
