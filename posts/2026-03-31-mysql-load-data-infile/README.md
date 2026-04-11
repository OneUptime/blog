# How to Use LOAD DATA INFILE in MySQL for Bulk Imports

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MySQL, SQL, DML, LOAD DATA, Bulk Import, CSV

Description: Import large CSV or delimited files into MySQL tables with LOAD DATA INFILE, configure delimiters, handle headers, and set up required server permissions.

---

## How It Works

`LOAD DATA INFILE` reads rows directly from a file on the server's filesystem and inserts them into a table. It bypasses the normal row-by-row INSERT pipeline, making it orders of magnitude faster for loading millions of rows.

```mermaid
flowchart LR
    A[CSV file on disk] --> B[LOAD DATA INFILE]
    B --> C[Parse rows according\nto FIELDS/LINES options]
    C --> D[Bulk insert into\ntarget table]
    D --> E[Commit]
```

## Server Configuration

The `LOAD DATA INFILE` command requires either:
- The file to be on the MySQL server and `secure_file_priv` to allow the directory, or
- The `LOCAL` keyword, which reads the file from the client machine.

Check the `secure_file_priv` setting.

```sql
SHOW VARIABLES LIKE 'secure_file_priv';
```

```text
+------------------+-----------------------+
| Variable_name    | Value                 |
+------------------+-----------------------+
| secure_file_priv | /var/lib/mysql-files/ |
+------------------+-----------------------+
```

Files must be placed in this directory (or its subdirectories) for server-side `LOAD DATA INFILE` to work.

## Syntax

```sql
LOAD DATA [LOCAL] INFILE 'file_path'
[REPLACE | IGNORE]
INTO TABLE table_name
[CHARACTER SET charset]
[FIELDS
    [TERMINATED BY 'delimiter']
    [ENCLOSED BY 'quote_char']
    [ESCAPED BY 'escape_char']
]
[LINES
    [STARTING BY 'prefix']
    [TERMINATED BY 'line_end']
]
[IGNORE n LINES]
[(col_name_or_user_var, ...)]
[SET col = expression, ...];
```

## Preparing the Sample Data

Create a CSV file `/var/lib/mysql-files/products.csv`.

```text
sku,name,price,in_stock
SKU-001,Widget,9.99,1
SKU-002,Gadget,29.99,1
SKU-003,Doohickey,4.99,0
SKU-004,Thingamajig,14.99,1
SKU-005,Whatchamacallit,2.99,1
```

Create the target table.

```sql
CREATE TABLE products (
    id       INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    sku      VARCHAR(50)    NOT NULL UNIQUE,
    name     VARCHAR(255)   NOT NULL,
    price    DECIMAL(10, 2) NOT NULL,
    in_stock BOOLEAN        NOT NULL DEFAULT TRUE
);
```

## Loading a CSV File

```sql
LOAD DATA INFILE '/var/lib/mysql-files/products.csv'
INTO TABLE products
CHARACTER SET utf8mb4
FIELDS TERMINATED BY ','
       ENCLOSED BY '"'
       ESCAPED BY '\\'
LINES TERMINATED BY '\n'
IGNORE 1 LINES          -- skip the header row
(sku, name, price, in_stock);
```

```text
Query OK, 5 rows affected (0.02 sec)
Records: 5  Deleted: 0  Skipped: 0  Warnings: 0
```

Verify the data.

```sql
SELECT * FROM products;
```

```text
+----+---------+-----------------+-------+----------+
| id | sku     | name            | price | in_stock |
+----+---------+-----------------+-------+----------+
|  1 | SKU-001 | Widget          |  9.99 |        1 |
|  2 | SKU-002 | Gadget          | 29.99 |        1 |
|  3 | SKU-003 | Doohickey       |  4.99 |        0 |
|  4 | SKU-004 | Thingamajig     | 14.99 |        1 |
|  5 | SKU-005 | Whatchamacallit |  2.99 |        1 |
+----+---------+-----------------+-------+----------+
```

## Loading from the Client Machine (LOCAL)

When the file is on the client machine, not the server, use `LOAD DATA LOCAL INFILE`.

```bash
mysql --local-infile=1 -u appuser -p myapp
```

