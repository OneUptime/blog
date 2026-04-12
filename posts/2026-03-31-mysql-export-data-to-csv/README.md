# How to Export MySQL Data to CSV

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MySQL, CSV, Export, SELECT INTO OUTFILE, Data Migration

Description: Learn how to export MySQL query results to CSV files using SELECT INTO OUTFILE and the mysql command-line client for easy data extraction.

---

## Introduction

Exporting MySQL data to CSV is useful for reporting, data sharing, backups, and migrations. MySQL offers several approaches: `SELECT INTO OUTFILE` for server-side exports and the `mysql` command-line client for client-side exports with more flexibility.

## Using SELECT INTO OUTFILE

`SELECT INTO OUTFILE` writes query results directly to a file on the MySQL server:

```sql
SELECT id, name, email, created_at
FROM customers
INTO OUTFILE '/tmp/customers_export.csv'
FIELDS TERMINATED BY ','
OPTIONALLY ENCLOSED BY '"'
LINES TERMINATED BY '\n';
```

The file must not already exist, and the MySQL process user must have write permission to the target directory.

## Adding a Header Row

`SELECT INTO OUTFILE` does not add column headers automatically. Use a UNION trick:

```sql
SELECT 'id', 'name', 'email', 'created_at'
UNION ALL
SELECT id, name, email, created_at
FROM customers
INTO OUTFILE '/tmp/customers_with_header.csv'
FIELDS TERMINATED BY ','
OPTIONALLY ENCLOSED BY '"'
LINES TERMINATED BY '\n';
```

## Client-Side Export with the mysql Client

For client-side exports where the file lands on your local machine:

```bash
mysql -u root -p mydb \
  --batch \
  --silent \
  -e "SELECT id, name, email, created_at FROM customers" \
  | sed 's/\t/,/g' > /tmp/customers.csv
```

The `--batch` flag suppresses the MySQL table borders and uses tab delimiters. The `sed` command converts tabs to commas.

## Export with Headers Using mysql Client

```bash
mysql -u root -p mydb \
  --batch \
  --silent \
  -e "SELECT 'id','name','email','created_at' UNION ALL SELECT id,name,email,created_at FROM customers" \
  | sed 's/\t/,/g' > /tmp/customers_with_header.csv
```

## Exporting with mysqldump for Structured CSV

For structured CSV exports that include the schema:

```bash
mysqldump \
  --tab=/tmp/export/ \
  --fields-terminated-by=',' \
  --fields-optionally-enclosed-by='"' \
  --lines-terminated-by='\n' \
  -u root -p mydb customers
```

This creates both a `customers.txt` data file and a `customers.sql` schema file in the output directory.

## Exporting a Filtered Dataset

Export only active users created in the past month:

```sql
SELECT id, name, email, created_at
FROM customers
WHERE active = 1
  AND created_at >= DATE_SUB(NOW(), INTERVAL 30 DAY)
INTO OUTFILE '/tmp/recent_customers.csv'
FIELDS TERMINATED BY ','
OPTIONALLY ENCLOSED BY '"'
LINES TERMINATED BY '\n';
```

## Handling Special Characters

When field values contain commas or quotes, enclosing fields in double quotes is essential:

```sql
SELECT id, name, description
FROM products
INTO OUTFILE '/tmp/products.csv'
FIELDS TERMINATED BY ','
ENCLOSED BY '"'
ESCAPED BY '\\'
LINES TERMINATED BY '\n';
```

## Summary

MySQL provides flexible options for CSV export. `SELECT INTO OUTFILE` is the fastest for server-side exports, while the `mysql --batch` approach works well when you need files on the client machine. Always handle header rows explicitly and enclose fields in quotes when data may contain delimiters or newlines.
