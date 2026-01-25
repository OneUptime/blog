# How to Work with SQLite Database in Python

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Python, SQLite, Database, SQL, Data Storage

Description: Learn how to work with SQLite databases in Python using the built-in sqlite3 module. This guide covers database creation, CRUD operations, transactions, and best practices.

---

SQLite is a lightweight, serverless database that is perfect for small applications, prototyping, and local data storage. Python includes the `sqlite3` module in its standard library, making it easy to work with SQLite databases without installing additional packages.

## Basic Database Operations

### Creating a Database and Table

```python
import sqlite3

# Connect to database (creates file if it does not exist)
conn = sqlite3.connect("myapp.db")

# Create a cursor to execute SQL
cursor = conn.cursor()

# Create table
cursor.execute("""
    CREATE TABLE IF NOT EXISTS users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        username TEXT NOT NULL UNIQUE,
        email TEXT NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
""")

# Commit changes
conn.commit()

# Close connection
conn.close()
```

### Using Context Manager

```python
import sqlite3

# Context manager handles closing automatically
with sqlite3.connect("myapp.db") as conn:
    cursor = conn.cursor()
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS products (
            id INTEGER PRIMARY KEY,
            name TEXT NOT NULL,
            price REAL NOT NULL
        )
    """)
    conn.commit()
# Connection closed automatically
```

## CRUD Operations

### Create (INSERT)

```python
import sqlite3

with sqlite3.connect("myapp.db") as conn:
    cursor = conn.cursor()

    # Insert single row
    cursor.execute(
        "INSERT INTO users (username, email) VALUES (?, ?)",
        ("alice", "alice@example.com")
    )

    # Insert with named parameters
    cursor.execute(
        "INSERT INTO users (username, email) VALUES (:username, :email)",
        {"username": "bob", "email": "bob@example.com"}
    )

    # Insert multiple rows
    users = [
        ("carol", "carol@example.com"),
        ("dave", "dave@example.com"),
        ("eve", "eve@example.com")
    ]
    cursor.executemany(
        "INSERT INTO users (username, email) VALUES (?, ?)",
        users
    )

    # Get the last inserted row ID
    print(f"Last row ID: {cursor.lastrowid}")

    conn.commit()
```

### Read (SELECT)

```python
import sqlite3

with sqlite3.connect("myapp.db") as conn:
    cursor = conn.cursor()

    # Fetch all rows
    cursor.execute("SELECT * FROM users")
    all_users = cursor.fetchall()
    for user in all_users:
        print(user)  # Tuple: (id, username, email, created_at)

    # Fetch one row
    cursor.execute("SELECT * FROM users WHERE id = ?", (1,))
    user = cursor.fetchone()
    print(user)

    # Fetch with limit
    cursor.execute("SELECT * FROM users ORDER BY id DESC LIMIT 5")
    recent_users = cursor.fetchall()

    # Count rows
    cursor.execute("SELECT COUNT(*) FROM users")
    count = cursor.fetchone()[0]
    print(f"Total users: {count}")
```

### Update

```python
import sqlite3

with sqlite3.connect("myapp.db") as conn:
    cursor = conn.cursor()

    # Update single row
    cursor.execute(
        "UPDATE users SET email = ? WHERE username = ?",
        ("newemail@example.com", "alice")
    )

    # Check how many rows were updated
    print(f"Rows updated: {cursor.rowcount}")

    conn.commit()
```

### Delete

```python
import sqlite3

with sqlite3.connect("myapp.db") as conn:
    cursor = conn.cursor()

    # Delete single row
    cursor.execute("DELETE FROM users WHERE id = ?", (5,))

    # Delete with condition
    cursor.execute("DELETE FROM users WHERE created_at < date('now', '-30 days')")

    print(f"Rows deleted: {cursor.rowcount}")

    conn.commit()
```

## Working with Results

### Row Factory for Dict-like Access

```python
import sqlite3

def dict_factory(cursor, row):
    """Convert row to dictionary."""
    return {col[0]: row[idx] for idx, col in enumerate(cursor.description)}

with sqlite3.connect("myapp.db") as conn:
    conn.row_factory = dict_factory
    cursor = conn.cursor()

    cursor.execute("SELECT * FROM users WHERE id = ?", (1,))
    user = cursor.fetchone()

    # Access by column name
    print(user["username"])
    print(user["email"])
```

