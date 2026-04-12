# How to Use SHOW CREATE TABLE in MySQL

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MySQL, SHOW CREATE TABLE, DDL, Database Inspection

Description: Learn how to use SHOW CREATE TABLE in MySQL to retrieve the exact DDL statement that recreates a table, including columns, indexes, and constraints.

---

## What Is SHOW CREATE TABLE

`SHOW CREATE TABLE` displays the `CREATE TABLE` DDL statement that MySQL would use to recreate a table exactly as it currently exists. The output includes all column definitions, data types, constraints, indexes, partitioning clauses, storage engine settings, character set, collation, and auto_increment value.

This command is essential for documentation, migration scripting, debugging schema issues, and replication diagnostics.

## Basic Syntax

```sql
SHOW CREATE TABLE table_name;
SHOW CREATE TABLE table_name\G
```

The `\G` modifier formats the output vertically, which is much more readable for wide tables.

## Example Output

```sql
SHOW CREATE TABLE orders\G
```

```text
*************************** 1. row ***************************
       Table: orders
Create Table: CREATE TABLE `orders` (
  `id` int NOT NULL AUTO_INCREMENT,
  `customer_id` int NOT NULL,
  `status` varchar(20) DEFAULT 'pending',
  `total` decimal(10,2) NOT NULL DEFAULT '0.00',
  `created_at` datetime NOT NULL,
  PRIMARY KEY (`id`),
  KEY `idx_customer_id` (`customer_id`),
  CONSTRAINT `fk_orders_customer` FOREIGN KEY (`customer_id`)
    REFERENCES `customers` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=10001 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
```

## Using SHOW CREATE TABLE for Schema Documentation

Export DDL for all tables in a database to a SQL file:

```bash
mysql -u root -p -N mydb -e "
SELECT CONCAT('SHOW CREATE TABLE ', table_name, ';')
FROM information_schema.tables
WHERE table_schema = 'mydb';" | mysql -u root -p mydb > schema.sql
```

Or use `mysqldump` with schema-only flags:

```bash
mysqldump -u root -p --no-data mydb > schema.sql
```

## Identifying Index Definitions

`SHOW CREATE TABLE` is the most reliable way to see all index definitions at once, unlike `SHOW INDEX` which returns one row per index column:

```sql
SHOW CREATE TABLE products\G
-- Output includes: PRIMARY KEY, KEY, UNIQUE KEY, FULLTEXT KEY definitions
```

## Checking Foreign Key Constraints

To audit foreign key relationships on a table:

```sql
SHOW CREATE TABLE order_items\G
-- Look for CONSTRAINT ... FOREIGN KEY ... REFERENCES lines
```

## Comparing SHOW CREATE TABLE vs information_schema

| Use Case | SHOW CREATE TABLE | information_schema |
|---|---|---|
| Human-readable DDL | Yes | No |
| Programmatic column queries | No | Yes |
| Full constraint details | Yes | Partial |
| Partitioning definition | Yes | Partial |
| Script generation | Yes | No |

For scripting, `information_schema.columns`, `information_schema.table_constraints`, and `information_schema.key_column_usage` provide structured access.

## Extracting SHOW CREATE TABLE Output Programmatically

In Python, you can capture the output:

```python
import mysql.connector

conn = mysql.connector.connect(host='localhost', database='mydb',
                               user='root', password='secret')
cursor = conn.cursor()
cursor.execute('SHOW CREATE TABLE orders')
row = cursor.fetchone()
print(row[1])  # row[1] is the CREATE TABLE statement
conn.close()
```

## Using SHOW CREATE TABLE in Replication Debugging

On a replica, compare the table DDL between primary and replica to identify schema drift:

```sql
-- On primary
SHOW CREATE TABLE orders\G

-- On replica
SHOW CREATE TABLE orders\G
```

Differences in character set, collation, or index definitions can cause replication errors.

## SHOW CREATE VIEW and SHOW CREATE PROCEDURE

Similar commands exist for other object types:

```sql
SHOW CREATE VIEW order_summary\G
SHOW CREATE PROCEDURE refresh_stats\G
SHOW CREATE FUNCTION calc_tax\G
SHOW CREATE TRIGGER trg_audit_insert\G
SHOW CREATE EVENT daily_cleanup\G
```

## Summary

`SHOW CREATE TABLE` is the definitive way to inspect a table's complete DDL in MySQL, showing all columns, indexes, constraints, storage engine, and character set settings. Use it for schema documentation, migration scripting, replication debugging, and auditing. Combine it with `SHOW CREATE VIEW`, `SHOW CREATE PROCEDURE`, and similar commands to document all database objects.
