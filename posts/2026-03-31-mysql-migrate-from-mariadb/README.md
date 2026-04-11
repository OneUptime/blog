# How to Migrate from MariaDB to MySQL

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MySQL, MariaDB, Migration, Database, Administration

Description: Learn how to migrate a MariaDB database to MySQL by dumping and restoring data, handling compatibility differences, and validating the migrated schema and data.

---

MariaDB and MySQL share a common origin but have diverged significantly. Migrating from MariaDB to MySQL requires understanding the compatibility differences, dumping data carefully, and resolving any syntax or feature gaps before going live.

## Checking Compatibility Before Migration

MariaDB-specific features that may not work in MySQL include:
- `SEQUENCE` objects (not in MySQL)
- `INVISIBLE` columns (supported differently)
- `COMPRESSED` row format in InnoDB
- MariaDB-specific functions like `DECODE_ORACLE`, `SYSDATE()` behavior
- `JSON` type differences

Run a schema compatibility check by reviewing your DDL:

```bash
# In MariaDB: export all CREATE TABLE statements
mysqldump --no-data --databases mydb -u root -p > schema_only.sql
```

Then review `schema_only.sql` for any MariaDB-specific syntax before importing.

## Dumping the MariaDB Database

Use `mysqldump` from the MariaDB server:

```bash
mysqldump \
  --single-transaction \
  --routines \
  --triggers \
  --events \
  --databases mydb \
  -u root -p \
  > mariadb_dump.sql
```

For large databases, compress the dump:

```bash
mysqldump --single-transaction --databases mydb -u root -p \
  | gzip > mariadb_dump.sql.gz
```

## Handling Common Incompatibilities

### Remove MariaDB-Specific Syntax

Edit the dump file to remove or replace MariaDB-specific elements:

```bash
# Remove MariaDB-specific comments
sed -i 's/\/\*M!100316[^*]*\*\///g' mariadb_dump.sql

# Replace ROW_FORMAT=COMPRESSED with ROW_FORMAT=DYNAMIC for InnoDB
sed -i 's/ROW_FORMAT=COMPRESSED/ROW_FORMAT=DYNAMIC/g' mariadb_dump.sql

# Remove SEQUENCE references if present
grep -n 'SEQUENCE\|NEXTVAL\|SETVAL' mariadb_dump.sql
```

### Handling Character Set Differences

MariaDB uses `utf8mb3` internally for `utf8`. MySQL 8.0 still aliases `utf8` to `utf8mb3` but has deprecated this alias in favor of `utf8mb4`. Normalize the dump to `utf8mb4` for full Unicode support:

```bash
sed -i 's/utf8mb3/utf8mb4/g; s/ CHARSET=utf8 / CHARSET=utf8mb4 /g' mariadb_dump.sql
```

## Importing into MySQL

On the MySQL server, create the target database and import:

```bash
# Create the database
mysql -u root -p -e "CREATE DATABASE mydb CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;"

# Import the dump
mysql -u root -p mydb < mariadb_dump.sql

# Or from a compressed file
gunzip -c mariadb_dump.sql.gz | mysql -u root -p mydb
```

## Validating the Migration

After import, verify row counts and data integrity:

```sql
-- Compare table list
SELECT table_name, table_rows
FROM information_schema.tables
WHERE table_schema = 'mydb'
ORDER BY table_name;
```

Run this on both the MariaDB source and MySQL target and compare the output. For critical tables, do an exact row count:

```sql
SELECT COUNT(*) FROM mydb.orders;
SELECT COUNT(*) FROM mydb.customers;
```

Check for import errors in the MySQL error log:

```bash
tail -n 100 /var/log/mysql/error.log | grep -i error
```

## Migrating Stored Procedures and Functions

Stored procedures that use MariaDB-specific syntax may need rewriting. Test each routine after import:

```sql
-- List all procedures
SHOW PROCEDURE STATUS WHERE Db = 'mydb';

-- Test a procedure
CALL mydb.my_procedure();
```

## Updating Application Connection Strings

Update your application to point to MySQL. The connection string format is identical for most drivers:

```bash
# MariaDB connection string
mysql://user:password@mariadb-host:3306/mydb

# MySQL connection string (same format)
mysql://user:password@mysql-host:3306/mydb
```

Test with a simple query after switching:

```bash
mysql -u appuser -p -h mysql-host mydb -e "SELECT 1;"
```

## Summary

Migrating from MariaDB to MySQL involves dumping the database with `--single-transaction`, cleaning MariaDB-specific syntax from the dump file (compressed row formats, character set aliases, MariaDB comment blocks), importing into MySQL, and validating row counts and stored procedures. Most standard SQL workloads migrate cleanly; the main effort is identifying and resolving any MariaDB-specific SQL extensions used in your schema or application code.
