# How to Use UPDATE with LIMIT in MySQL

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MySQL, Update, Limit, Batch, DML

Description: Learn how MySQL's UPDATE with LIMIT lets you modify a controlled number of rows, enabling safe batch updates and staged rollouts without locking the whole table.

---

## Why Limit an UPDATE

When a table has millions of rows, updating all matching rows at once can hold locks for a long time, block concurrent reads and writes, and spike InnoDB's undo log. Adding `LIMIT` to an `UPDATE` restricts the number of rows modified per statement, allowing you to process data in manageable batches.

## Basic Syntax

```sql
UPDATE orders
SET status = 'archived'
WHERE status = 'completed'
  AND created_at < '2024-01-01'
LIMIT 1000;
```

This updates at most 1,000 rows per execution. Run it repeatedly until `ROW_COUNT()` returns `0`.

## Iterative Batch Processing

Loop the statement in a script until all matching rows are processed:

```bash
while true; do
  AFFECTED=$(mysql -u root -p mydb -sN -e "
    UPDATE orders
    SET status = 'archived'
    WHERE status = 'completed'
      AND created_at < '2024-01-01'
    LIMIT 5000;
    SELECT ROW_COUNT();
  ")
  echo "Rows updated: $AFFECTED"
  if [ "$AFFECTED" -eq 0 ]; then
    break
  fi
  sleep 1
done
```

The `sleep 1` between batches gives other queries a chance to run and keeps replication lag manageable.

## Equivalent in Python

```python
import mysql.connector
import time

conn = mysql.connector.connect(host='localhost', user='root', database='mydb')
cursor = conn.cursor()

while True:
    cursor.execute("""
        UPDATE orders
        SET status = 'archived'
        WHERE status = 'completed'
          AND created_at < '2024-01-01'
        LIMIT 5000
    """)
    conn.commit()
    if cursor.rowcount == 0:
        break
    print(f'Updated {cursor.rowcount} rows')
    time.sleep(0.5)

cursor.close()
conn.close()
```

## Combining LIMIT with ORDER BY

MySQL requires `ORDER BY` when you want `LIMIT` to affect a deterministic set of rows:

```sql
UPDATE tasks
SET priority = 'high'
WHERE assigned_user_id IS NULL
ORDER BY created_at ASC
LIMIT 100;
```

Without `ORDER BY`, MySQL can pick any 100 rows - the order is undefined. Adding `ORDER BY created_at ASC` ensures the oldest unassigned tasks are promoted first.

## Restriction: No LIMIT with Multi-Table UPDATE

MySQL does not support `LIMIT` in a multi-table (JOIN-based) `UPDATE`. If you need to limit a join-based update, use a subquery to identify the target row IDs first:

```sql
UPDATE orders
SET status = 'flagged'
WHERE id IN (
  SELECT id FROM (
    SELECT o.id
    FROM orders o
    JOIN fraud_signals f ON o.customer_id = f.customer_id
    WHERE o.status = 'pending'
    LIMIT 500
  ) AS sub
);
```

## Summary

`UPDATE ... LIMIT` is a simple and effective tool for safe incremental data migrations, backfills, and maintenance operations. Pair it with `ORDER BY` for deterministic row selection, loop it in a script with short pauses to avoid lock contention, and use application-level row count checks to know when the job is complete.
