# How to Import a JSON File into MySQL

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MySQL, JSON, Import, Data Migration, Python

Description: Learn how to import JSON files into MySQL tables using Python scripts and the MySQL JSON functions for flexible document-to-relational data loading.

---

## Introduction

MySQL does not have a native `LOAD DATA` equivalent for JSON files, but importing JSON data is straightforward using a small Python script or by converting JSON to SQL INSERT statements. This guide covers both approaches and shows how to store JSON documents in a MySQL JSON column.

## Sample JSON File

Consider a `users.json` file:

```json
[
  {"id": 1, "name": "Alice", "email": "alice@example.com", "age": 30},
  {"id": 2, "name": "Bob", "email": "bob@example.com", "age": 25},
  {"id": 3, "name": "Carol", "email": "carol@example.com", "age": 35}
]
```

## Creating the Target Table

```sql
CREATE TABLE users (
  id INT PRIMARY KEY,
  name VARCHAR(100),
  email VARCHAR(150),
  age INT
);
```

## Importing with Python

Use `mysql-connector-python` to read the JSON file and insert rows:

```python
import json
import mysql.connector

with open('users.json', 'r') as f:
    users = json.load(f)

conn = mysql.connector.connect(
    host='localhost',
    user='root',
    password='password',
    database='mydb'
)
cursor = conn.cursor()

insert_sql = """
    INSERT INTO users (id, name, email, age)
    VALUES (%(id)s, %(name)s, %(email)s, %(age)s) AS new
    ON DUPLICATE KEY UPDATE name=new.name, email=new.email, age=new.age
"""

cursor.executemany(insert_sql, users)
conn.commit()
print(f"Imported {cursor.rowcount} rows")
cursor.close()
conn.close()
```

## Storing Raw JSON Documents

If you want to store the entire JSON object in a JSON column:

```sql
CREATE TABLE raw_users (
  id INT AUTO_INCREMENT PRIMARY KEY,
  data JSON NOT NULL
);
```

```python
import json
import mysql.connector

with open('users.json', 'r') as f:
    users = json.load(f)

conn = mysql.connector.connect(
    host='localhost', user='root',
    password='password', database='mydb'
)
cursor = conn.cursor()

for user in users:
    cursor.execute(
        "INSERT INTO raw_users (data) VALUES (%s)",
        (json.dumps(user),)
    )

conn.commit()
cursor.close()
conn.close()
```

Query specific fields from the JSON column:

```sql
SELECT
  JSON_UNQUOTE(JSON_EXTRACT(data, '$.name')) AS name,
  JSON_UNQUOTE(JSON_EXTRACT(data, '$.email')) AS email
FROM raw_users;
```

## Converting JSON to SQL with jq

For large files, pre-convert JSON to SQL INSERT statements using `jq`:

```bash
jq -r '.[] | "INSERT INTO users (id, name, email, age) VALUES (\(.id), \"\(.name)\", \"\(.email)\", \(.age));"' \
  users.json > users_import.sql

mysql -u root -p mydb < users_import.sql
```

## Importing NDJSON (Newline-Delimited JSON)

For NDJSON files where each line is a separate JSON object:

```python
import json
import mysql.connector

conn = mysql.connector.connect(
    host='localhost', user='root',
    password='password', database='mydb'
)
cursor = conn.cursor()

with open('users.ndjson', 'r') as f:
    for line in f:
        user = json.loads(line.strip())
        cursor.execute(
            "INSERT INTO users (id, name, email, age) VALUES (%s, %s, %s, %s)",
            (user['id'], user['name'], user['email'], user['age'])
        )

conn.commit()
cursor.close()
conn.close()
```

## Summary

JSON files can be imported into MySQL using Python scripts for flexibility or `jq` for quick conversions. For structured data, map JSON fields to relational columns; for schema-flexible documents, store them in a MySQL JSON column and query using JSON path expressions. Use batch inserts and transactions for large datasets to maximize import speed.
