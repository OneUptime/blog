# How to Use SELECT INTO OUTFILE for Data Export in MySQL

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MySQL, Data Export, SELECT INTO OUTFILE, SQL, Administration

Description: Learn how to use MySQL's SELECT INTO OUTFILE statement to export query results directly to a file on the server with custom delimiters and formatting.

---

## What Is SELECT INTO OUTFILE?

`SELECT INTO OUTFILE` is a MySQL extension to the `SELECT` statement that writes query results directly to a file on the MySQL server's filesystem. It is the most performant way to export large datasets because data is written by the MySQL server process without client round-trips.

## Basic Syntax

```sql
SELECT columns
FROM table
WHERE conditions
INTO OUTFILE '/path/to/output.csv'
[FIELDS
  [TERMINATED BY 'delimiter']
  [OPTIONALLY ENCLOSED BY 'enclosure_char']
  [ESCAPED BY 'escape_char']
]
[LINES
  [STARTING BY 'prefix']
  [TERMINATED BY 'newline']
];
```

## Simple CSV Export

```sql
SELECT id, first_name, last_name, email
FROM customers
WHERE active = 1
INTO OUTFILE '/tmp/customers.csv'
FIELDS TERMINATED BY ','
OPTIONALLY ENCLOSED BY '"'
LINES TERMINATED BY '\n';
```

The file is created on the MySQL server, not the client machine.

## Checking secure_file_priv

MySQL restricts where files can be written via `secure_file_priv`:

```sql
SHOW VARIABLES LIKE 'secure_file_priv';
```

```text
+------------------+-------+
| Variable_name    | Value |
+------------------+-------+
| secure_file_priv | /tmp/ |
+------------------+-------+
```

You can only write to `/tmp/` (or wherever `secure_file_priv` points). An empty value means no restriction (not recommended for production). If `secure_file_priv = NULL`, `SELECT INTO OUTFILE` is completely disabled.

Configure in `my.cnf`:

```text
[mysqld]
secure_file_priv = /var/exports
```

## Required Privileges

The executing user needs the `FILE` privilege:

```sql
GRANT FILE ON *.* TO 'export_user'@'localhost';
```

## Tab-Separated Export

```sql
SELECT order_id, customer_id, total_amount, order_date
FROM orders
WHERE YEAR(order_date) = 2024
INTO OUTFILE '/tmp/orders_2024.tsv'
FIELDS TERMINATED BY '\t'
LINES TERMINATED BY '\n';
```

## Handling NULL Values

By default, MySQL writes `\N` for NULL values in the output file. To replace NULLs with empty strings:

```sql
SELECT
  id,
  IFNULL(first_name, '') AS first_name,
  IFNULL(last_name, '') AS last_name,
  IFNULL(phone, '') AS phone
FROM customers
INTO OUTFILE '/tmp/customers_no_null.csv'
FIELDS TERMINATED BY ','
OPTIONALLY ENCLOSED BY '"'
LINES TERMINATED BY '\n';
```

## Exporting with Custom Escape Character

The default escape character is `\`. For files that will be imported by tools expecting different escaping:

```sql
SELECT product_name, description, price
FROM products
INTO OUTFILE '/tmp/products.csv'
FIELDS TERMINATED BY ','
ENCLOSED BY '"'
ESCAPED BY '\\'
LINES TERMINATED BY '\r\n';
```

## Export Large Table in Batches

For very large tables, export in batches using `LIMIT` and `OFFSET`:

```bash
#!/bin/bash
BATCH=100000
OFFSET=0
FILE_NUM=1

while true; do
  COUNT=$(mysql -u root -pPass shop -se \
    "SELECT COUNT(*) FROM (SELECT 1 FROM big_table LIMIT $BATCH OFFSET $OFFSET) AS t")

  if [ "$COUNT" -eq "0" ]; then break; fi

  mysql -u root -pPass shop -e \
    "SELECT * FROM big_table LIMIT $BATCH OFFSET $OFFSET
     INTO OUTFILE '/tmp/export_${FILE_NUM}.csv'
     FIELDS TERMINATED BY ',' OPTIONALLY ENCLOSED BY '\"'
     LINES TERMINATED BY '\n'"

  OFFSET=$((OFFSET + BATCH))
  FILE_NUM=$((FILE_NUM + 1))
done
```

## Cannot Overwrite Existing Files

MySQL will not overwrite an existing file. If the file already exists:

```text
ERROR 1086 (HY000): File '/tmp/customers.csv' already exists
```

Delete or rename the file first:

```bash
rm /tmp/customers.csv
```

## Downloading the File from the Server

The file is on the server. Copy it to the client:

```bash
scp user@mysql-server:/tmp/customers.csv ./customers.csv
```

Or use `rsync`:

```bash
rsync -avz user@mysql-server:/tmp/customers.csv ./
```

## Summary

`SELECT INTO OUTFILE` exports query results directly to a file on the MySQL server filesystem. Specify delimiters with `FIELDS TERMINATED BY` and `OPTIONALLY ENCLOSED BY` for standard CSV format. Check `secure_file_priv` to know which directories are allowed for output. The MySQL user needs the `FILE` privilege, and the output file must not already exist.
