# How to Use mysqlshow Command-Line Tool

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MySQL, Command Line, Schema, Administration

Description: Learn how to use the mysqlshow command-line tool to quickly inspect MySQL databases, tables, and columns without opening an interactive SQL session.

---

## What Is mysqlshow?

`mysqlshow` is a MySQL command-line utility that displays information about databases, tables, and column definitions in a compact, shell-friendly output format. It is a fast alternative to running `SHOW DATABASES`, `SHOW TABLES`, or `DESCRIBE` queries inside the `mysql` client, making it useful in scripts and automation.

## Basic Syntax

```bash
mysqlshow [options] [database_name [table_name [column_name]]]
```

- No arguments: lists all databases
- One argument: lists tables in the database
- Two arguments: lists columns in the table
- Three arguments: shows information for a specific column

## Listing All Databases

```bash
mysqlshow -u root -p
```

```text
+--------------------+
|     Databases      |
+--------------------+
| information_schema |
| mydb               |
| performance_schema |
| sys                |
+--------------------+
```

## Listing Tables in a Database

```bash
mysqlshow -u root -p mydb
```

```text
Database: mydb
+------------+
|   Tables   |
+------------+
| customers  |
| orders     |
| products   |
+------------+
```

## Describing a Table's Columns

```bash
mysqlshow -u root -p mydb orders
```

```text
Database: mydb  Table: orders
+--------------+---------------+------+-----+---------+----------------+
| Field        | Type          | Null | Key | Default | Extra          |
+--------------+---------------+------+-----+---------+----------------+
| id           | int           | NO   | PRI | NULL    | auto_increment |
| customer_id  | int           | YES  | MUL | NULL    |                |
| total        | decimal(10,2) | YES  |     | NULL    |                |
| status       | varchar(50)   | YES  |     | pending |                |
| created_at   | datetime      | YES  |     | NULL    |                |
+--------------+---------------+------+-----+---------+----------------+
```

## Looking Up a Specific Column

```bash
mysqlshow -u root -p mydb orders status
```

## Useful Options

```bash
# Show row counts for each table
mysqlshow -u root -p --count mydb

# Display extra table status information (engine, rows, data length, etc.)
mysqlshow -u root -p --status mydb

# Use a wildcard to filter tables (% matches any string)
mysqlshow -u root -p mydb 'order%'

# Show only tables matching a pattern
mysqlshow -u root -p mydb 'cust%'
```

## Combining with Shell Pipelines

```bash
# Count number of tables in a database
mysqlshow -u root -p mydb | grep -v "^+" | grep -v "Tables" | wc -l

# List all databases to a file
mysqlshow -u root -p > databases.txt

# Find which databases contain a table named 'users'
for db in $(mysqlshow -u root -p | awk '/\| / {print $2}'); do
  mysqlshow -u root -p "$db" 2>/dev/null | grep -q '| users ' && echo "$db has users table"
done
```

## Connecting to a Remote Host

```bash
mysqlshow -h db.example.com -P 3306 -u app_user -p mydb
```

## Using login-path for Passwordless Invocation

```bash
# Store credentials
mysql_config_editor set --login-path=prod --host=db.example.com --user=dba --password

# Use login-path with mysqlshow
mysqlshow --login-path=prod mydb
```

## Comparison with SQL Equivalents

```bash
# mysqlshow                   | SQL equivalent
# ----------------------------|----------------------------
# mysqlshow                   | SHOW DATABASES;
# mysqlshow mydb              | SHOW TABLES FROM mydb;
# mysqlshow mydb orders       | DESCRIBE mydb.orders;
# mysqlshow --count mydb      | SHOW TABLE STATUS FROM mydb;
```

## Summary

`mysqlshow` is a lightweight shell-friendly tool for inspecting MySQL schema objects without starting an interactive session. Use it with `--count` to check row volumes, with wildcard patterns to filter tables, and in shell scripts where you need quick schema introspection. It covers the most common use cases of `SHOW DATABASES`, `SHOW TABLES`, and `DESCRIBE` without requiring any SQL knowledge.
