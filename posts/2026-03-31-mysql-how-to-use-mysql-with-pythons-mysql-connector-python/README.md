# How to Use MySQL with Python's mysql-connector-python

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MySQL, Python, mysql-connector-python, Database Integration

Description: Learn how to connect to and interact with MySQL from Python using the official mysql-connector-python library with practical CRUD examples.

---

## What is mysql-connector-python

`mysql-connector-python` is the official MySQL driver developed by Oracle for Python. It allows Python applications to connect to MySQL databases, execute queries, and manage transactions without any external C dependencies (pure Python implementation available).

## Installation

```bash
pip install mysql-connector-python
```

## Connecting to MySQL

```python
import mysql.connector

conn = mysql.connector.connect(
    host='localhost',
    user='your_user',
    password='your_password',
    database='your_database'
)

print("Connected:", conn.is_connected())
conn.close()
```

## Handling Connection Errors

```python
import mysql.connector
from mysql.connector import Error

try:
    conn = mysql.connector.connect(
        host='localhost',
        user='your_user',
        password='your_password',
        database='your_database'
    )
    cursor = conn.cursor()
    cursor.execute("SELECT VERSION()")
    version = cursor.fetchone()
    print(f"MySQL version: {version[0]}")
finally:
    if conn.is_connected():
        cursor.close()
        conn.close()
```

## Creating a Table

```python
cursor.execute("""
    CREATE TABLE IF NOT EXISTS employees (
        id INT AUTO_INCREMENT PRIMARY KEY,
        name VARCHAR(100) NOT NULL,
        department VARCHAR(100),
        salary DECIMAL(10, 2)
    )
""")
conn.commit()
```

## Inserting Data

Use parameterized queries to prevent SQL injection:

```python
insert_query = "INSERT INTO employees (name, department, salary) VALUES (%s, %s, %s)"

# Single row
cursor.execute(insert_query, ("Alice Smith", "Engineering", 95000.00))
conn.commit()
print(f"Inserted row ID: {cursor.lastrowid}")

# Multiple rows
employees = [
    ("Bob Jones", "Marketing", 72000.00),
    ("Carol White", "Engineering", 88000.00),
    ("Dave Brown", "HR", 65000.00),
]
cursor.executemany(insert_query, employees)
conn.commit()
print(f"Inserted {cursor.rowcount} rows")
```

## Querying Data

```python
# Fetch all rows
cursor.execute("SELECT * FROM employees WHERE department = %s", ("Engineering",))
rows = cursor.fetchall()
for row in rows:
    print(row)

# Fetch one row
cursor.execute("SELECT * FROM employees WHERE id = %s", (1,))
row = cursor.fetchone()
print(row)

# Use dictionary cursor for named columns
cursor_dict = conn.cursor(dictionary=True)
cursor_dict.execute("SELECT * FROM employees")
for emp in cursor_dict.fetchall():
    print(f"{emp['name']} - {emp['department']}")
```

## Updating Data

```python
update_query = "UPDATE employees SET salary = %s WHERE id = %s"
cursor.execute(update_query, (100000.00, 1))
conn.commit()
print(f"Updated {cursor.rowcount} row(s)")
```

## Deleting Data

```python
cursor.execute("DELETE FROM employees WHERE id = %s", (4,))
conn.commit()
print(f"Deleted {cursor.rowcount} row(s)")
```

## Using Transactions

```python
try:
    cursor.execute("INSERT INTO orders (user_id, total) VALUES (%s, %s)", (1, 150.00))
    cursor.execute("UPDATE inventory SET stock = stock - 1 WHERE product_id = %s", (10,))
    conn.commit()
    print("Transaction committed")
except Error as e:
    conn.rollback()
    print(f"Transaction rolled back: {e}")
```

## Using Connection Pooling

```python
from mysql.connector import pooling

pool = pooling.MySQLConnectionPool(
    pool_name="mypool",
    pool_size=5,
    host='localhost',
    user='your_user',
    password='your_password',
    database='your_database'
)

conn = pool.get_connection()
cursor = conn.cursor()
cursor.execute("SELECT COUNT(*) FROM employees")
print(cursor.fetchone())
conn.close()  # Returns connection to pool
```

## Summary

`mysql-connector-python` provides a straightforward and Pythonic interface to MySQL. Use `%s` placeholders for parameterized queries to prevent SQL injection, `executemany()` for batch inserts, `dictionary=True` cursor for named column access, and connection pooling for production applications. Always call `conn.commit()` after write operations or use transaction blocks.
