# PostgreSQL vs MongoDB: SQL vs NoSQL Comparison

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: PostgreSQL, MongoDB, SQL, NoSQL, Database Comparison

Description: A comparison of PostgreSQL and MongoDB, covering use cases, features, and factors to consider when choosing between SQL and NoSQL databases.

---

PostgreSQL and MongoDB represent different database paradigms. This guide compares them to help you choose the right tool.

## Quick Comparison

| Feature | PostgreSQL | MongoDB |
|---------|------------|---------|
| Type | Relational (SQL) | Document (NoSQL) |
| Schema | Strict | Flexible |
| ACID | Full | Configurable |
| Joins | Native | $lookup (limited) |
| Scaling | Vertical + Read replicas | Horizontal (sharding) |
| JSON Support | JSONB | Native |

## Data Modeling

### PostgreSQL (Relational)

```sql
CREATE TABLE users (
    id SERIAL PRIMARY KEY,
    email VARCHAR(255) UNIQUE NOT NULL,
    name VARCHAR(100)
);

CREATE TABLE orders (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id),
    total DECIMAL(10,2),
    created_at TIMESTAMP DEFAULT NOW()
);

-- Query with JOIN
SELECT u.name, o.total
FROM users u
JOIN orders o ON o.user_id = u.id;
```

### MongoDB (Document)

```javascript
// Users collection
{
  _id: ObjectId("..."),
  email: "user@example.com",
  name: "John",
  orders: [
    { total: 99.99, created_at: ISODate("...") },
    { total: 149.99, created_at: ISODate("...") }
  ]
}

// Or separate collections with reference
{
  _id: ObjectId("..."),
  user_id: ObjectId("..."),
  total: 99.99
}
```

## When to Choose PostgreSQL

1. **Complex queries** - Multi-table joins, aggregations
2. **Data integrity** - Foreign keys, constraints
3. **ACID transactions** - Financial, critical data
4. **Relational data** - Clear relationships
5. **Reporting** - Complex analytics
6. **Existing SQL expertise**

## When to Choose MongoDB

1. **Flexible schema** - Evolving data structures
2. **Document storage** - Nested, hierarchical data
3. **Horizontal scaling** - Large-scale sharding
4. **Rapid development** - Quick iterations
5. **Unstructured data** - Logs, events, IoT
6. **Geographic distribution**

## PostgreSQL JSONB

PostgreSQL bridges the gap with JSONB:

```sql
CREATE TABLE events (
    id SERIAL PRIMARY KEY,
    data JSONB
);

-- Index JSONB
CREATE INDEX idx_events_data ON events USING GIN(data);

-- Query JSONB
SELECT * FROM events
WHERE data @> '{"type": "click"}';
```

## Performance Comparison

| Workload | PostgreSQL | MongoDB |
|----------|------------|---------|
| Complex JOINs | Excellent | Poor |
| Document reads | Good | Excellent |
| Write scaling | Limited | Excellent |
| Transactions | Excellent | Good |
| Aggregations | Excellent | Good |

## Conclusion

- **PostgreSQL**: Best for relational data, complex queries, and strong consistency
- **MongoDB**: Best for flexible schemas, horizontal scaling, and document-centric applications

Many modern applications use both - PostgreSQL for transactional data, MongoDB for logs/events.
