# How to Use LOAD DATA INFILE for Fast Data Import in MySQL

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MySQL, LOAD DATA INFILE, Data Import, Bulk Loading, Performance

Description: Learn how to use LOAD DATA INFILE in MySQL for high-speed bulk data imports from CSV and text files, with options for custom delimiters and error handling.

---

## What Is LOAD DATA INFILE?

`LOAD DATA INFILE` is MySQL's fastest bulk data import mechanism. It reads data directly from a file on the server filesystem and inserts it into a table. It is typically 20x or more faster than inserting the same data row-by-row using individual INSERT statements.

```sql
LOAD DATA INFILE '/var/lib/mysql-files/users.csv'
INTO TABLE users
FIELDS TERMINATED BY ','
ENCLOSED BY '"'
LINES TERMINATED BY '\n'
IGNORE 1 ROWS;
```

## Prerequisites and File Location

```sql
-- Check the secure_file_priv variable to know which directory is allowed
SHOW VARIABLES LIKE 'secure_file_priv';
-- Files must be in this directory (e.g., /var/lib/mysql-files/)

-- Check if LOCAL is enabled (for client-side files)
SHOW VARIABLES LIKE 'local_infile';
```

## Basic CSV Import

Given a CSV file `/var/lib/mysql-files/products.csv`:

```text
1,Widget A,Electronics,19.99,100
2,Widget B,Clothing,34.99,50
3,Widget C,Electronics,9.99,200
```

```sql
CREATE TABLE products (
    id INT,
    name VARCHAR(100),
    category VARCHAR(50),
    price DECIMAL(10, 2),
    stock INT
);

LOAD DATA INFILE '/var/lib/mysql-files/products.csv'
INTO TABLE products
FIELDS TERMINATED BY ','
LINES TERMINATED BY '\n';
```

## CSV with Headers

```sql
-- Skip the header row with IGNORE 1 ROWS
LOAD DATA INFILE '/var/lib/mysql-files/customers.csv'
INTO TABLE customers
FIELDS TERMINATED BY ','
ENCLOSED BY '"'
LINES TERMINATED BY '\n'
IGNORE 1 ROWS;
```

## Specifying Column Mapping

When the file columns don't match the table columns:

```sql
-- Map specific columns from file to table columns
LOAD DATA INFILE '/var/lib/mysql-files/import.csv'
INTO TABLE orders
FIELDS TERMINATED BY ','
ENCLOSED BY '"'
LINES TERMINATED BY '\n'
IGNORE 1 ROWS
(order_id, customer_email, product_name, quantity, @order_date_str)
SET order_date = STR_TO_DATE(@order_date_str, '%m/%d/%Y'),
    imported_at = NOW();
```

## Using LOAD DATA LOCAL INFILE

When the file is on the client machine (not the MySQL server):

```bash
mysql --local-infile=1 -u root -p mydb
```

```sql
-- Enable local infile on the server (requires SYSTEM_VARIABLES_ADMIN or SUPER privilege)
SET GLOBAL local_infile = 1;

-- Load from client machine
LOAD DATA LOCAL INFILE '/home/user/data/sales.csv'
INTO TABLE sales
FIELDS TERMINATED BY ','
ENCLOSED BY '"'
LINES TERMINATED BY '\n'
IGNORE 1 ROWS;
```

## Handling Different Delimiters

```sql
-- Tab-separated values (TSV)
LOAD DATA INFILE '/var/lib/mysql-files/data.tsv'
INTO TABLE employee_data
FIELDS TERMINATED BY '\t'
LINES TERMINATED BY '\n'
IGNORE 1 ROWS;

-- Pipe-delimited
LOAD DATA INFILE '/var/lib/mysql-files/data.txt'
INTO TABLE records
FIELDS TERMINATED BY '|'
LINES TERMINATED BY '\r\n';

-- Fixed width fields using SET expressions
LOAD DATA INFILE '/var/lib/mysql-files/fixed.txt'
INTO TABLE fixed_data
FIELDS TERMINATED BY ''  -- No delimiter
LINES TERMINATED BY '\n'
(@line)
SET col1 = SUBSTR(@line, 1, 10),
    col2 = SUBSTR(@line, 11, 20),
    col3 = SUBSTR(@line, 31, 5);
```

## Error Handling Options

```sql
-- Use IGNORE to skip rows that cause duplicate key or constraint errors
LOAD DATA INFILE '/var/lib/mysql-files/data.csv'
IGNORE INTO TABLE products
FIELDS TERMINATED BY ','
LINES TERMINATED BY '\n'
IGNORE 1 ROWS;
-- Check warnings after loading
SHOW WARNINGS;

-- Use REPLACE to overwrite existing rows on duplicate key
LOAD DATA INFILE '/var/lib/mysql-files/data.csv'
REPLACE INTO TABLE products
FIELDS TERMINATED BY ','
LINES TERMINATED BY '\n';
```

## Performance Tips

```bash
# Prepare the CSV file before importing
sort -t, -k1 /data/large_file.csv > /var/lib/mysql-files/sorted_data.csv
```

```sql
-- Disable indexes during bulk load for large imports (MyISAM only; no effect on InnoDB)
ALTER TABLE large_table DISABLE KEYS;

LOAD DATA INFILE '/var/lib/mysql-files/large_data.csv'
INTO TABLE large_table
FIELDS TERMINATED BY ','
LINES TERMINATED BY '\n';

-- Re-enable and rebuild indexes after load
ALTER TABLE large_table ENABLE KEYS;

-- Also consider disabling autocommit for large imports
SET autocommit = 0;
LOAD DATA INFILE '/var/lib/mysql-files/data.csv' INTO TABLE staging;
COMMIT;
```

## Summary

`LOAD DATA INFILE` is the fastest way to bulk-import data into MySQL, capable of loading millions of rows in seconds. Use the `FIELDS TERMINATED BY` and `ENCLOSED BY` options to match your file format, `IGNORE N ROWS` to skip header lines, and column mapping with user variables for data transformations. For maximum performance on large imports, disable indexes before loading and re-enable them afterward.
