# MySQL vs SQLite: When to Use Which

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MySQL, SQLite, Database

Description: Compare MySQL and SQLite to understand when each fits best, covering concurrency, deployment, scale, and use-case trade-offs.

---

MySQL and SQLite are both relational databases using SQL, but they are designed for entirely different scenarios. Choosing the wrong one adds complexity without benefit.

## Architecture Differences

SQLite is a serverless, file-based database. There is no separate process - the library links directly into your application.

```bash
# SQLite - just a file
sqlite3 myapp.db "SELECT * FROM users LIMIT 5;"
```

MySQL runs as a standalone server that clients connect to over a network socket or TCP.

```bash
# MySQL - connect to a running server
mysql -h 127.0.0.1 -u root -p myapp -e "SELECT * FROM users LIMIT 5;"
```

## Concurrency Model

SQLite uses file-level locking. Only one writer can operate at a time, making it unsuitable for high-write workloads. MySQL's InnoDB engine uses row-level locking, allowing many concurrent writers.

```sql
-- MySQL handles this with row-level locks (no contention for different rows)
BEGIN;
UPDATE orders SET status = 'shipped' WHERE id = 101;
COMMIT;
```

SQLite would serialize this against any other write, even targeting a completely different row.

## Data Types and Feature Set

MySQL provides a richer type system including `DATETIME`, `TIMESTAMP`, `ENUM`, `SET`, `JSON` with operators, and spatial types. SQLite uses dynamic typing with five storage classes: NULL, INTEGER, REAL, TEXT, BLOB.

```sql
-- MySQL JSON column with operator
SELECT data->>'$.name' AS name FROM profiles WHERE data->>'$.active' = 'true';

-- SQLite uses JSON functions (extension since 3.9, built-in from 3.38+)
SELECT json_extract(data, '$.name') AS name FROM profiles
WHERE json_extract(data, '$.active') = 1;
```

## When to Use SQLite

SQLite is the right choice for:
- Mobile applications (iOS/Android)
- Desktop applications with local storage
- Prototyping and development environments
- Embedded devices and IoT
- Read-heavy workloads with rare writes
- Testing pipelines that need a lightweight database

```python
import sqlite3

conn = sqlite3.connect("test.db")
conn.execute("CREATE TABLE IF NOT EXISTS logs (id INTEGER PRIMARY KEY, msg TEXT)")
conn.execute("INSERT INTO logs (msg) VALUES (?)", ("started",))
conn.commit()
conn.close()
```

## When to Use MySQL

MySQL is the right choice for:
- Web applications with many concurrent users
- Multi-service architectures where several apps share one database
- Applications requiring replication or HA clustering
- Datasets exceeding a few gigabytes
- Workloads with heavy write throughput

```sql
-- MySQL replication setup enables read scaling
SHOW REPLICA STATUS\G
```

## Performance Comparison

For single-user, read-heavy access to a small dataset, SQLite is often faster - it avoids network round-trips and process overhead. For concurrent writes or large datasets, MySQL with InnoDB outperforms SQLite significantly.

| Factor | SQLite | MySQL |
|---|---|---|
| Concurrency | Low | High |
| Deployment | Embedded | Server |
| Max DB size | ~281 TB (theoretical) | 64 TB per table |
| Write throughput | Low | High |
| Operational overhead | None | Moderate |

## Summary

Use SQLite when you need a simple, embedded database with no server overhead - perfect for local apps, tests, and prototypes. Use MySQL when you need concurrent access, replication, high write throughput, or a shared multi-client database. The decision is usually straightforward: if multiple processes or users write simultaneously, choose MySQL.