### Using sqlite3.Row

```python
import sqlite3

with sqlite3.connect("myapp.db") as conn:
    conn.row_factory = sqlite3.Row
    cursor = conn.cursor()

    cursor.execute("SELECT * FROM users")
    for row in cursor:
        # Access by index or name
        print(row[0], row["username"], row["email"])
```

## Transactions

```python
import sqlite3

conn = sqlite3.connect("myapp.db")

try:
    cursor = conn.cursor()

    # Start transaction (implicit with any write operation)
    cursor.execute("UPDATE accounts SET balance = balance - 100 WHERE id = 1")
    cursor.execute("UPDATE accounts SET balance = balance + 100 WHERE id = 2")

    # Commit transaction
    conn.commit()

except Exception as e:
    # Rollback on error
    conn.rollback()
    print(f"Transaction failed: {e}")

finally:
    conn.close()
```

### Isolation Levels

```python
import sqlite3

# Different isolation levels
conn = sqlite3.connect("myapp.db", isolation_level=None)  # Autocommit
conn = sqlite3.connect("myapp.db", isolation_level="DEFERRED")  # Default
conn = sqlite3.connect("myapp.db", isolation_level="IMMEDIATE")
conn = sqlite3.connect("myapp.db", isolation_level="EXCLUSIVE")
```

## Prepared Statements and Security

Always use parameterized queries to prevent SQL injection:

```python
import sqlite3

# NEVER do this (SQL injection vulnerability)
username = "alice'; DROP TABLE users; --"
# cursor.execute(f"SELECT * FROM users WHERE username = '{username}'")

# ALWAYS use parameterized queries
with sqlite3.connect("myapp.db") as conn:
    cursor = conn.cursor()

    # Safe: Using ? placeholder
    cursor.execute("SELECT * FROM users WHERE username = ?", (username,))

    # Safe: Using named parameters
    cursor.execute(
        "SELECT * FROM users WHERE username = :username",
        {"username": username}
    )
```

## Working with Dates

```python
import sqlite3
from datetime import datetime, date

# Enable date/datetime adapters
sqlite3.register_adapter(date, lambda d: d.isoformat())
sqlite3.register_adapter(datetime, lambda dt: dt.isoformat())

# Enable date/datetime converters
sqlite3.register_converter("date", lambda s: date.fromisoformat(s.decode()))
sqlite3.register_converter("timestamp", lambda s: datetime.fromisoformat(s.decode()))

with sqlite3.connect("myapp.db", detect_types=sqlite3.PARSE_DECLTYPES) as conn:
    cursor = conn.cursor()

    # Insert with datetime
    cursor.execute(
        "INSERT INTO events (name, event_date) VALUES (?, ?)",
        ("Meeting", datetime.now())
    )

    # Query returns datetime objects
    cursor.execute("SELECT * FROM events")
    for row in cursor:
        print(row)  # event_date is a datetime object
```

## In-Memory Database

```python
import sqlite3

# Create database in memory (not persisted)
conn = sqlite3.connect(":memory:")

cursor = conn.cursor()
cursor.execute("CREATE TABLE temp_data (id INTEGER, value TEXT)")
cursor.execute("INSERT INTO temp_data VALUES (1, 'test')")

cursor.execute("SELECT * FROM temp_data")
print(cursor.fetchall())

conn.close()  # Data is lost
```

## Database Helper Class

