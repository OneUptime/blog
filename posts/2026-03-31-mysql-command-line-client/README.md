# How to Use mysql Command-Line Client

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MySQL, Command Line, Client, Administration

Description: Learn how to use the mysql command-line client to connect to MySQL, run queries, execute scripts, and work productively from the terminal.

---

## What Is the mysql Command-Line Client?

The `mysql` command-line client is the primary interactive tool for working with MySQL servers. You can use it to run SQL queries interactively, execute SQL scripts from files, import data, inspect databases, and administer server settings - all from a terminal without needing a GUI.

## Basic Connection

```bash
# Connect to a local server
mysql -u root -p

# Connect to a remote server on a specific port
mysql -h db.example.com -P 3306 -u app_user -p mydb

# Connect with a password inline (not recommended for production)
mysql -u root -pMyPassword123

# Connect using a socket file
mysql -u root -p --socket=/var/run/mysqld/mysqld.sock
```

## Running a Single Query

```bash
# Execute a query and exit
mysql -u root -p -e "SHOW DATABASES;"

# Execute against a specific database
mysql -u root -p mydb -e "SELECT COUNT(*) FROM orders;"

# Suppress the output header for scripting
mysql -u root -p -e "SELECT @@version;" --skip-column-names
```

## Executing SQL Scripts

```bash
# Run a SQL script file
mysql -u root -p mydb < /tmp/schema.sql

# Pipe SQL directly
echo "DROP TABLE IF EXISTS temp_data;" | mysql -u root -p mydb

# Save output to a file
mysql -u root -p mydb -e "SELECT * FROM orders;" > /tmp/orders_export.txt
```

## Interactive Mode Features

Once connected, you have access to several useful commands:

```sql
-- List available databases
SHOW DATABASES;

-- Select a database
USE mydb;

-- List tables
SHOW TABLES;

-- Describe a table
DESCRIBE orders;
DESC orders;

-- Show vertical output (one column per line)
SELECT * FROM orders LIMIT 1\G

-- Show warnings after a query
SHOW WARNINGS;
```

## Useful Client Commands

```text
\h or help     - show help
\q or quit     - exit the client
\# or rehash   - rebuild tab-completion cache
\s or status   - show connection and server status
\!             - execute a shell command (e.g., \! ls /tmp)
\e             - edit the current query in your default editor
\T filename    - tee output to a file (and the screen)
\t             - stop teeing
```

## Formatting Output

```bash
# Table format (default)
mysql -u root -p -e "SELECT id, name FROM customers LIMIT 5;"

# Vertical format (column-per-line, useful for wide tables)
mysql -u root -p -e "SELECT * FROM customers LIMIT 1\G"

# Tab-separated (useful for parsing in scripts)
mysql -u root -p --batch -e "SELECT id, name FROM customers;" > output.tsv

# No column headers
mysql -u root -p --skip-column-names -e "SELECT COUNT(*) FROM orders;"
```

## Using login-path for Secure Connections

Avoid typing passwords by storing credentials in `~/.mylogin.cnf`:

```bash
# Store credentials securely
mysql_config_editor set --login-path=local --host=127.0.0.1 --user=root --password

# Connect using the login path
mysql --login-path=local mydb

# List stored login paths
mysql_config_editor print --all
```

## Connecting Over SSL

```bash
mysql -u app_user -p \
  --ssl-ca=/etc/mysql/certs/ca.pem \
  --ssl-cert=/etc/mysql/certs/client-cert.pem \
  --ssl-key=/etc/mysql/certs/client-key.pem \
  -h db.example.com mydb
```

Once connected, verify SSL is active:

```sql
SHOW SESSION STATUS LIKE 'Ssl_cipher';
```

## Summary

The `mysql` command-line client is a versatile tool that covers everything from interactive query exploration to scripted automation. Use `-e` for one-off queries, redirect `<` for batch script execution, `--batch` for script-friendly output, and `mysql_config_editor` for secure credential storage. Mastering the `mysql` client reduces your dependency on GUI tools and enables reliable automation in deployment and monitoring pipelines.
