# MongoDB vs PostgreSQL: When to Use Which

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MongoDB, PostgreSQL, Database, Comparison, Architecture

Description: Compare MongoDB and PostgreSQL across schema flexibility, query capability, scaling, and use cases to help you choose the right database for your project.

---

## Overview

MongoDB and PostgreSQL are two of the most popular databases, but they solve different problems. MongoDB is a document database optimized for flexible schemas and horizontal scaling. PostgreSQL is a relational database that prioritizes data consistency, complex queries, and ACID guarantees.

## Schema Design

MongoDB uses a flexible document model. Each document in a collection can have different fields:

```javascript
// MongoDB - no schema enforcement by default
db.products.insertMany([
  { name: "Shirt", size: "M", color: "blue" },
  { name: "Laptop", ram: "16GB", storage: "512GB SSD" }
])
```

PostgreSQL enforces a rigid schema:

```sql
CREATE TABLE products (
  id SERIAL PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  category VARCHAR(100),
  price DECIMAL(10, 2)
);
```

## Query Capability

PostgreSQL excels at complex relational queries with joins:

```sql
SELECT o.id, c.name, SUM(oi.price) as total
FROM orders o
JOIN customers c ON o.customer_id = c.id
JOIN order_items oi ON oi.order_id = o.id
GROUP BY o.id, c.name
HAVING SUM(oi.price) > 100;
```

MongoDB handles nested document queries well but requires `$lookup` for joins:

```javascript
db.orders.aggregate([
  { $lookup: {
      from: "customers",
      localField: "customerId",
      foreignField: "_id",
      as: "customer"
  }},
  { $unwind: "$customer" },
  { $group: { _id: "$_id", customerName: { $first: "$customer.name" }, total: { $sum: "$items.price" } }}
])
```

## Scaling

MongoDB was designed for horizontal scaling. Sharding distributes data across multiple servers natively. PostgreSQL scales vertically and can use read replicas, but sharding requires tools like Citus.

## Transactions

Both support ACID multi-document transactions. MongoDB added multi-document transactions in version 4.0:

```javascript
const session = client.startSession();
session.startTransaction();
try {
  await accounts.updateOne({ _id: from }, { $inc: { balance: -amount } }, { session });
  await accounts.updateOne({ _id: to }, { $inc: { balance: amount } }, { session });
  await session.commitTransaction();
} catch (err) {
  await session.abortTransaction();
}
```

## When to Choose MongoDB

- Rapidly evolving data models or prototyping
- Storing hierarchical or nested data (e.g., product catalogs, user profiles)
- Applications requiring horizontal scaling at the data layer
- Event logging and time-series-like workloads

## When to Choose PostgreSQL

- Applications with complex relational data and frequent multi-table joins
- Financial systems requiring strong ACID guarantees and SQL compliance
- Existing team expertise with SQL and relational design
- Applications needing advanced features like full-text search, JSONB, or PostGIS

## Summary

MongoDB is best for flexible document storage, nested data structures, and applications that need to scale out. PostgreSQL is better suited for relational data, complex queries, and scenarios where data integrity and SQL compliance are paramount. Many organizations use both - MongoDB for user-facing applications and PostgreSQL for transactional and reporting systems.
