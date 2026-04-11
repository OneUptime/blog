# How to Use MySQL with Knex.js Query Builder

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MySQL, Knex.js, Node.js, Query Builder, Migration

Description: Learn how to use Knex.js as a SQL query builder and migration tool with MySQL in Node.js, covering connection setup, queries, transactions, and schema migrations.

---

## Introduction

Knex.js is a SQL query builder for Node.js that sits between raw SQL and a full ORM. It provides a fluent JavaScript API for building MySQL queries, handling transactions, and managing schema migrations, while giving you full visibility into the SQL being generated.

## Installation

```bash
npm install knex mysql2
```

## Configuring the Connection

```javascript
const knex = require('knex')({
  client: 'mysql2',
  connection: {
    host: 'localhost',
    port: 3306,
    user: 'root',
    password: 'password',
    database: 'mydb',
    charset: 'utf8mb4',
  },
  pool: { min: 2, max: 10 },
  migrations: { directory: './migrations' },
});
```

## Basic Queries

```javascript
// Select
const products = await knex('products')
  .select('id', 'name', 'price', 'stock')
  .where('stock', '>', 0)
  .andWhere('price', '<=', 1000)
  .orderBy('price', 'asc')
  .limit(20)
  .offset(0);

// Insert
const [productId] = await knex('products').insert({
  name: 'Laptop',
  price: 999.99,
  stock: 50,
  category_id: 1,
  created_at: knex.fn.now(),
});

// Update
await knex('products').where('stock', 0).update({ active: false });

// Delete
await knex('products').where('price', '>', 50000).delete();
```

## Joins and Aggregations

```javascript
// JOIN
const results = await knex('products as p')
  .join('categories as c', 'p.category_id', 'c.id')
  .select('c.name as category', 'p.name', 'p.price')
  .where('p.stock', '>', 0)
  .orderBy('p.price');

// Aggregation
const stats = await knex('products')
  .select('category_id')
  .count('id as product_count')
  .sum('stock as total_stock')
  .avg('price as avg_price')
  .groupBy('category_id')
  .having('total_stock', '>', 0);
```

## Transactions

```javascript
await knex.transaction(async (trx) => {
  const [orderId] = await trx('orders').insert({
    customer_id: 42,
    total: 999.99,
    created_at: trx.fn.now(),
  });

  await trx('order_items').insert([
    { order_id: orderId, product_id: 1, quantity: 1, price: 999.99 },
  ]);

  await trx('products').where('id', 1).decrement('stock', 1);
});
```

## Schema Migrations

Create a migration file:

```bash
npx knex migrate:make create_products_table
```

```javascript
// migrations/20250101_create_products_table.js
exports.up = function (knex) {
  return knex.schema.createTable('products', (table) => {
    table.increments('id').primary();
    table.integer('category_id').unsigned().notNullable()
      .references('id').inTable('categories').onDelete('CASCADE');
    table.string('name', 200).notNullable();
    table.decimal('price', 10, 2).notNullable();
    table.integer('stock').defaultTo(0);
    table.boolean('active').defaultTo(true);
    table.timestamp('created_at').defaultTo(knex.fn.now());
    table.index(['category_id', 'price']);
  });
};

exports.down = function (knex) {
  return knex.schema.dropTableIfExists('products');
};
```

```bash
npx knex migrate:latest
npx knex migrate:rollback
```

## Raw SQL When Needed

```javascript
const [rows] = await knex.raw(
  'SELECT * FROM products WHERE MATCH(name) AGAINST(? IN BOOLEAN MODE)',
  ['laptop*']
);
```

## Summary

Knex.js provides a fluent query builder API that generates MySQL-compatible SQL while keeping you in control of the query structure. Use it when you want more visibility than an ORM provides but more convenience than raw SQL. Combine Knex migrations for schema management, the transaction API for atomic operations, and `knex.raw()` for MySQL-specific syntax like full-text search.
