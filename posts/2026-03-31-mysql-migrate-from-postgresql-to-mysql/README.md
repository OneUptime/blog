# How to Migrate from PostgreSQL to MySQL

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MySQL, PostgreSQL, Migration, Database, Schema Conversion

Description: A practical guide to migrating from PostgreSQL to MySQL, covering schema conversion, data export, import strategies, and handling incompatibilities.

---

## When You Might Migrate from PostgreSQL to MySQL

While PostgreSQL is often considered the more feature-rich database, there are legitimate reasons to migrate to MySQL: reduced operational complexity, better support from certain hosting providers, compatibility with specific frameworks or ORM tooling, or organizational standardization. Whatever the reason, migrating from PostgreSQL to MySQL requires careful attention to schema and syntax differences.

## Key Differences to Address Before Migrating

PostgreSQL and MySQL differ in several important ways that affect migration:

| Feature | PostgreSQL | MySQL |
|---|---|---|
| Boolean type | `BOOLEAN` (true/false) | `TINYINT(1)` (1/0) |
| Serial/auto-increment | `SERIAL` or `BIGSERIAL` | `AUTO_INCREMENT` |
| String quoting | Double quotes for identifiers | Backticks for identifiers |
| Arrays | Native array types | No native arrays |
| `RETURNING` clause | Supported | Not supported |
| `ILIKE` | Case-insensitive LIKE | Use `LIKE` (case insensitive by default in many collations) |

## Export Schema from PostgreSQL

Use `pg_dump` to export just the schema:

```bash
pg_dump \
  --schema-only \
  --no-owner \
  --no-acl \
  -U postgres \
  your_database > schema.sql
```

Export data as SQL INSERT statements for easier import into MySQL:

```bash
pg_dump \
  --data-only \
  --format=plain \
  --column-inserts \
  -U postgres \
  your_database > data.sql
```

Alternatively, export specific tables as CSV directly:

```bash
psql -U postgres -d your_database -c "\COPY orders TO '/tmp/orders.csv' WITH CSV HEADER"
```

## Convert the Schema

You need to manually convert the PostgreSQL schema to MySQL syntax. A typical PostgreSQL table:

```sql
CREATE TABLE orders (
  id BIGSERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL,
  status VARCHAR(50) NOT NULL DEFAULT 'pending',
  is_paid BOOLEAN NOT NULL DEFAULT FALSE,
  metadata JSONB,
  created_at TIMESTAMP DEFAULT NOW()
);
```

Converted to MySQL:

```sql
CREATE TABLE orders (
  id BIGINT NOT NULL AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL,
  status VARCHAR(50) NOT NULL DEFAULT 'pending',
  is_paid TINYINT(1) NOT NULL DEFAULT 0,
  metadata JSON,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
```

Key changes: `BIGSERIAL` to `BIGINT AUTO_INCREMENT`, `BOOLEAN` to `TINYINT(1)`, `JSONB` to `JSON`, `TIMESTAMP` to `DATETIME`, and add `ENGINE=InnoDB`.

## Import Data into MySQL

After schema conversion, load data from CSV files:

```sql
LOAD DATA INFILE '/tmp/orders.csv'
INTO TABLE orders
FIELDS TERMINATED BY ','
OPTIONALLY ENCLOSED BY '"'
LINES TERMINATED BY '\n'
IGNORE 1 ROWS
(id, user_id, status, is_paid, metadata, created_at);
```

Or use `mysqlimport` for bulk loading:

```bash
mysqlimport \
  --local \
  --fields-terminated-by=',' \
  --lines-terminated-by='\n' \
  --ignore-lines=1 \
  -u root -p \
  your_database /tmp/orders.csv
```

## Handle Sequences and Auto-Increment

PostgreSQL sequences are separate objects. In MySQL, reset `AUTO_INCREMENT` to match the maximum existing ID:

```sql
SELECT MAX(id) FROM orders;
ALTER TABLE orders AUTO_INCREMENT = 100001;
```

## Migrate Stored Functions and Procedures

PostgreSQL functions use syntax (such as `PL/pgSQL` or `LANGUAGE sql`) that differs from MySQL. You must rewrite these in MySQL's stored procedure syntax. A simple PostgreSQL function:

```sql
CREATE FUNCTION get_order_count(uid INTEGER)
RETURNS INTEGER AS $$
  SELECT COUNT(*) FROM orders WHERE user_id = uid;
$$ LANGUAGE sql;
```

Equivalent MySQL stored function:

```sql
DELIMITER $$
CREATE FUNCTION get_order_count(uid INT)
RETURNS INT
READS SQL DATA
BEGIN
  DECLARE cnt INT;
  SELECT COUNT(*) INTO cnt FROM orders WHERE user_id = uid;
  RETURN cnt;
END$$
DELIMITER ;
```

## Validate the Migration

After importing, verify row counts match:

```sql
SELECT TABLE_NAME, TABLE_ROWS
FROM information_schema.TABLES
WHERE TABLE_SCHEMA = 'your_database'
ORDER BY TABLE_NAME;
```

Run application-level smoke tests against the MySQL database before switching DNS or connection strings.

## Summary

Migrating from PostgreSQL to MySQL requires schema conversion (especially data types like `BOOLEAN`, `SERIAL`, and `JSONB`), data export via CSV, and rewriting stored procedures. The process is manual-intensive but straightforward for most OLTP schemas. Validate data integrity with row counts and checksums before routing production traffic to MySQL.
