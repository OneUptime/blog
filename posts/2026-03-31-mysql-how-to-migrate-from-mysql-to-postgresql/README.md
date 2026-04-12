# How to Migrate from MySQL to PostgreSQL

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MySQL, PostgreSQL, Migration, Database, SQL

Description: Learn how to migrate a MySQL database to PostgreSQL using pgloader, handling schema translation, data type mapping, and application query compatibility.

---

## Why Migrate from MySQL to PostgreSQL

Common reasons to migrate from MySQL to PostgreSQL include advanced SQL features (CTEs, window functions, JSON operators, arrays), stronger standards compliance, superior full-text search, and better support for complex queries. The migration requires translating schema, migrating data, and adapting application queries.

## Migration Overview

1. Export MySQL schema
2. Translate schema to PostgreSQL syntax
3. Migrate data using pgloader
4. Fix incompatible queries in the application
5. Test and validate
6. Cutover

## Data Type Mapping

| MySQL Type | PostgreSQL Equivalent |
|-----------|----------------------|
| `INT` | `INTEGER` |
| `BIGINT` | `BIGINT` |
| `TINYINT(1)` | `BOOLEAN` |
| `FLOAT` / `DOUBLE` | `REAL` / `DOUBLE PRECISION` |
| `DECIMAL(p,s)` | `NUMERIC(p,s)` |
| `VARCHAR(n)` | `VARCHAR(n)` or `TEXT` |
| `TEXT` | `TEXT` |
| `DATETIME` | `TIMESTAMP` |
| `TIMESTAMP` | `TIMESTAMPTZ` |
| `JSON` | `JSONB` |
| `ENUM(...)` | `TEXT` with CHECK or custom type |
| `AUTO_INCREMENT` | `SERIAL` or `GENERATED ALWAYS AS IDENTITY` |

## Step 1: Export MySQL Schema

```bash
mysqldump -u root -p --no-data --databases mydb > schema.sql
```

## Step 2: Use pgloader for Automated Migration

pgloader is the most effective tool for MySQL to PostgreSQL migration - it translates types and migrates data in a single command:

```bash
# Install pgloader
apt-get install pgloader

# Create a pgloader configuration
cat > migrate.load << 'EOF'
LOAD DATABASE
  FROM mysql://root:password@localhost/mydb
  INTO postgresql://pguser:pgpassword@localhost/mydb

WITH
  include drop,
  create tables,
  create indexes,
  reset sequences,
  foreign keys

SET
  maintenance_work_mem to '512MB',
  work_mem to '64MB'

CAST
  type bigint when (= precision 20) to bigint drop typemod,
  type tinyint with extra auto_increment to serial,
  column users.active to boolean using tinyint-to-boolean;

EXCLUDING TABLE NAMES MATCHING ~/tmp_/, ~/temp_/
EOF

# Run the migration
pgloader migrate.load
```

## Step 3: Translate MySQL-Specific Syntax

### AUTO_INCREMENT to SERIAL

```sql
-- MySQL
CREATE TABLE users (
  id INT AUTO_INCREMENT PRIMARY KEY
);

-- PostgreSQL
CREATE TABLE users (
  id SERIAL PRIMARY KEY
);
```

### GROUP_CONCAT to STRING_AGG

```sql
-- MySQL
SELECT department, GROUP_CONCAT(name ORDER BY name SEPARATOR ', ')
FROM employees
GROUP BY department;

-- PostgreSQL
SELECT department, STRING_AGG(name, ', ' ORDER BY name)
FROM employees
GROUP BY department;
```

### IFNULL to COALESCE

```sql
-- MySQL
SELECT IFNULL(phone, 'N/A') FROM customers;

-- PostgreSQL
SELECT COALESCE(phone, 'N/A') FROM customers;
```

### LIMIT / OFFSET

```sql
-- MySQL
SELECT * FROM orders LIMIT 10 OFFSET 20;

-- PostgreSQL (same syntax - no change needed)
SELECT * FROM orders LIMIT 10 OFFSET 20;
```

### Date Functions

```sql
-- MySQL
SELECT NOW(), DATE_FORMAT(created_at, '%Y-%m-%d'), DATEDIFF(end_date, start_date);

-- PostgreSQL
SELECT NOW(), TO_CHAR(created_at, 'YYYY-MM-DD'), (end_date::date - start_date::date);
```

## Step 4: Handle ENUM Types

MySQL ENUM types must be converted to either a CHECK constraint or a custom type in PostgreSQL:

```sql
-- MySQL
CREATE TABLE orders (
  status ENUM('pending', 'shipped', 'delivered')
);

-- PostgreSQL option 1: CHECK constraint
CREATE TABLE orders (
  status VARCHAR(20) CHECK (status IN ('pending', 'shipped', 'delivered'))
);

-- PostgreSQL option 2: custom type
CREATE TYPE order_status AS ENUM ('pending', 'shipped', 'delivered');
CREATE TABLE orders (
  status order_status
);
```

## Step 5: Validate the Migration

```sql
-- Compare row counts
-- MySQL:
SELECT table_name, table_rows
FROM information_schema.tables
WHERE table_schema = 'mydb';

-- PostgreSQL:
SELECT relname, n_live_tup
FROM pg_stat_user_tables
WHERE schemaname = 'public';

-- Spot-check key tables
SELECT COUNT(*) FROM users;
SELECT COUNT(*) FROM orders;
```

## Step 6: Update Application Connection Strings

```python
# MySQL connection (old)
import mysql.connector
conn = mysql.connector.connect(host='mysql-host', user='user', password='pass', database='mydb')

# PostgreSQL connection (new)
import psycopg2
conn = psycopg2.connect(host='pg-host', user='user', password='pass', dbname='mydb')
```

## Summary

Migrating from MySQL to PostgreSQL involves translating data types, converting MySQL-specific functions to PostgreSQL equivalents, and handling ENUM types. pgloader automates most of the schema translation and data migration. Focus testing on GROUP_CONCAT to STRING_AGG changes, date functions, and ENUM handling, as these are the most common sources of application breakage after migration.
