# How to Export Data to CSV in MySQL

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MySQL, CSV, Data Export, SQL, Administration

Description: Learn multiple ways to export MySQL data to CSV format including SELECT INTO OUTFILE, mysqldump, and MySQL Workbench for different use cases.

---

## Methods for Exporting to CSV

MySQL provides several ways to export data to CSV:

1. `SELECT INTO OUTFILE` - direct server-side export (fastest)
2. `mysql` client with field separator options
3. Python with the `mysql-connector` library
4. MySQL Workbench GUI export

## Method 1 - SELECT INTO OUTFILE

The most efficient method for exporting large datasets. MySQL writes directly to a file on the server:

```sql
SELECT
  id,
  name,
  email,
  created_at
FROM customers
WHERE active = 1
INTO OUTFILE '/tmp/customers_export.csv'
FIELDS TERMINATED BY ','
OPTIONALLY ENCLOSED BY '"'
LINES TERMINATED BY '\n';
```

The file is created on the server filesystem. The MySQL user must have the `FILE` privilege, and the output path must be in a directory allowed by `secure_file_priv`:

```sql
SHOW VARIABLES LIKE 'secure_file_priv';
```

## Adding a Header Row

`SELECT INTO OUTFILE` does not include column headers automatically. Use a `UNION` to prepend headers:

```sql
SELECT 'id', 'name', 'email', 'created_at'
UNION ALL
SELECT
  id,
  name,
  email,
  DATE_FORMAT(created_at, '%Y-%m-%d %H:%i:%s')
FROM customers
INTO OUTFILE '/tmp/customers_with_headers.csv'
FIELDS TERMINATED BY ','
OPTIONALLY ENCLOSED BY '"'
LINES TERMINATED BY '\n';
```

## Method 2 - mysql Client with Tab/Comma Separation

Use the `-B` (batch) flag for tab-separated output, then redirect to a file:

```bash
mysql -u root -p -B -e "SELECT id, name, email FROM customers WHERE active=1" your_database > export.tsv
```

For comma-separated output with the `sed` command:

```bash
mysql -u root -p -B -e "SELECT id, name, email FROM customers" your_database \
  | sed 's/\t/,/g' > export.csv
```

Include headers with `-H` for HTML isn't needed - `-B` includes the column names as the first row.

## Method 3 - Handling Special Characters in CSV

When data contains commas or quotes, use proper quoting:

```sql
SELECT
  id,
  REPLACE(description, '\n', ' ') AS description,
  price
FROM products
INTO OUTFILE '/tmp/products.csv'
FIELDS TERMINATED BY ','
ENCLOSED BY '"'
ESCAPED BY '"'
LINES TERMINATED BY '\r\n';
```

Using `ENCLOSED BY '"'` (without `OPTIONALLY`) wraps every field in quotes.

## Method 4 - Exporting on the Client Side

If `SELECT INTO OUTFILE` is not available (remote server or restricted `secure_file_priv`), redirect output from the client:

```bash
mysql -u root -p -e "
SELECT id, name, email, created_at
FROM customers
WHERE active = 1
" your_database | tr '\t' ',' > customers.csv
```

Or use `mysql` with the `--batch` and `--raw` flags:

```bash
mysql -u root -p --batch --raw \
  -e "SELECT id, name, email FROM customers" \
  your_database | tr '\t' ',' > output.csv
```

## Method 5 - Exporting with Python

```python
import mysql.connector
import csv

conn = mysql.connector.connect(
    host='localhost', user='app', password='secret', database='shop'
)
cursor = conn.cursor()
cursor.execute("SELECT id, name, email, created_at FROM customers WHERE active = 1")

with open('customers.csv', 'w', newline='', encoding='utf-8') as f:
    writer = csv.writer(f)
    writer.writerow([col[0] for col in cursor.description])  # headers
    writer.writerows(cursor.fetchall())

cursor.close()
conn.close()
```

## Exporting from MySQL Workbench

1. Run your query in MySQL Workbench.
2. In the result grid, click the "Export" icon (floppy disk).
3. Choose CSV as the format.
4. Select the output file location and click Export.

## Summary

MySQL offers several CSV export methods. Use `SELECT INTO OUTFILE` for the fastest server-side export of large datasets, the `mysql` client with tab-to-comma conversion for remote servers without file access, and Python or application code for exports requiring complex transformations or when writing to a specific location. Always handle quoting properly to avoid issues with embedded commas and newlines.