```sql
LOAD DATA LOCAL INFILE '/home/user/products.csv'
INTO TABLE products
FIELDS TERMINATED BY ','
LINES TERMINATED BY '\n'
IGNORE 1 LINES
(sku, name, price, in_stock);
```

The server must have `local_infile = ON` for this to work.

```sql
SET GLOBAL local_infile = 1;
```

## Handling Different Delimiters

Tab-separated file (TSV):

```sql
LOAD DATA INFILE '/var/lib/mysql-files/products.tsv'
INTO TABLE products
FIELDS TERMINATED BY '\t'
LINES TERMINATED BY '\n'
IGNORE 1 LINES
(sku, name, price, in_stock);
```

Pipe-separated file:

```sql
LOAD DATA INFILE '/var/lib/mysql-files/products.psv'
INTO TABLE products
FIELDS TERMINATED BY '|'
LINES TERMINATED BY '\n'
IGNORE 1 LINES
(sku, name, price, in_stock);
```

## Using Variables to Transform Data on Load

Use user variables (`@var`) to intercept raw values and transform them before inserting.

```sql
-- CSV has price in cents (999, 2999, ...)
-- We want to store it in dollars (9.99, 29.99, ...)
LOAD DATA INFILE '/var/lib/mysql-files/products_cents.csv'
INTO TABLE products
FIELDS TERMINATED BY ','
LINES TERMINATED BY '\n'
IGNORE 1 LINES
(sku, name, @price_cents, in_stock)
SET price = @price_cents / 100;
```

## Handling Duplicates

```sql
-- Skip rows that would cause duplicate key errors
LOAD DATA INFILE '/var/lib/mysql-files/products.csv'
IGNORE
INTO TABLE products
...;

-- Replace existing rows with new ones
LOAD DATA INFILE '/var/lib/mysql-files/products.csv'
REPLACE
INTO TABLE products
...;
```

## Performance Tips

For MyISAM tables, disable non-unique index updates during the load and rebuild them afterwards:

```sql
ALTER TABLE products DISABLE KEYS;

LOAD DATA INFILE '/var/lib/mysql-files/large_products.csv'
INTO TABLE products
...;

ALTER TABLE products ENABLE KEYS;
```

`DISABLE KEYS` / `ENABLE KEYS` only affects MyISAM tables. For InnoDB tables (the default engine), this command is silently ignored. Instead, temporarily adjust these settings.

```sql
SET FOREIGN_KEY_CHECKS = 0;
SET UNIQUE_CHECKS = 0;
SET autocommit = 0;

LOAD DATA INFILE '/var/lib/mysql-files/large_products.csv'
INTO TABLE products ...;

COMMIT;
SET FOREIGN_KEY_CHECKS = 1;
SET UNIQUE_CHECKS = 1;
SET autocommit = 1;
```

## Monitoring Progress

For large files, monitor progress in another session.

```sql
SELECT
    EVENT_NAME,
    WORK_COMPLETED,
    WORK_ESTIMATED,
    ROUND(WORK_COMPLETED / WORK_ESTIMATED * 100, 1) AS pct_done
FROM performance_schema.events_stages_current
WHERE EVENT_NAME LIKE '%load%';
```

## Best Practices

- Copy files to `secure_file_priv` directory before loading to avoid permission errors.
- Always use `IGNORE 1 LINES` if the CSV has a header row.
- Use `CHARACTER SET utf8mb4` to handle non-ASCII characters correctly.
- Disable foreign key checks and unique checks before large loads; re-enable and verify after.
- Use `IGNORE` or `REPLACE` to handle duplicate keys during incremental loads.
- Validate the row count after loading: `SELECT COUNT(*) FROM table`.

## Summary

`LOAD DATA INFILE` is the fastest way to bulk-load CSV or delimited files into MySQL, significantly faster than repeated `INSERT` statements. Configure the import path with `secure_file_priv`, specify delimiters with `FIELDS TERMINATED BY`, skip header rows with `IGNORE 1 LINES`, and transform data using user variables in the `SET` clause. For InnoDB tables, disable foreign key checks and unique checks during the load to maximise throughput.
