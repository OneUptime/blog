# How to Use MySQL as a Document Store

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MySQL, Document Store, JSON, NoSQL, X DevAPI

Description: Learn how to use MySQL as a document store to store and query schema-free JSON documents alongside traditional relational tables.

---

## What is the MySQL Document Store?

MySQL Document Store is a feature introduced in MySQL 5.7.12 that allows you to use MySQL as a NoSQL document database. You can store schema-free JSON documents in collections without defining a table schema upfront. Internally, each collection is an InnoDB table with a JSON column and auto-generated primary key, so you still benefit from ACID transactions, replication, and backup tools.

## Prerequisites

- MySQL 8.0+ (recommended) or MySQL 5.7.12+
- MySQL Shell installed
- X Plugin enabled (default in 8.0)

Connect with MySQL Shell using the X Protocol:

```bash
mysqlsh --uri mysqlx://root@127.0.0.1:33060/mydb
```

## Creating a Collection

In MySQL Shell JavaScript mode:

```javascript
\js
const schema = session.getSchema('mydb');
const products = schema.createCollection('products');
```

This creates an InnoDB table called `products` with two columns: `_id` (VARBINARY(32) primary key) and `doc` (JSON).

## Adding Documents

```javascript
products.add([
  { name: 'Widget A', price: 19.99, category: 'hardware', inStock: true },
  { name: 'Widget B', price: 34.50, category: 'hardware', inStock: false },
  { name: 'Gizmo Pro', price: 99.00, category: 'electronics', inStock: true }
]).execute();
```

Each document gets an auto-generated `_id` if one is not provided.

## Finding Documents

Find all in-stock products:

```javascript
const result = products.find('inStock = true').execute();
result.fetchAll().forEach(doc => console.log(doc));
```

Find by multiple conditions:

```javascript
const result = products.find('category = :cat AND price < :max')
  .bind('cat', 'hardware')
  .bind('max', 50)
  .fields(['name', 'price'])
  .execute();
```

## Modifying Documents

```javascript
products.modify('name = :name')
  .set('price', 22.99)
  .set('inStock', true)
  .bind('name', 'Widget B')
  .execute();
```

## Removing Documents

```javascript
products.remove('inStock = false').execute();
```

## Using SQL to Query Collections

Because collections are regular InnoDB tables, you can also query them with standard SQL:

```sql
SELECT doc->>'$.name' AS name, doc->>'$.price' AS price
FROM mydb.products
WHERE doc->>'$.category' = 'electronics';
```

## Creating Indexes on JSON Fields

Improve query performance by adding indexes on frequently queried JSON paths:

```javascript
products.createIndex('idx_category', {
  fields: [{ field: '$.category', type: 'TEXT(64)' }]
});
```

Or using SQL directly:

```sql
ALTER TABLE mydb.products
ADD INDEX idx_category ((CAST(doc->>'$.category' AS CHAR(64))));
```

## Listing Collections

```javascript
const collections = schema.getCollections();
collections.forEach(c => console.log(c.getName()));
```

## Summary

MySQL Document Store bridges relational and document-oriented data models in a single database engine. Collections give you the flexibility of schema-free JSON storage while retaining InnoDB's durability, transaction support, and operational tooling. Use the X DevAPI for document operations and fall back to SQL when you need complex joins or aggregations across collections.
