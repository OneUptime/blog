# How to Handle Cross-Shard Queries in MySQL

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MySQL, Sharding, Cross-Shard, Architecture, Query

Description: Learn patterns for handling cross-shard queries in MySQL, including scatter-gather, denormalization, secondary indexes, and routing tables.

---

## The Cross-Shard Query Problem

In a sharded MySQL architecture, queries that use the shard key route directly to a single shard. But queries that filter on a non-shard-key column must be sent to all shards (scatter) and results merged (gather). This is expensive and grows with shard count.

For example, if the shard key is `user_id` but you need to find a user by `email`, you must query all shards:

```python
def find_user_by_email(email: str):
    results = []
    for conn in shard_connections.values():
        cursor = conn.cursor(dictionary=True)
        cursor.execute("SELECT * FROM users WHERE email = %s LIMIT 1", (email,))
        row = cursor.fetchone()
        if row:
            results.append(row)
    return results[0] if results else None
```

This works but does not scale well with many shards. The patterns below reduce cross-shard query frequency.

## Pattern 1 - Routing Table

Maintain a central routing table (not sharded) that maps non-key attributes to shard keys:

```sql
-- In a central metadata database (not sharded)
CREATE TABLE email_to_user (
  email VARCHAR(255) NOT NULL,
  user_id BIGINT UNSIGNED NOT NULL,
  PRIMARY KEY (email)
) ENGINE=InnoDB;
```

Look up the `user_id` first, then route to the correct shard:

```python
def find_user_by_email_fast(email: str):
    cursor = meta_conn.cursor(dictionary=True)
    cursor.execute(
        "SELECT user_id FROM email_to_user WHERE email = %s", (email,)
    )
    row = cursor.fetchone()
    if not row:
        return None
    return get_user(row["user_id"])  # routes to correct shard
```

Maintain the routing table in a dual-write pattern when users are created or emails change.

## Pattern 2 - Denormalization with Broadcast Writes

For attributes queried frequently across shards, write the same data to a dedicated global table and a per-shard table:

```python
def create_user(user_id: int, email: str, name: str):
    # Write to correct shard
    conn = get_shard(user_id)
    cursor = conn.cursor()
    cursor.execute(
        "INSERT INTO users (id, email, name) VALUES (%s, %s, %s)",
        (user_id, email, name)
    )
    conn.commit()

    # Write email index to central routing table
    cursor = meta_conn.cursor()
    cursor.execute(
        "INSERT INTO email_to_user (email, user_id) VALUES (%s, %s)",
        (email, user_id)
    )
    meta_conn.commit()
```

## Pattern 3 - Scatter-Gather with Pagination

For analytics and reporting queries across all shards, use scatter-gather with proper limits and offset handling:

```python
def recent_orders(limit: int = 100):
    # Fetch top N from each shard
    all_results = []
    for conn in shard_connections.values():
        cursor = conn.cursor(dictionary=True)
        cursor.execute(
            "SELECT id, user_id, amount, created_at "
            "FROM orders ORDER BY created_at DESC LIMIT %s",
            (limit,)
        )
        all_results.extend(cursor.fetchall())

    # Merge and re-sort in application
    all_results.sort(key=lambda r: r["created_at"], reverse=True)
    return all_results[:limit]
```

## Pattern 4 - Read from an Aggregation Replica

Route all reporting queries to a separate MySQL instance that aggregates data from all shards via a scheduled ETL or Debezium CDC pipeline. This avoids scatter-gather entirely for reporting workloads.

```sql
-- On the reporting replica, a unified view:
SELECT user_id, SUM(amount) AS total_spent
FROM all_orders
GROUP BY user_id
ORDER BY total_spent DESC
LIMIT 10;
```

## Choosing the Right Pattern

| Use Case | Recommended Pattern |
|---|---|
| Look up by email / phone | Routing table |
| Multi-tenant with known tenant | Route by tenant_id |
| Global leaderboard / aggregate | Aggregation replica or ETL |
| Infrequent admin queries | Scatter-gather |

## Summary

Cross-shard queries in MySQL require deliberate patterns to remain efficient as shard count grows. Use routing tables to avoid scatter-gather for common non-shard-key lookups, denormalize critical attributes to a central index, and maintain an aggregation replica for reporting. Reserve scatter-gather for infrequent admin queries where latency is acceptable.
