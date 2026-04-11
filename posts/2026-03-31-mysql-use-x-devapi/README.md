# How to Use MySQL X DevAPI

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MySQL, X DevAPI, Developer, Protocol, CRUD

Description: Learn how to use the MySQL X DevAPI to perform CRUD operations on both relational tables and JSON document collections using a modern developer API.

---

## What is the MySQL X DevAPI?

The MySQL X DevAPI is a modern, object-oriented API for interacting with MySQL 8.0+ that works over the X Protocol (port 33060 by default). Unlike the traditional SQL API, X DevAPI supports both relational (SQL table) access and NoSQL-style document store access through a unified interface. It is available for multiple languages including JavaScript (Node.js), Python, Java, C#, C++, and PHP.

## Enabling the X Plugin

The X Plugin is enabled by default in MySQL 8.0. Verify it is active:

```sql
SHOW PLUGINS WHERE Name = 'mysqlx';
```

The status should be `ACTIVE`. If not, enable it:

```sql
INSTALL PLUGIN mysqlx SONAME 'mysqlx.so';
```

## Connecting with MySQL Shell

MySQL Shell supports X DevAPI natively:

```bash
mysqlsh --uri mysqlx://root@127.0.0.1:33060
```

Once connected, switch to JavaScript mode:

```javascript
\js
```

## Creating a Session in JavaScript

```javascript
const mysqlx = require('@mysql/xdevapi');

const session = await mysqlx.getSession({
  host: '127.0.0.1',
  port: 33060,
  user: 'root',
  password: 'secret'
});
```

## Working with Schemas

```javascript
// List all schemas
const schemas = await session.getSchemas();
schemas.forEach(s => console.log(s.getName()));

// Get a specific schema
const schema = session.getSchema('mydb');
```

## CRUD on Relational Tables

X DevAPI exposes SQL tables through a CRUD interface:

```javascript
const table = schema.getTable('orders');

// SELECT
const rows = await table.select(['id', 'customer_id', 'status'])
  .where('status = :status')
  .bind('status', 'pending')
  .execute();

rows.fetchAll().forEach(row => console.log(row));

// INSERT
await table.insert(['customer_id', 'status', 'total'])
  .values([42, 'pending', 99.99])
  .execute();

// UPDATE
await table.update()
  .set('status', 'shipped')
  .where('id = :id')
  .bind('id', 1001)
  .execute();

// DELETE
await table.delete()
  .where('status = :status AND created_at < :dt')
  .bind('status', 'cancelled')
  .bind('dt', '2024-01-01')
  .execute();
```

## Working with Document Collections

```javascript
const collection = await schema.createCollection('products', { reuseExisting: true });

// Add a document
await collection.add({ sku: 'ABC-001', name: 'Widget', price: 19.99, tags: ['sale'] }).execute();

// Find documents
const docs = await collection.find('price > :minPrice')
  .bind('minPrice', 10)
  .fields(['sku', 'name', 'price'])
  .execute();

docs.fetchAll().forEach(doc => console.log(doc));
```

## Closing the Session

```javascript
await session.close();
```

## Summary

The MySQL X DevAPI provides a modern, fluent interface for both SQL table operations and document store interactions over the X Protocol. It reduces boilerplate compared to raw SQL string construction, supports method chaining, and works across multiple programming languages. Start with MySQL Shell to explore the API interactively before integrating it into application code.
