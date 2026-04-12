# How to Use LOAD DATA INFILE for Data Import in MySQL

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MySQL, Data Import, LOAD DATA INFILE, SQL, Administration

Description: Learn how to use MySQL's LOAD DATA INFILE statement to bulk-import data from CSV and text files directly into tables with high performance.

---

## What Is LOAD DATA INFILE?

`LOAD DATA INFILE` is MySQL's high-performance bulk data loader. It reads a text or CSV file and inserts the data into a table. It is significantly faster than inserting rows individually because it writes data directly with minimal overhead - typically 10-20x faster than `INSERT` statements.

## Basic Syntax

```sql
LOAD DATA INFILE '/path/to/file.csv'
INTO TABLE table_name
[FIELDS
  [TERMINATED BY 'delimiter']
  [OPTIONALLY ENCLOSED BY 'enclosure_char']
  [ESCAPED BY 'escape_char']
]
[LINES
  [STARTING BY 'prefix']
  [TERMINATED BY 'newline']
]
[IGNORE n LINES]
[(column_list)];
```

## Importing a CSV File

```sql
LOAD DATA INFILE '/tmp/customers.csv'
INTO TABLE customers
FIELDS TERMINATED BY ','
OPTIONALLY ENCLOSED BY '"'
LINES TERMINATED BY '\n'
IGNORE 1 LINES
(id, first_name, last_name, email, created_at);
```

`IGNORE 1 LINES` skips the header row.

## Checking secure_file_priv

Like `SELECT INTO OUTFILE`, the file must be in a directory allowed by `secure_file_priv`:

```sql
SHOW VARIABLES LIKE 'secure_file_priv';
```

If the variable is set to `/tmp/`, place files there before loading.

## Required Privileges

```sql
GRANT FILE ON *.* TO 'import_user'@'localhost';
GRANT INSERT, UPDATE ON your_db.* TO 'import_user'@'localhost';
```

## Importing from the Client Machine (LOAD DATA LOCAL INFILE)

When the file is on the client machine (not the server), use `LOCAL`:

```sql
LOAD DATA LOCAL INFILE '/home/user/customers.csv'
INTO TABLE customers
FIELDS TERMINATED BY ','
OPTIONALLY ENCLOSED BY '"'
LINES TERMINATED BY '\n'
IGNORE 1 LINES;
```

For `LOCAL INFILE` to work:
- Server: `local_infile = ON` in `my.cnf`
- Client: connect with `--local-infile=1`

```bash
mysql --local-infile=1 -u root -p your_database
```

```text
[mysqld]
local_infile = ON
```

## Mapping File Columns to Table Columns

When the file column order differs from the table definition, specify the mapping:

```sql
LOAD DATA INFILE '/tmp/products.csv'
INTO TABLE products
FIELDS TERMINATED BY ','
LINES TERMINATED BY '\n'
IGNORE 1 LINES
(product_name, price, @category_name, stock_qty)
SET
  category_id = (SELECT id FROM categories WHERE name = @category_name),
  created_at = NOW();
```

The `@category_name` is a user variable used to transform the value before inserting.

## Handling NULL Values

Represent NULLs in the file as `\N` (the default escape for NULL in MySQL exports):

```text
1,Alice,NULL,alice@example.com
2,Bob,\N,bob@example.com
```

```sql
LOAD DATA INFILE '/tmp/data.csv'
INTO TABLE users
FIELDS TERMINATED BY ','
(id, first_name, middle_name, email);
```

MySQL interprets `\N` as NULL automatically.

## Handling Duplicate Keys

By default, `LOAD DATA INFILE` fails on duplicate key errors. Use modifiers to handle them:

```sql
-- Replace duplicates (delete old row, insert new)
LOAD DATA INFILE '/tmp/customers.csv'
REPLACE
INTO TABLE customers
FIELDS TERMINATED BY ',';

-- Ignore duplicates (skip rows with duplicate keys)
LOAD DATA INFILE '/tmp/customers.csv'
IGNORE
INTO TABLE customers
FIELDS TERMINATED BY ',';
```

## Performance Tips

Disable checks for faster loading:

```sql
ALTER TABLE customers DISABLE KEYS;
SET FOREIGN_KEY_CHECKS = 0;
SET UNIQUE_CHECKS = 0;
SET AUTOCOMMIT = 0;

LOAD DATA INFILE '/tmp/customers.csv'
INTO TABLE customers
FIELDS TERMINATED BY ','
LINES TERMINATED BY '\n'
IGNORE 1 LINES;

COMMIT;
SET FOREIGN_KEY_CHECKS = 1;
SET UNIQUE_CHECKS = 1;
ALTER TABLE customers ENABLE KEYS;
```

## Checking How Many Rows Were Loaded

After a `LOAD DATA INFILE`, the MySQL client automatically displays a result summary:

```text
Query OK, 5000 rows affected (0.12 sec)
Records: 5000  Deleted: 0  Skipped: 0  Warnings: 0
```

If there were warnings, view the details with:

```sql
SHOW WARNINGS;
```

## Summary

`LOAD DATA INFILE` is the fastest way to bulk-import data into MySQL. Use `IGNORE 1 LINES` to skip headers, `OPTIONALLY ENCLOSED BY '"'` for CSV quoting, and column mapping with user variables for transformations. Disable foreign key checks and autocommit before large imports for maximum performance. Use `LOCAL INFILE` when the file resides on the client machine rather than the server.
