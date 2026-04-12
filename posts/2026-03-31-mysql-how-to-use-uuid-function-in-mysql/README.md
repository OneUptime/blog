# How to Use UUID() Function in MySQL

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MySQL, UUID, Primary Key, SQL Functions

Description: Learn how to use the UUID() function in MySQL to generate universally unique identifiers for primary keys and distributed data scenarios.

---

## What is UUID()

MySQL's `UUID()` function generates a version 1 UUID (Universally Unique Identifier) as a 36-character string in the format `xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx`.

UUIDs are globally unique across all MySQL instances, making them ideal for distributed systems, merged databases, and applications that generate IDs on the client side.

Syntax:

```sql
UUID()
```

## Basic Usage

```sql
SELECT UUID();
-- Output: '6ccd780c-baba-1026-9564-5b8c656024db' (example)

-- Each call generates a different UUID
SELECT UUID(), UUID(), UUID();
```

## UUID() as a Primary Key

Using UUID as a string primary key:

```sql
CREATE TABLE users (
  id CHAR(36) NOT NULL DEFAULT (UUID()),
  name VARCHAR(100) NOT NULL,
  email VARCHAR(255) NOT NULL UNIQUE,
  created_at DATETIME DEFAULT NOW(),
  PRIMARY KEY (id)
);

INSERT INTO users (name, email) VALUES ('Alice Smith', 'alice@example.com');
INSERT INTO users (id, name, email) VALUES (UUID(), 'Bob Jones', 'bob@example.com');

SELECT * FROM users;
```

## Storing UUID as BINARY(16)

For better storage efficiency and index performance, store UUIDs as binary:

```sql
CREATE TABLE events (
  id BINARY(16) NOT NULL DEFAULT (UUID_TO_BIN(UUID())),
  event_type VARCHAR(100) NOT NULL,
  created_at DATETIME DEFAULT NOW(),
  PRIMARY KEY (id)
);

-- Insert with UUID_TO_BIN
INSERT INTO events (event_type) VALUES ('user_login');
INSERT INTO events (id, event_type)
VALUES (UUID_TO_BIN(UUID()), 'page_view');

-- Query with BIN_TO_UUID for readable output
SELECT BIN_TO_UUID(id) AS id, event_type, created_at FROM events;
```

## UUID_TO_BIN() and BIN_TO_UUID() (MySQL 8.0+)

MySQL 8.0 introduced `UUID_TO_BIN()` and `BIN_TO_UUID()` for efficient binary storage:

```sql
-- Convert UUID string to binary
SELECT UUID_TO_BIN('6ccd780c-baba-1026-9564-5b8c656024db');

-- Convert binary back to UUID string
SELECT BIN_TO_UUID(UUID_TO_BIN('6ccd780c-baba-1026-9564-5b8c656024db'));

-- Swap flag = 1 for time-ordered storage (improves index performance)
SELECT UUID_TO_BIN(UUID(), 1);  -- time-hi bits first
```

## UUID as Default Column Value (MySQL 8.0+)

```sql
CREATE TABLE orders (
  id VARCHAR(36) DEFAULT (UUID()),
  total DECIMAL(10, 2) NOT NULL,
  PRIMARY KEY (id)
);

INSERT INTO orders (total) VALUES (99.99);
```

## UUID vs AUTO_INCREMENT

| Feature | UUID | AUTO_INCREMENT |
|---|---|---|
| Global uniqueness | Yes | No (per table) |
| Merge-safe | Yes | No |
| Storage | 16-36 bytes | 4-8 bytes |
| Index fragmentation | High (random) | Low (sequential) |
| Client-side generation | Yes | No |

## Reducing Index Fragmentation with UUID_SHORT()

For sequential-like UUIDs that reduce B-tree fragmentation, use `UUID_SHORT()`:

```sql
SELECT UUID_SHORT();
-- Output: 92395783831158784 (integer, not a string UUID)
```

Or use UUIDv7 libraries in your application for time-ordered UUIDs.

## Generating UUID in Application Code

In Python:

```python
import uuid
new_id = str(uuid.uuid4())
cursor.execute("INSERT INTO users (id, name) VALUES (%s, %s)", (new_id, "Alice"))
```

In JavaScript:

```javascript
const { v4: uuidv4 } = require('uuid');
const newId = uuidv4();
await conn.execute("INSERT INTO users (id, name) VALUES (?, ?)", [newId, "Alice"]);
```

## Summary

`UUID()` in MySQL generates a version 1 UUID string suitable for globally unique primary keys in distributed systems. For storage efficiency, use `UUID_TO_BIN(UUID(), 1)` with a `BINARY(16)` column - the swap flag enables time-ordered storage that reduces InnoDB B-tree fragmentation. For high-volume tables, consider generating UUIDs in the application layer (uuid4) rather than calling `UUID()` per row in MySQL.
