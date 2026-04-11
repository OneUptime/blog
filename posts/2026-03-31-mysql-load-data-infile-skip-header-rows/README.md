# How to Use LOAD DATA INFILE to Skip Header Rows in MySQL

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MySQL, LOAD DATA INFILE, Import, Header Row, Data Migration

Description: Learn how to skip header rows and multiple leading lines when importing flat files into MySQL using LOAD DATA INFILE's IGNORE clause.

---

## Introduction

Most CSV and TSV exports include a header row containing column names. MySQL's `LOAD DATA INFILE` provides the `IGNORE n ROWS` clause to skip any number of leading lines before data import begins. This guide covers skipping headers, multiple preamble lines, and handling edge cases.

## Skipping a Single Header Row

The most common case - a CSV with one header line:

```text
id,name,email,created_at
1,Alice,alice@example.com,2025-01-01
2,Bob,bob@example.com,2025-01-02
```

```sql
LOAD DATA INFILE '/tmp/users.csv'
INTO TABLE users
FIELDS TERMINATED BY ','
OPTIONALLY ENCLOSED BY '"'
LINES TERMINATED BY '\n'
IGNORE 1 ROWS;
```

`IGNORE 1 ROWS` tells MySQL to skip exactly one line from the top of the file before beginning to parse data rows.

## Skipping Multiple Header Lines

Some files include a title, metadata, or blank lines before actual column headers:

```text
Report: User Export
Generated: 2025-01-15
id,name,email
1,Alice,alice@example.com
```

Skip the first three lines (two metadata lines plus the header):

```sql
LOAD DATA INFILE '/tmp/report.csv'
INTO TABLE users
FIELDS TERMINATED BY ','
OPTIONALLY ENCLOSED BY '"'
LINES TERMINATED BY '\n'
IGNORE 3 ROWS;
```

## Using LINES STARTING BY to Filter Lines

`LINES STARTING BY` causes MySQL to skip any line that does not contain the specified prefix. When a line does contain the prefix, everything before and including the prefix is stripped. This is useful when data lines have a consistent prefix:

```text
# comment line
# another comment
DATA:1,Alice,alice@example.com
DATA:2,Bob,bob@example.com
```

```sql
LOAD DATA INFILE '/tmp/prefixed.dat'
INTO TABLE users
FIELDS TERMINATED BY ','
LINES STARTING BY 'DATA:'
TERMINATED BY '\n'
(id, name, email);
```

## Combining IGNORE with LINES STARTING BY

You can combine both clauses. `LINES STARTING BY` strips the line prefix while `IGNORE` skips leading lines:

```sql
LOAD DATA INFILE '/tmp/export.dat'
INTO TABLE sales
FIELDS TERMINATED BY '|'
LINES STARTING BY 'ROW:'
TERMINATED BY '\n'
IGNORE 2 ROWS;
```

## Verifying Which Rows Were Skipped

After import, compare expected row count:

```bash
# Count data rows in file (excluding header)
wc -l users.csv
# Subtract 1 for the header line

# Compare with MySQL
mysql -u root -p mydb -e "SELECT COUNT(*) FROM users;"
```

## Handling Files Without Headers

If a file has no header, simply omit `IGNORE`:

```sql
LOAD DATA INFILE '/tmp/no_header.csv'
INTO TABLE users
FIELDS TERMINATED BY ','
LINES TERMINATED BY '\n';
```

## Stripping Headers Before Import with Shell

Alternatively, pre-process the file to remove headers before passing to MySQL:

```bash
# Remove first line
tail -n +2 users_with_header.csv > /tmp/users_no_header.csv

mysql -u root -p mydb -e "
LOAD DATA INFILE '/tmp/users_no_header.csv'
INTO TABLE users
FIELDS TERMINATED BY ','
LINES TERMINATED BY '\n';
"
```

## Checking Import Warnings

After import, check for any rows that were skipped due to errors:

```sql
SHOW WARNINGS;
```

This reveals malformed rows, type conversion issues, or lines that could not be parsed.

## Summary

`IGNORE n ROWS` is the standard way to skip header lines in `LOAD DATA INFILE`. For more complex filtering, `LINES STARTING BY` restricts import to lines matching a specific prefix. Always verify row counts after import and review `SHOW WARNINGS` to catch any data quality issues that MySQL silently skipped.
