# How to Update Multiple Columns in a Single UPDATE in MySQL

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MySQL, Update, Column, DML, Query

Description: Learn how to update multiple columns simultaneously in a single MySQL UPDATE statement and understand column reference order in the SET clause.

---

## Why Update Multiple Columns at Once

Updating multiple columns in a single `UPDATE` statement is more efficient than running separate `UPDATE` statements for each column. It requires only one table scan, acquires the lock once, and writes the change log entry once.

## Basic Syntax

List column assignments separated by commas in the `SET` clause:

```sql
UPDATE users
SET first_name = 'Alice',
    last_name  = 'Smith',
    email      = 'alice.smith@example.com',
    updated_at = NOW()
WHERE id = 101;
```

All four columns are updated atomically. If the transaction rolls back, none of the changes persist.

## Mixing Literals and Expressions

The `SET` clause can combine literal values, function calls, and expressions referencing other columns:

```sql
UPDATE products
SET price       = price * 1.15,
    name        = CONCAT(name, ' (updated)'),
    updated_at  = CURRENT_TIMESTAMP
WHERE category = 'electronics';
```

This raises electronics prices by 15%, appends a label to the name, and stamps the update time.

## Column Reference Order in SET

In MySQL, the `SET` clause processes assignments left to right, and later assignments can reference values set by earlier ones:

```sql
UPDATE counters
SET total = total + 1,
    last_value = total  -- references the ALREADY-UPDATED total
WHERE id = 1;
```

This behavior differs from standard SQL, where all right-hand sides reference pre-update values. Be explicit about which value you intend to use.

## Conditional Column Updates with CASE

Apply different updates to different rows in one pass using `CASE`:

```sql
UPDATE employees
SET salary = CASE
               WHEN department = 'Sales'       THEN salary * 1.10
               WHEN department = 'Engineering' THEN salary * 1.12
               ELSE salary * 1.05
             END,
    reviewed_at = NOW();
```

This updates every employee's salary according to their department and stamps the review time, all in a single scan.

## Updating Only Changed Columns

If you want to avoid unnecessary writes, filter in the `WHERE` clause:

```sql
UPDATE users
SET first_name = 'Bob',
    email      = 'bob@example.com'
WHERE id = 5
  AND (first_name != 'Bob' OR email != 'bob@example.com');
```

If both values already match, the additional conditions prevent the row from satisfying the `WHERE` clause at all, so MySQL skips it entirely—no lock acquired and no write attempted. The `ROW_COUNT()` function reflects this by returning zero affected rows.

## Verifying the Result

After updating, select the affected row to confirm:

```sql
SELECT id, first_name, last_name, email, updated_at
FROM users
WHERE id = 101;
```

Or rely on the affected-rows count:

```sql
SELECT ROW_COUNT();
```

## Application-Side Example

In a Node.js application using the `mysql2` driver:

```javascript
const [result] = await conn.execute(
  `UPDATE orders
   SET status = ?, shipped_at = ?, tracking_code = ?
   WHERE id = ?`,
  ['shipped', new Date(), 'TRACK-9876', orderId]
);
console.log(`Rows affected: ${result.affectedRows}`);
```

## Summary

Updating multiple columns in a single `UPDATE` statement reduces I/O, lock time, and log entries compared to separate statements. Use comma-separated assignments in `SET`, be aware of left-to-right evaluation order when columns reference each other, and use `CASE` expressions when different rows need different values in the same operation.
