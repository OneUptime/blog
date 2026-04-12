# How to Use CREATE TABLE AS SELECT in MySQL

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MySQL, SQL, DDL, DML, CREATE TABLE, SELECT

Description: Create a new MySQL table and populate it with data in one statement using CREATE TABLE AS SELECT, with column aliasing and type inference notes.

---

## How It Works

`CREATE TABLE ... AS SELECT` (sometimes called CTAS) creates a new table and inserts the rows returned by the SELECT query in a single atomic operation. MySQL infers column data types from the SELECT expression types. The resulting table has no indexes, no primary key, and no AUTO_INCREMENT. NOT NULL and character set attributes are preserved, but constraints such as UNIQUE and FOREIGN KEY are not.

```mermaid
flowchart LR
    A[CREATE TABLE new_table\nAS SELECT ...] --> B[MySQL infers column\ntypes from SELECT]
    B --> C[Creates new table\nno indexes or PKs]
    C --> D[Inserts all SELECT rows]
    D --> E[Table ready with data]
```

## Syntax

```sql
CREATE TABLE new_table [AS] SELECT col1, col2, ...
FROM source_table
[WHERE condition]
[GROUP BY ...]
[ORDER BY ...];
```

## Basic Example

```sql
CREATE TABLE users (
    id         INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    username   VARCHAR(50)  NOT NULL,
    email      VARCHAR(255) NOT NULL,
    is_active  BOOLEAN      NOT NULL DEFAULT TRUE,
    country    CHAR(2),
    created_at DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP
);

INSERT INTO users (username, email, country) VALUES
    ('alice', 'alice@example.com', 'US'),
    ('bob',   'bob@example.com',   'GB'),
    ('carol', 'carol@example.com', 'US');

-- Create a new table from a subset of the data
CREATE TABLE us_users AS
    SELECT id, username, email, created_at
    FROM users
    WHERE country = 'US';

SELECT * FROM us_users;
```

```text
+----+----------+-------------------+---------------------+
| id | username | email             | created_at          |
+----+----------+-------------------+---------------------+
|  1 | alice    | alice@example.com | 2024-06-01 10:00:00 |
|  3 | carol    | carol@example.com | 2024-06-01 10:00:00 |
+----+----------+-------------------+---------------------+
```

Check the inferred structure.

```sql
DESCRIBE us_users;
```

```text
+------------+--------------+------+-----+---------------------+-------+
| Field      | Type         | Null | Key | Default             | Extra |
+------------+--------------+------+-----+---------------------+-------+
| id         | int unsigned | NO   |     | 0                   |       |
| username   | varchar(50)  | NO   |     | NULL                |       |
| email      | varchar(255) | NO   |     | NULL                |       |
| created_at | datetime     | NO   |     | 0000-00-00 00:00:00 |       |
+------------+--------------+------+-----+---------------------+-------+
```

No PRIMARY KEY, no indexes - CTAS creates a bare table.

## Column Aliasing

Use `AS` to name computed columns in the new table.

```sql
CREATE TABLE order_totals AS
    SELECT
        user_id,
        COUNT(*)              AS order_count,
        SUM(total_amount)     AS lifetime_value,
        MIN(created_at)       AS first_order_at,
        MAX(created_at)       AS last_order_at
    FROM orders
    GROUP BY user_id;

DESCRIBE order_totals;
```

```text
+----------------+---------------+------+-----+---------+-------+
| Field          | Type          | Null | Key | Default | Extra |
+----------------+---------------+------+-----+---------+-------+
| user_id        | int unsigned  | YES  |     | NULL    |       |
| order_count    | bigint        | NO   |     | 0       |       |
| lifetime_value | decimal(32,2) | YES  |     | NULL    |       |
| first_order_at | datetime      | YES  |     | NULL    |       |
| last_order_at  | datetime      | YES  |     | NULL    |       |
+----------------+---------------+------+-----+---------+-------+
```

## Adding Indexes After CTAS

Because CTAS creates no indexes, add them immediately after.

```sql
CREATE TABLE us_users AS
    SELECT id, username, email, created_at
    FROM users
    WHERE country = 'US';

-- Add primary key and indexes
ALTER TABLE us_users
    ADD PRIMARY KEY (id),
    ADD UNIQUE INDEX uq_email (email),
    ADD INDEX idx_created_at (created_at);
```

## Creating a Summary Table

CTAS is ideal for materialised summary tables refreshed periodically.

```sql
DROP TABLE IF EXISTS product_sales_summary;

CREATE TABLE product_sales_summary AS
    SELECT
        p.id           AS product_id,
        p.name         AS product_name,
        SUM(oi.quantity)            AS total_units_sold,
        SUM(oi.quantity * oi.unit_price) AS total_revenue,
        COUNT(DISTINCT o.user_id)   AS unique_buyers
    FROM order_items oi
    JOIN orders   o ON o.id   = oi.order_id
    JOIN products p ON p.id   = oi.product_id
    GROUP BY p.id, p.name;

ALTER TABLE product_sales_summary ADD PRIMARY KEY (product_id);

SELECT * FROM product_sales_summary ORDER BY total_revenue DESC LIMIT 5;
```

## Creating an Empty Table with Derived Structure

To create an empty table with the inferred structure (no data), add a `WHERE` clause that matches nothing.

```sql
CREATE TABLE users_staging AS
    SELECT * FROM users WHERE 1 = 0;

SELECT COUNT(*) FROM users_staging;
```

```text
+----------+
| COUNT(*) |
+----------+
|        0 |
+----------+
```

Note: This approach is less predictable than `CREATE TABLE ... LIKE` because it still inherits CTAS's lack of indexes and constraints.

## IF NOT EXISTS

Use `IF NOT EXISTS` to prevent errors in idempotent scripts.

```sql
CREATE TABLE IF NOT EXISTS us_users AS
    SELECT id, username, email FROM users WHERE country = 'US';
```

## CTAS vs CREATE TABLE LIKE

| Feature | CTAS | CREATE TABLE LIKE |
|---|---|---|
| Copies data | Yes | No |
| Copies indexes | No | Yes |
| Copies constraints | No (preserves NOT NULL) | Yes (except FKs) |
| Column types | Inferred | Exact copy |
| Idiomatic for | Materialised views, summaries | Structural copies, staging tables |

## Best Practices

- Always add a PRIMARY KEY and relevant indexes after CTAS.
- Use explicit column aliases for computed expressions so column names are meaningful.
- Use `DROP TABLE IF EXISTS` before CTAS when refreshing summary tables to start clean.
- Prefer `CREATE TABLE ... LIKE` followed by `INSERT INTO ... SELECT` when you need exact type fidelity and all indexes.
- Use CTAS for ad-hoc analysis tables, ETL staging, and materialised summary tables.

## Summary

`CREATE TABLE AS SELECT` creates a new table and populates it from a SELECT query in one step. MySQL infers column types from the SELECT expressions. The resulting table has no indexes, primary keys, or AUTO_INCREMENT - add them immediately with `ALTER TABLE`. NOT NULL attributes are preserved from the source columns. CTAS is ideal for summary tables, ETL staging, and analysis snapshots. For exact structural copies with indexes, use `CREATE TABLE ... LIKE` instead.
