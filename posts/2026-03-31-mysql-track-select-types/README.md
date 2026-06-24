# How to Track MySQL Select Types (Full Join, Full Range Join)

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MySQL, Query Optimization, Monitoring

Description: Monitor MySQL Com_select and select type counters to identify full joins, full range joins, and other inefficient query patterns using global status.

---

MySQL's global status counters expose the breakdown of SELECT execution strategies used since server start. Tracking these counters helps identify when full table scans, full joins, or range scans are increasing - all of which indicate missing or underused indexes.

## Key Select Type Counters

```sql
SELECT VARIABLE_NAME, VARIABLE_VALUE
FROM performance_schema.global_status
WHERE VARIABLE_NAME IN (
  'Select_full_join',
  'Select_full_range_join',
  'Select_range',
  'Select_range_check',
  'Select_scan'
);
```

| Counter | What it means |
|---|---|
| `Select_full_join` | JOIN without an index on the joined column - reads every row in the joined table |
| `Select_full_range_join` | Range scan on the reference table in a join - partial scan |
| `Select_range` | Range scan on the first table in a join (usually acceptable) |
| `Select_range_check` | Joins without keys that re-evaluate key usage for each row (very bad) |
| `Select_scan` | Full table scan on the first table (acceptable if table is small) |

## Spotting Problems

```sql
-- Snapshot query - run twice and compare to compute the delta
SELECT
  VARIABLE_NAME,
  CAST(VARIABLE_VALUE AS UNSIGNED) AS value
FROM performance_schema.global_status
WHERE VARIABLE_NAME IN (
  'Select_full_join',
  'Select_range_check'
)
ORDER BY VARIABLE_NAME;
```

Any non-zero `Select_full_join` on production is a concern. `Select_range_check` is almost always a sign of a poorly structured query or missing composite index.

## Connecting Select Types to EXPLAIN

When `Select_full_join` increases, run EXPLAIN on slow queries to find the culprit:

```sql
EXPLAIN SELECT o.id, c.name
FROM orders o
JOIN customers c ON c.id = o.customer_id
WHERE o.status = 'pending';
```

Look for `type: ALL` on the joined table in the EXPLAIN output - this indicates a full join without an index:

```text
+----+-------------+-----------+------+---------------+------+---------+------+-------+-------------+
| id | select_type | table     | type | possible_keys | key  | key_len | ref  | rows  | Extra       |
+----+-------------+-----------+------+---------------+------+---------+------+-------+-------------+
|  1 | SIMPLE      | customers | ALL  | NULL          | NULL | NULL    | NULL |  5000 | NULL        |
|  1 | SIMPLE      | orders    | ALL  | NULL          | NULL | NULL    | NULL | 50000 | Using where |
+----+-------------+-----------+------+---------------+------+---------+------+-------+-------------+
```

## Fixing a Full Join

```sql
-- Add the missing index on the joined column
ALTER TABLE orders ADD INDEX idx_customer_id (customer_id);

-- Verify EXPLAIN now shows ref or eq_ref
EXPLAIN SELECT o.id, c.name
FROM orders o
JOIN customers c ON c.id = o.customer_id
WHERE o.status = 'pending';
```

After adding the index, `Select_full_join` should stop incrementing.

## Monitoring with a Shell Script

```bash
#!/bin/bash
PREV=$(mysql -u root -p"$MYSQL_PASSWORD" -se \
  "SELECT VARIABLE_VALUE FROM performance_schema.global_status WHERE VARIABLE_NAME='Select_full_join'")
sleep 300
CURR=$(mysql -u root -p"$MYSQL_PASSWORD" -se \
  "SELECT VARIABLE_VALUE FROM performance_schema.global_status WHERE VARIABLE_NAME='Select_full_join'")
echo "Full joins in last 5 minutes: $((CURR - PREV))"
```

## Summary

Monitor `Select_full_join` and `Select_range_check` global status counters to detect inefficient query execution patterns. A growing `Select_full_join` rate indicates JOINs running without indexes on joined columns. Use EXPLAIN to find the query, then add the appropriate index to eliminate the full join and restore efficient query execution.
