# How to Copy Table Data with INSERT INTO SELECT in MySQL

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MySQL, SQL, DML, Insert, SELECT, Data Migration

Description: Copy rows between MySQL tables using INSERT INTO SELECT, filter and transform data during the copy, and handle large datasets efficiently.

---

## How It Works

`INSERT INTO ... SELECT` copies rows returned by a SELECT statement into a target table in a single SQL statement. It is the standard way to migrate data between tables, populate archive tables, or transform data from one schema to another.

```mermaid
flowchart LR
    A[SELECT from source_table] --> B[Result set]
    B --> C[INSERT INTO destination_table]
    C --> D[Rows committed]
```

## Syntax

```sql
INSERT INTO destination_table (col1, col2, ...)
SELECT col1, col2, ...
FROM source_table
[WHERE condition]
[ORDER BY ...]
[LIMIT n];
```

The column list in `INSERT INTO` must match the number and compatible types of the columns selected.

## Basic Example - Full Table Copy

```sql
-- Source table
CREATE TABLE products (
    id         INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    name       VARCHAR(255) NOT NULL,
    price      DECIMAL(10,2) NOT NULL,
    is_active  BOOLEAN      NOT NULL DEFAULT TRUE,
    created_at DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP
);

INSERT INTO products (name, price) VALUES
    ('Widget', 9.99), ('Gadget', 29.99), ('Doohickey', 4.99);

-- Destination table (same structure)
CREATE TABLE products_backup LIKE products;

-- Copy all rows
INSERT INTO products_backup (id, name, price, is_active, created_at)
    SELECT id, name, price, is_active, created_at
    FROM products;

SELECT COUNT(*) FROM products_backup;
```

```text
+----------+
| COUNT(*) |
+----------+
|        3 |
+----------+
```

## Copying with a Filter

Copy only rows matching a condition.

```sql
CREATE TABLE products_archived LIKE products;

INSERT INTO products_archived (id, name, price, is_active, created_at)
    SELECT id, name, price, is_active, created_at
    FROM products
    WHERE is_active = FALSE
      AND created_at < '2024-01-01';
```

## Copying with Transformation

You can transform data during the copy using expressions and functions.

```sql
CREATE TABLE products_v2 (
    id             INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    product_name   VARCHAR(255) NOT NULL,
    price_cents    INT UNSIGNED NOT NULL,
    created_at     DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP
);

INSERT INTO products_v2 (id, product_name, price_cents, created_at)
    SELECT
        id,
        UPPER(name),                        -- transform: uppercase
        ROUND(price * 100),                 -- transform: dollars to cents
        created_at
    FROM products;

SELECT * FROM products_v2;
```

```text
+----+--------------+-------------+---------------------+
| id | product_name | price_cents | created_at          |
+----+--------------+-------------+---------------------+
|  1 | WIDGET       |         999 | 2024-06-01 10:00:00 |
|  2 | GADGET       |        2999 | 2024-06-01 10:00:00 |
|  3 | DOOHICKEY    |         499 | 2024-06-01 10:00:00 |
+----+--------------+-------------+---------------------+
```

## Copying from a JOIN

You can select from multiple source tables using JOIN.

```sql
CREATE TABLE order_summary (
    order_id       INT UNSIGNED PRIMARY KEY,
    username       VARCHAR(50)    NOT NULL,
    total_amount   DECIMAL(10,2)  NOT NULL,
    item_count     INT UNSIGNED   NOT NULL
);

INSERT INTO order_summary (order_id, username, total_amount, item_count)
    SELECT
        o.id,
        u.username,
        o.total_amount,
        COUNT(oi.id) AS item_count
    FROM orders o
    JOIN users u       ON u.id = o.user_id
    JOIN order_items oi ON oi.order_id = o.id
    GROUP BY o.id, u.username, o.total_amount;
```

## Copying Between Databases

```sql
INSERT INTO archive_db.products (id, name, price)
    SELECT id, name, price
    FROM myapp.products
    WHERE created_at < '2023-01-01';
```

## Handling Duplicate Key Errors

If the destination table has unique constraints, duplicate rows will cause errors. Use `INSERT IGNORE` or `ON DUPLICATE KEY UPDATE` to handle conflicts.

```sql
-- Skip rows that would violate unique constraints
INSERT IGNORE INTO products_backup
    SELECT * FROM products;

-- Or update on conflict
INSERT INTO products_backup (id, name, price)
    SELECT * FROM (SELECT id, name, price FROM products) AS src
    ON DUPLICATE KEY UPDATE
        name  = src.name,
        price = src.price;
```

## Batching Large Copies

For very large tables, copying all rows at once can hold locks for too long. Use LIMIT with an incrementing offset to copy in batches.

```sql
-- Copy in batches of 10,000 rows
INSERT INTO products_archive
    SELECT * FROM products
    WHERE id BETWEEN 1 AND 10000;

INSERT INTO products_archive
    SELECT * FROM products
    WHERE id BETWEEN 10001 AND 20000;

-- Continue until all rows are copied
```

Or use a loop in a stored procedure.

```sql
DELIMITER $$
CREATE PROCEDURE batch_copy()
BEGIN
    DECLARE batch_size INT DEFAULT 10000;
    DECLARE min_id INT DEFAULT 1;
    DECLARE max_id INT;

    SELECT MAX(id) INTO max_id FROM products;

    WHILE min_id <= max_id DO
        INSERT INTO products_archive
            SELECT * FROM products
            WHERE id BETWEEN min_id AND min_id + batch_size - 1;

        SET min_id = min_id + batch_size;
        COMMIT;
    END WHILE;
END$$
DELIMITER ;

CALL batch_copy();
```

## Verifying the Copy

```sql
SELECT 'source'      AS tbl, COUNT(*) AS cnt FROM products
UNION ALL
SELECT 'destination' AS tbl, COUNT(*) AS cnt FROM products_backup;
```

```text
+-------------+-----+
| tbl         | cnt |
+-------------+-----+
| source      |   3 |
| destination |   3 |
+-------------+-----+
```

## Best Practices

- List columns explicitly in both the `INSERT INTO` and `SELECT` parts - never rely on positional matching.
- For large tables, copy in batches with `LIMIT` and commit between batches to avoid long-running transactions.
- Test the SELECT query first to verify it returns the expected rows before inserting.
- Add `IGNORE` or `ON DUPLICATE KEY UPDATE` when there is a risk of duplicate key violations.
- Use `pt-archiver` (Percona Toolkit) for production-grade large-scale data archiving.

## Summary

`INSERT INTO ... SELECT` is the standard MySQL pattern for copying rows between tables, archives, or databases in one statement. It supports WHERE filters, JOIN, GROUP BY, and expressions for data transformation during the copy. For large datasets, batch the operation using ID ranges and commit between batches to avoid excessive locking. Always verify row counts after the copy to confirm data completeness.
