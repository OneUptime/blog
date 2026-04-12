# MongoDB vs MySQL: Document Store vs Relational Database

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MongoDB, MySQL, Comparison, Database, Architecture

Description: Compare MongoDB and MySQL across schema design, query language, scalability, and performance to choose the right database for your application.

---

MongoDB and MySQL represent two fundamentally different approaches to data storage. MongoDB stores data as flexible JSON-like documents, while MySQL stores data in fixed-schema relational tables. Choosing between them depends on your data model, consistency requirements, and scalability needs.

## Data Model

MongoDB stores documents:

```json
{
  "_id": "user123",
  "name": "Alice",
  "email": "alice@example.com",
  "addresses": [
    { "type": "home", "city": "New York" },
    { "type": "work", "city": "Brooklyn" }
  ],
  "preferences": { "theme": "dark", "notifications": true }
}
```

MySQL stores rows in normalized tables:

```sql
-- Users table
CREATE TABLE users (
  id INT PRIMARY KEY AUTO_INCREMENT,
  name VARCHAR(100),
  email VARCHAR(200) UNIQUE
);

-- Addresses table (separate for normalization)
CREATE TABLE addresses (
  id INT PRIMARY KEY AUTO_INCREMENT,
  user_id INT,
  type ENUM('home', 'work'),
  city VARCHAR(100),
  FOREIGN KEY (user_id) REFERENCES users(id)
);
```

## Query Language

MongoDB uses its own query language (MQL):

```javascript
// Find active users in New York
db.users.find({
  active: true,
  "addresses.city": "New York"
}, { name: 1, email: 1 })

// Aggregate: count by city
db.users.aggregate([
  { $unwind: "$addresses" },
  { $group: { _id: "$addresses.city", count: { $sum: 1 } } }
])
```

MySQL uses SQL:

```sql
-- Find active users in New York
SELECT u.name, u.email
FROM users u
JOIN addresses a ON a.user_id = u.id
WHERE u.active = 1 AND a.city = 'New York';

-- Count by city
SELECT a.city, COUNT(*) AS count
FROM users u
JOIN addresses a ON a.user_id = u.id
GROUP BY a.city;
```

## Schema Flexibility

MongoDB collections have no enforced schema by default. Adding a new field requires no migration:

```javascript
// Add a field to one document - no schema change needed
db.users.updateOne({ _id: "user123" }, { $set: { loyaltyPoints: 500 } })
```

MySQL requires an `ALTER TABLE` for new columns:

```sql
ALTER TABLE users ADD COLUMN loyalty_points INT DEFAULT 0;
```

## Transactions and ACID

Both databases support multi-document/multi-row ACID transactions, but with different defaults:

```javascript
// MongoDB multi-document transaction
const session = client.startSession();
session.startTransaction();
try {
  await db.accounts.updateOne({ _id: "A" }, { $inc: { balance: -100 } }, { session });
  await db.accounts.updateOne({ _id: "B" }, { $inc: { balance: 100 } }, { session });
  await session.commitTransaction();
} catch (e) {
  await session.abortTransaction();
}
```

```sql
-- MySQL transaction
START TRANSACTION;
UPDATE accounts SET balance = balance - 100 WHERE id = 'A';
UPDATE accounts SET balance = balance + 100 WHERE id = 'B';
COMMIT;
```

## Horizontal Scaling

MongoDB has native sharding built in, enabling horizontal scaling across many nodes without additional middleware. MySQL scales horizontally via ProxySQL or Vitess, which adds operational complexity.

## When to Choose MongoDB

- Variable or evolving document structures (user profiles, product catalogs, content)
- Hierarchical or nested data that maps poorly to relational tables
- High write throughput with schema evolution expected
- Flexible JSON APIs where the database shape should mirror the API shape

## When to Choose MySQL

- Complex relational data with many foreign key relationships
- Strong ACID requirements across many tables (financial transactions)
- Mature tooling for reporting, BI tools, and SQL familiarity in the team
- Data that is naturally tabular and normalized

## Summary

MongoDB excels at flexible document storage, hierarchical data, and horizontal scaling. MySQL excels at relational integrity, complex multi-table joins, and environments where SQL expertise is deep. Many modern architectures use both - MySQL for transactional data and MongoDB for catalog or user-preference data - choosing each based on the shape and access patterns of the data.
