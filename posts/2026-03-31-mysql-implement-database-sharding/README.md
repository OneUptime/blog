# How to Implement Database Sharding in MySQL

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MySQL, Sharding, Architecture, Scaling, Partition

Description: Learn how to implement database sharding in MySQL by choosing a sharding strategy, setting up shard topology, and handling data distribution and routing.

---

## What Is Database Sharding?

Database sharding is the practice of splitting a single logical database across multiple physical MySQL instances (shards). Each shard holds a non-overlapping subset of data, and the collection of shards together represents the complete dataset. Sharding is used when a single MySQL server cannot handle the data volume, write throughput, or storage requirements.

## Planning the Shard Topology

Before writing any code, determine:
- **Shard count:** Start with a power of 2 (e.g., 4 or 8) to simplify consistent hashing and future resharding
- **Shard key:** The column used to assign rows to shards (e.g., `tenant_id`, `user_id`)
- **Shard map:** A lookup table or algorithm mapping key values to shard hosts

A simple shard map table stored in a central metadata database:

```sql
CREATE TABLE shard_map (
  shard_id TINYINT UNSIGNED NOT NULL,
  host VARCHAR(255) NOT NULL,
  port SMALLINT UNSIGNED NOT NULL DEFAULT 3306,
  is_active TINYINT(1) NOT NULL DEFAULT 1,
  PRIMARY KEY (shard_id)
) ENGINE=InnoDB;

INSERT INTO shard_map (shard_id, host) VALUES
  (0, 'shard0.db.internal'),
  (1, 'shard1.db.internal'),
  (2, 'shard2.db.internal'),
  (3, 'shard3.db.internal');
```

## Implementing the Shard Router

```python
import mysql.connector

SHARD_COUNT = 4

# Load shard connections at startup
def build_shard_pool():
    meta_conn = mysql.connector.connect(
        host="meta.db.internal", user="app", password="secret", database="metadata"
    )
    cursor = meta_conn.cursor(dictionary=True)
    cursor.execute("SELECT shard_id, host, port FROM shard_map WHERE is_active = 1")
    shards = {}
    for row in cursor.fetchall():
        shards[row["shard_id"]] = mysql.connector.connect(
            host=row["host"], port=row["port"],
            user="app", password="secret", database="mydb"
        )
    return shards

shard_pool = build_shard_pool()

def route(shard_key: int):
    return shard_pool[shard_key % SHARD_COUNT]
```

## Shard-Aware Insert

Every INSERT must include the shard key to enable proper routing:

```python
def create_order(user_id: int, product_id: int, amount: float) -> int:
    conn = route(user_id)
    cursor = conn.cursor()
    cursor.execute(
        "INSERT INTO orders (user_id, product_id, amount, created_at) "
        "VALUES (%s, %s, %s, NOW())",
        (user_id, product_id, amount)
    )
    conn.commit()
    return cursor.lastrowid
```

## Global Unique IDs Across Shards

Auto-increment IDs are per-shard and will collide across shards. Use a global ID strategy:

**Option 1 - Combined ID:** Encode shard ID + local ID in a BIGINT:

```python
def make_global_id(shard_id: int, local_id: int) -> int:
    # 8 bits for shard_id, 56 bits for local_id
    return (shard_id << 56) | (local_id & 0x00FFFFFFFFFFFFFF)

def extract_shard(global_id: int) -> int:
    return global_id >> 56
```

**Option 2 - UUID:** Use `UUID()` and parse the shard from the application.

```sql
CREATE TABLE orders (
  id CHAR(36) NOT NULL DEFAULT (UUID()),
  user_id BIGINT UNSIGNED NOT NULL,
  ...
  PRIMARY KEY (id),
  KEY idx_user_id (user_id)
) ENGINE=InnoDB;
```

## Scatter-Gather for Non-Shard-Key Queries

Queries not using the shard key must run on all shards (scatter) and merge results (gather):

```python
def find_orders_by_product(product_id: int):
    results = []
    for conn in shard_pool.values():
        cursor = conn.cursor(dictionary=True)
        cursor.execute(
            "SELECT * FROM orders WHERE product_id = %s LIMIT 100",
            (product_id,)
        )
        results.extend(cursor.fetchall())
    results.sort(key=lambda r: r["created_at"], reverse=True)
    return results[:100]
```

## Summary

Implementing MySQL sharding requires choosing a shard key, building a routing layer that maps key values to shard connections, using shard-aware inserts, and generating globally unique IDs. Plan for scatter-gather queries on non-shard-key columns and consider global ID strategies early. For production environments, Vitess automates much of this complexity.
