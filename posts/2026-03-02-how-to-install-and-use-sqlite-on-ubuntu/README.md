# How to Install and Use SQLite on Ubuntu

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Ubuntu, SQLite, Database, SQL

Description: A complete guide to installing SQLite on Ubuntu and getting started with creating databases, running queries, and managing data from the command line.

---

SQLite is the most widely deployed database engine in the world. Unlike PostgreSQL or MySQL, SQLite is serverless - it stores the entire database as a single file on disk and is accessed directly by the application. This makes it ideal for local development, embedded applications, single-user tools, and prototyping.

## Installing SQLite on Ubuntu

Ubuntu's package repositories include SQLite, so installation is straightforward.

```bash
# Update package list
sudo apt update

# Install SQLite3 and development libraries
sudo apt install sqlite3 libsqlite3-dev -y

# Verify the installation
sqlite3 --version
# Output: 3.37.2 2022-01-06 13:25:41 ...
```

If you need a newer version than what the repository provides, you can compile from source or use a static binary.

```bash
# Download the latest precompiled binary from sqlite.org
wget https://www.sqlite.org/2024/sqlite-tools-linux-x64-3450000.zip
unzip sqlite-tools-linux-x64-3450000.zip

# Move the binary to a directory in PATH
sudo mv sqlite-tools-linux-x64-3450000/sqlite3 /usr/local/bin/sqlite3-new
sqlite3-new --version
```

## Creating Your First Database

SQLite databases are just files. You create one by opening it with the sqlite3 command.

```bash
# Create a new database or open an existing one
sqlite3 /home/user/myapp.db

# You are now in the SQLite REPL
# The prompt shows sqlite>
```

```sql
-- Create a table
CREATE TABLE users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT NOT NULL UNIQUE,
    email TEXT NOT NULL,
    created_at TEXT DEFAULT (datetime('now'))
);

-- Insert some records
INSERT INTO users (username, email) VALUES ('alice', 'alice@example.com');
INSERT INTO users (username, email) VALUES ('bob', 'bob@example.com');
INSERT INTO users (username, email) VALUES ('carol', 'carol@example.com');

-- Query the data
SELECT * FROM users;

-- Count records
SELECT COUNT(*) FROM users;
```

## Useful SQLite Shell Commands

The SQLite shell has dot-commands (meta-commands that start with `.`) for controlling the environment.

```sql
-- Show all tables in the database
.tables

-- Show the schema for a specific table
.schema users

-- Turn on column headers in output
.headers on

-- Change output format to column-aligned
.mode column

-- Change to CSV output
.mode csv

-- Output results to a file
.output /tmp/users_export.csv
SELECT * FROM users;
.output stdout

-- Show database file information
.dbinfo

-- Exit the shell
.quit
```

## Running SQL from the Command Line

You do not have to use the interactive shell. You can pipe SQL or pass it as an argument.

```bash
# Run a single query non-interactively
sqlite3 /home/user/myapp.db "SELECT * FROM users;"

# Pipe SQL from stdin
sqlite3 /home/user/myapp.db << 'EOF'
SELECT username, email FROM users WHERE id > 1;
EOF

# Run a SQL file
sqlite3 /home/user/myapp.db < /tmp/queries.sql

# Get CSV output directly from the command line
sqlite3 -csv /home/user/myapp.db "SELECT * FROM users;" > /tmp/export.csv

# Get tab-separated output
sqlite3 -separator '\t' /home/user/myapp.db "SELECT * FROM users;"
```

## Working with Data Types

SQLite uses a flexible typing system called "type affinity" rather than strict types.

```sql
-- SQLite has five storage classes: NULL, INTEGER, REAL, TEXT, BLOB
CREATE TABLE products (
    id INTEGER PRIMARY KEY,
    name TEXT NOT NULL,
    price REAL,
    quantity INTEGER DEFAULT 0,
    image BLOB,
    metadata TEXT  -- often used to store JSON
);

-- Inserting JSON as TEXT
INSERT INTO products (name, price, quantity, metadata)
VALUES (
    'Widget',
    9.99,
    100,
    '{"color": "blue", "weight": 0.5}'
);

-- Querying JSON fields (SQLite 3.38+ has full JSON support)
SELECT name, json_extract(metadata, '$.color') AS color
FROM products;
```

## Indexes and Query Performance

Without indexes, SQLite scans every row for queries. Indexes speed up lookups at the cost of slightly slower writes.

```sql
-- Create an index on the email column
CREATE INDEX idx_users_email ON users(email);

-- Create a composite index
CREATE INDEX idx_users_username_email ON users(username, email);

-- View existing indexes
.indexes users

-- Analyze a query to see if it uses an index
EXPLAIN QUERY PLAN
SELECT * FROM users WHERE email = 'alice@example.com';
-- Look for "USING INDEX" in the output

-- Drop an index
DROP INDEX idx_users_email;
```

## Importing and Exporting Data

### Import CSV Data

```bash
# Create a CSV file to import
cat > /tmp/new_users.csv << 'EOF'
dave,dave@example.com
eve,eve@example.com
EOF

# Import into SQLite
sqlite3 /home/user/myapp.db << 'EOF'
.mode csv
.import /tmp/new_users.csv users
EOF
```

Note: `.import` will try to import all columns. If your CSV does not have the `id` and `created_at` columns, create an intermediate table or use a staging approach.

### Export to SQL Dump

```bash
# Export the entire database as SQL
sqlite3 /home/user/myapp.db .dump > /tmp/myapp_backup.sql

# Export just one table
sqlite3 /home/user/myapp.db ".dump users" > /tmp/users_backup.sql

# Restore from dump
sqlite3 /home/user/restored.db < /tmp/myapp_backup.sql
```

## Using SQLite from Python

Python includes SQLite support in its standard library.

```python
import sqlite3
from datetime import datetime

# Connect to a database (creates it if not exists)
conn = sqlite3.connect('/home/user/myapp.db')
cursor = conn.cursor()

# Create a table
cursor.execute('''
    CREATE TABLE IF NOT EXISTS logs (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        level TEXT NOT NULL,
        message TEXT NOT NULL,
        timestamp TEXT DEFAULT (datetime('now'))
    )
''')

# Insert data using parameterized queries (prevents SQL injection)
cursor.execute(
    'INSERT INTO logs (level, message) VALUES (?, ?)',
    ('INFO', 'Application started')
)
conn.commit()

# Query with fetchall
cursor.execute('SELECT * FROM logs ORDER BY id DESC LIMIT 10')
rows = cursor.fetchall()
for row in rows:
    print(row)

# Use Row factory for dict-like access
conn.row_factory = sqlite3.Row
cursor = conn.cursor()
cursor.execute('SELECT * FROM logs')
for row in cursor.fetchall():
    print(dict(row))

conn.close()
```

## Checking Database Integrity

SQLite includes built-in integrity checking.

```bash
sqlite3 /home/user/myapp.db "PRAGMA integrity_check;"
# Should return: ok

# Quick check (faster but less thorough)
sqlite3 /home/user/myapp.db "PRAGMA quick_check;"

# Check for foreign key violations
sqlite3 /home/user/myapp.db "PRAGMA foreign_key_check;"
```

SQLite's self-contained, serverless nature makes it a powerful tool for scripting, local applications, and anywhere you need a reliable database without the overhead of running a database server. The file-based design also makes backups as simple as copying a file.
