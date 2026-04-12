# How to Use DELETE with LIMIT in MySQL

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MySQL, Delete, Limit, Batch, DML

Description: Learn how to use DELETE with LIMIT in MySQL to safely remove data in controlled batches, reducing lock contention and replication lag on large tables.

---

## Why Limit a DELETE

Deleting millions of rows in a single statement holds a large InnoDB lock, generates a huge undo log entry, and can cause severe replication lag on replicas. Adding `LIMIT` caps the number of rows removed per execution, keeping each operation fast and minimally disruptive.

## Basic Syntax

```sql
DELETE FROM logs
WHERE level = 'debug'
  AND created_at < '2025-01-01'
LIMIT 10000;
```

This deletes at most 10,000 rows per execution. Run it repeatedly until no rows remain.

## Iterative Batch Deletion in Bash

```bash
while true; do
  AFFECTED=$(mysql -u root -pmypass mydb -sN -e "
    DELETE FROM logs
    WHERE level = 'debug'
      AND created_at < '2025-01-01'
    LIMIT 10000;
    SELECT ROW_COUNT();
  ")
  echo "Deleted: $AFFECTED"
  [ "$AFFECTED" -eq 0 ] && break
  sleep 0.5
done
```

The `sleep 0.5` between iterations reduces lock contention and allows replicas to catch up.

## Iterative Batch Deletion in Python

```python
import mysql.connector
import time

conn = mysql.connector.connect(host='localhost', user='root', database='mydb')
cursor = conn.cursor()

total = 0
while True:
    cursor.execute("""
        DELETE FROM logs
        WHERE level = 'debug'
          AND created_at < '2025-01-01'
        LIMIT 10000
    """)
    conn.commit()
    deleted = cursor.rowcount
    total += deleted
    print(f'Batch deleted {deleted} rows (total: {total})')
    if deleted == 0:
        break
    time.sleep(0.5)

cursor.close()
conn.close()
```

## Combining LIMIT with ORDER BY

`ORDER BY` makes the deletion deterministic when paired with `LIMIT`:

```sql
DELETE FROM events
WHERE processed = 1
ORDER BY id ASC
LIMIT 5000;
```

Deleting by ascending `id` processes the oldest rows first and ensures consistent progress across iterations.

## Restriction: No LIMIT in Multi-Table DELETE

MySQL does not allow `LIMIT` in multi-table `DELETE` statements:

```sql
-- ERROR: not supported
DELETE oi
FROM order_items oi
JOIN orders o ON oi.order_id = o.id
WHERE o.status = 'cancelled'
LIMIT 1000;
```

Workaround - select IDs first, then delete:

```sql
DELETE FROM order_items
WHERE order_id IN (
  SELECT order_id FROM (
    SELECT o.id AS order_id
    FROM orders o
    WHERE o.status = 'cancelled'
    LIMIT 1000
  ) AS sub
);
```

## Choosing the Right Batch Size

| Table size | Recommended LIMIT |
|---|---|
| < 1M rows | 10,000 |
| 1M - 10M rows | 5,000 |
| > 10M rows | 1,000 - 2,000 |

Smaller batches keep transactions short. Larger batches reduce the number of iterations but hold locks longer.

## Summary

`DELETE ... LIMIT` is the safest way to remove large volumes of data from a production MySQL table. Pair it with `ORDER BY` for deterministic processing, loop it in a script with short pauses to manage replication lag, and adjust the batch size based on your table size and acceptable lock duration.