```python
import sqlite3
from contextlib import contextmanager
from typing import List, Optional, Dict, Any

class Database:
    """SQLite database wrapper with common operations."""

    def __init__(self, db_path: str):
        self.db_path = db_path
        self._init_db()

    def _init_db(self):
        """Initialize database schema."""
        with self._get_connection() as conn:
            conn.execute("""
                CREATE TABLE IF NOT EXISTS users (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    username TEXT NOT NULL UNIQUE,
                    email TEXT NOT NULL,
                    active INTEGER DEFAULT 1,
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                )
            """)

    @contextmanager
    def _get_connection(self):
        """Get database connection with auto-close."""
        conn = sqlite3.connect(self.db_path)
        conn.row_factory = sqlite3.Row
        try:
            yield conn
            conn.commit()
        except Exception:
            conn.rollback()
            raise
        finally:
            conn.close()

    def create_user(self, username: str, email: str) -> int:
        """Create a new user and return ID."""
        with self._get_connection() as conn:
            cursor = conn.execute(
                "INSERT INTO users (username, email) VALUES (?, ?)",
                (username, email)
            )
            return cursor.lastrowid

    def get_user(self, user_id: int) -> Optional[Dict[str, Any]]:
        """Get user by ID."""
        with self._get_connection() as conn:
            row = conn.execute(
                "SELECT * FROM users WHERE id = ?",
                (user_id,)
            ).fetchone()
            return dict(row) if row else None

    def get_user_by_username(self, username: str) -> Optional[Dict[str, Any]]:
        """Get user by username."""
        with self._get_connection() as conn:
            row = conn.execute(
                "SELECT * FROM users WHERE username = ?",
                (username,)
            ).fetchone()
            return dict(row) if row else None

    def get_all_users(self, active_only: bool = True) -> List[Dict[str, Any]]:
        """Get all users."""
        with self._get_connection() as conn:
            if active_only:
                rows = conn.execute(
                    "SELECT * FROM users WHERE active = 1 ORDER BY username"
                ).fetchall()
            else:
                rows = conn.execute(
                    "SELECT * FROM users ORDER BY username"
                ).fetchall()
            return [dict(row) for row in rows]

    def update_user(self, user_id: int, **kwargs) -> bool:
        """Update user fields."""
        if not kwargs:
            return False

        fields = ", ".join(f"{k} = ?" for k in kwargs)
        values = list(kwargs.values()) + [user_id]

        with self._get_connection() as conn:
            cursor = conn.execute(
                f"UPDATE users SET {fields} WHERE id = ?",
                values
            )
            return cursor.rowcount > 0

    def delete_user(self, user_id: int) -> bool:
        """Delete user by ID."""
        with self._get_connection() as conn:
            cursor = conn.execute(
                "DELETE FROM users WHERE id = ?",
                (user_id,)
            )
            return cursor.rowcount > 0

# Usage
db = Database("myapp.db")

# Create users
user_id = db.create_user("alice", "alice@example.com")
print(f"Created user with ID: {user_id}")

# Get user
user = db.get_user(user_id)
print(f"User: {user}")

# Update user
db.update_user(user_id, email="new@example.com")

# List all users
for user in db.get_all_users():
    print(f"- {user['username']}: {user['email']}")
```

## Best Practices

### 1. Use Context Managers

```python
# Automatically handles closing
with sqlite3.connect("myapp.db") as conn:
    # ...
```

### 2. Use Parameterized Queries

```python
# Prevents SQL injection
cursor.execute("SELECT * FROM users WHERE id = ?", (user_id,))
```

### 3. Handle Constraints Gracefully

```python
try:
    cursor.execute("INSERT INTO users (username, email) VALUES (?, ?)", (username, email))
except sqlite3.IntegrityError:
    print("Username already exists")
```

### 4. Use Transactions for Multiple Operations

```python
try:
    cursor.execute("...")
    cursor.execute("...")
    conn.commit()
except:
    conn.rollback()
```

## Summary

| Operation | Method |
|-----------|--------|
| Connect | `sqlite3.connect("file.db")` |
| Execute SQL | `cursor.execute(sql, params)` |
| Fetch one | `cursor.fetchone()` |
| Fetch all | `cursor.fetchall()` |
| Commit | `conn.commit()` |
| Rollback | `conn.rollback()` |
| Close | `conn.close()` |
| Last row ID | `cursor.lastrowid` |
| Rows affected | `cursor.rowcount` |

SQLite is perfect for local data storage in Python applications. It requires no setup, is reliable, and the `sqlite3` module makes it easy to use. For production applications with multiple concurrent users, consider PostgreSQL or MySQL instead.
