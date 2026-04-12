# How to Build a GraphQL API with MySQL and Node.js

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MySQL, GraphQL, Node.js, Apollo, Backend

Description: Build a GraphQL API backed by MySQL using Apollo Server and Node.js with resolvers, DataLoader for N+1 prevention, and parameterized queries.

---

## GraphQL with MySQL in Node.js

GraphQL provides a flexible alternative to REST for MySQL-backed APIs, allowing clients to request exactly the fields they need. Apollo Server paired with `mysql2` and DataLoader creates an efficient, production-ready GraphQL API.

```bash
mkdir graphql-mysql-api && cd graphql-mysql-api
npm init -y
npm install @apollo/server graphql mysql2 dataloader graphql-tag
npm install --save-dev nodemon
```

## Database Pool

```javascript
// src/db.js
const mysql = require('mysql2/promise');

module.exports = mysql.createPool({
  host:             process.env.DB_HOST,
  user:             process.env.DB_USER,
  password:         process.env.DB_PASSWORD,
  database:         process.env.DB_NAME,
  connectionLimit:  20,
  waitForConnections: true,
});
```

## GraphQL Schema

```javascript
// src/schema.js
const { gql } = require('graphql-tag');

module.exports = gql`
  type User {
    id:     Int!
    name:   String!
    email:  String!
    orders: [Order!]!
  }

  type Order {
    id:         Int!
    userId:     Int!
    total:      Float!
    status:     String!
    createdAt:  String!
    user:       User!
  }

  type Query {
    orders(status: String, limit: Int): [Order!]!
    order(id: Int!): Order
    users: [User!]!
  }

  type Mutation {
    createOrder(userId: Int!, total: Float!): Order!
    updateOrderStatus(id: Int!, status: String!): Order
  }
`;
```

## DataLoader for N+1 Prevention

Without DataLoader, fetching `user` for each order would issue one query per order. DataLoader batches these into a single IN query:

```javascript
// src/loaders.js
const DataLoader = require('dataloader');
const pool = require('./db');

function createUserLoader() {
  return new DataLoader(async (userIds) => {
    const placeholders = userIds.map(() => '?').join(',');
    const [rows] = await pool.query(
      `SELECT * FROM users WHERE id IN (${placeholders})`,
      userIds
    );
    const userMap = new Map(rows.map(u => [u.id, u]));
    return userIds.map(id => userMap.get(id) || null);
  });
}

module.exports = { createUserLoader };
```

## Resolvers

```javascript
// src/resolvers.js
const pool = require('./db');

const VALID_STATUSES = new Set(['pending', 'processing', 'shipped', 'completed', 'cancelled']);

module.exports = {
  Query: {
    orders: async (_, { status, limit = 50 }) => {
      if (status) {
        const [rows] = await pool.query(
          'SELECT * FROM orders WHERE status = ? ORDER BY created_at DESC LIMIT ?',
          [status, limit]
        );
        return rows;
      }
      const [rows] = await pool.query(
        'SELECT * FROM orders ORDER BY created_at DESC LIMIT ?',
        [limit]
      );
      return rows;
    },
    order: async (_, { id }) => {
      const [rows] = await pool.query('SELECT * FROM orders WHERE id = ?', [id]);
      return rows[0] || null;
    },
    users: async () => {
      const [rows] = await pool.query('SELECT * FROM users');
      return rows;
    },
  },

  Mutation: {
    createOrder: async (_, { userId, total }) => {
      const [result] = await pool.query(
        'INSERT INTO orders (user_id, total, status) VALUES (?, ?, ?)',
        [userId, total, 'pending']
      );
      const [rows] = await pool.query('SELECT * FROM orders WHERE id = ?', [result.insertId]);
      return rows[0];
    },
    updateOrderStatus: async (_, { id, status }) => {
      if (!VALID_STATUSES.has(status)) throw new Error('Invalid status');
      await pool.query('UPDATE orders SET status = ? WHERE id = ?', [status, id]);
      const [rows] = await pool.query('SELECT * FROM orders WHERE id = ?', [id]);
      return rows[0] || null;
    },
  },

  User: {
    orders: async (user) => {
      const [rows] = await pool.query(
        'SELECT * FROM orders WHERE user_id = ? ORDER BY created_at DESC',
        [user.id]
      );
      return rows;
    },
  },

  Order: {
    userId: (order) => order.user_id,
    createdAt: (order) => order.created_at,
    user: (order, _, { loaders }) => loaders.user.load(order.user_id),
  },
};
```

## Apollo Server Setup

```javascript
// src/index.js
const { ApolloServer } = require('@apollo/server');
const { startStandaloneServer } = require('@apollo/server/standalone');
const typeDefs = require('./schema');
const resolvers = require('./resolvers');
const { createUserLoader } = require('./loaders');

const server = new ApolloServer({ typeDefs, resolvers });

startStandaloneServer(server, {
  context: async () => ({
    loaders: {
      user: createUserLoader(),
    },
  }),
  listen: { port: 4000 },
}).then(({ url }) => console.log(`GraphQL server running at ${url}`));
```

## Summary

Building a GraphQL API with MySQL and Apollo Server requires a well-designed schema, resolvers that use parameterized queries to prevent SQL injection, and DataLoader to batch related queries and prevent the N+1 problem. Creating a new DataLoader instance per request context ensures data isolation between requests while maximizing batching efficiency.
