# How to Scale MySQL with Horizontal Sharding

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MySQL, Sharding, Scaling, Architecture, Partition

Description: Learn how to scale MySQL beyond a single server using horizontal sharding to distribute data across multiple database instances by shard key.

---

## What Is Horizontal Sharding?

Horizontal sharding splits a single large table across multiple MySQL instances called shards. Each shard holds a subset of rows, and a shard key (such as user ID or tenant ID) determines which shard stores a given row. Unlike vertical scaling (bigger hardware), sharding scales MySQL linearly by adding more servers.

Sharding is typically introduced when a single MySQL instance can no longer handle write throughput, table sizes exceed practical InnoDB limits, or query latency increases despite optimization.

## Choosing a Shard Key

A good shard key:
- Has high cardinality (many distinct values)
- Distributes writes and reads evenly across shards
- Is present in most queries (avoid cross-shard queries)
- Does not change after row creation

A common choice is a user or tenant ID:

```sql
-- On shard 0: users where user_id % 4 = 0
-- On shard 1: users where user_id % 4 = 1
-- etc.
```

## Basic Shard Routing Example

Implement a simple shard router in application code:

```python
import mysql.connector

SHARD_COUNT = 4

shard_connections = {
    0: mysql.connector.connect(host="shard0.db", user="app", password="secret", database="mydb"),
    1: mysql.connector.connect(host="shard1.db", user="app", password="secret", database="mydb"),
    2: mysql.connector.connect(host="shard2.db", user="app", password="secret", database="mydb"),
    3: mysql.connector.connect(host="shard3.db", user="app", password="secret", database="mydb"),
}

def get_shard(user_id: int):
    return shard_connections[user_id % SHARD_COUNT]

def get_user(user_id: int):
    conn = get_shard(user_id)
    cursor = conn.cursor(dictionary=True)
    cursor.execute("SELECT * FROM users WHERE id = %s", (user_id,))
    return cursor.fetchone()

def create_order(user_id: int, amount: float):
    conn = get_shard(user_id)
    cursor = conn.cursor()
    cursor.execute(
        "INSERT INTO orders (user_id, amount) VALUES (%s, %s)",
        (user_id, amount)
    )
    conn.commit()
```

## Schema Setup Per Shard

Each shard holds the same schema. Create identical tables on all four shard instances:

```sql
CREATE TABLE users (
  id BIGINT UNSIGNED NOT NULL,
  email VARCHAR(255) NOT NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uk_email (email)
) ENGINE=InnoDB;

CREATE TABLE orders (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  user_id BIGINT UNSIGNED NOT NULL,
  amount DECIMAL(10,2) NOT NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_user_id (user_id)
) ENGINE=InnoDB;
```

## Handling Cross-Shard Aggregation

Aggregations like total order count require querying all shards and merging results in application code:

```python
def total_order_count():
    total = 0
    for conn in shard_connections.values():
        cursor = conn.cursor()
        cursor.execute("SELECT COUNT(*) FROM orders")
        total += cursor.fetchone()[0]
    return total
```

For reporting use cases, consider maintaining a separate analytics database that aggregates from all shards via replication or ETL.

## Resharding Challenges

Adding a new shard requires migrating data from existing shards. Plan for resharding by using consistent hashing instead of modulo arithmetic, which minimizes data movement when shard count changes. Tools like Vitess automate resharding for MySQL.

## Monitoring Shard Balance

Monitor that data is distributed evenly across shards. An imbalanced shard (called a "hot shard") becomes a bottleneck:

```sql
-- Run on each shard
SELECT SUM(TABLE_ROWS) AS row_count, SUM(data_length + index_length) AS bytes
FROM information_schema.TABLES
WHERE table_schema = 'mydb';
```

If one shard grows significantly larger, reconsider the shard key or redistribute data.

## Summary

Horizontal sharding scales MySQL writes and storage by distributing rows across multiple database instances using a shard key. Implement a router that maps shard key values to connections, keep schema identical across shards, and handle cross-shard queries in the application layer. For production, consider Vitess or PlanetScale to manage sharding complexity, resharding, and routing automatically.
