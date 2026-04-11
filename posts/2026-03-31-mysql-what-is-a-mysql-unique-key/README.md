# What Is a MySQL Unique Key

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MySQL, Unique Key, Constraint

Description: Understand what a MySQL unique key is, how it differs from a primary key, how it handles NULL values, and when to use unique keys in your schema design.

---

A unique key in MySQL is a constraint that ensures all values in a column (or combination of columns) are distinct across all rows. Unlike a primary key, a unique key allows NULL values and a table can have multiple unique keys.

## Defining a Unique Key

```sql
-- Unique key as part of column definition
CREATE TABLE users (
  id    INT AUTO_INCREMENT PRIMARY KEY,
  email VARCHAR(255) NOT NULL UNIQUE,
  name  VARCHAR(100) NOT NULL
) ENGINE=InnoDB;

-- Named unique key defined separately
CREATE TABLE users (
  id       INT AUTO_INCREMENT PRIMARY KEY,
  email    VARCHAR(255) NOT NULL,
  username VARCHAR(50)  NOT NULL,
  UNIQUE KEY uk_email    (email),
  UNIQUE KEY uk_username (username)
) ENGINE=InnoDB;
```

Naming unique keys (e.g., `uk_email`) makes them easier to reference when you need to drop or modify them.

## Unique Key vs Primary Key

| Feature | Primary Key | Unique Key |
|---|---|---|
| Allows NULL | No | Yes (multiple NULLs allowed) |
| Number per table | One | Many |
| Clustered index | Yes (InnoDB) | No |
| Creates index | Clustered | Secondary |

```sql
-- Primary key: no NULLs, one per table, clustered index
-- Unique key: NULLs allowed, multiple per table, secondary index

CREATE TABLE contacts (
  id    INT AUTO_INCREMENT PRIMARY KEY,   -- PK
  email VARCHAR(255) UNIQUE,              -- UK, allows multiple NULLs
  phone VARCHAR(20)  UNIQUE               -- UK, allows multiple NULLs
) ENGINE=InnoDB;
```

## NULL Handling in Unique Keys

MySQL allows multiple NULL values in a unique key column because NULL is considered "unknown" - not equal to any other value, including another NULL.

```sql
INSERT INTO contacts (email) VALUES (NULL);
INSERT INTO contacts (email) VALUES (NULL);
INSERT INTO contacts (email) VALUES (NULL);
-- All three rows insert successfully
-- NULL != NULL in MySQL's unique key logic

-- Duplicate non-NULL values are rejected
INSERT INTO contacts (email) VALUES ('alice@example.com');
INSERT INTO contacts (email) VALUES ('alice@example.com');
-- ERROR 1062: Duplicate entry 'alice@example.com' for key 'email'
```

## Composite Unique Keys

A composite unique key enforces uniqueness across a combination of columns.

```sql
CREATE TABLE team_members (
  team_id  INT NOT NULL,
  user_id  INT NOT NULL,
  role     VARCHAR(50) NOT NULL DEFAULT 'member',
  UNIQUE KEY uk_team_user (team_id, user_id)
) ENGINE=InnoDB;

-- Same user can be in different teams
INSERT INTO team_members VALUES (1, 42, 'member');
INSERT INTO team_members VALUES (2, 42, 'admin');  -- OK

-- Same user cannot appear twice in same team
INSERT INTO team_members VALUES (1, 42, 'admin');
-- ERROR 1062: Duplicate entry '1-42' for key 'uk_team_user'
```

## INSERT IGNORE and ON DUPLICATE KEY

```sql
-- Ignore duplicate inserts silently
INSERT IGNORE INTO users (email, name)
VALUES ('alice@example.com', 'Alice');

-- Upsert: insert or update on duplicate
INSERT INTO users (email, name)
VALUES ('alice@example.com', 'Alice Updated')
ON DUPLICATE KEY UPDATE name = VALUES(name);
```

## Adding and Dropping Unique Keys

```sql
-- Add unique key to existing table
ALTER TABLE users ADD UNIQUE KEY uk_username (username);

-- Drop unique key
ALTER TABLE users DROP INDEX uk_username;

-- View all indexes (including unique keys)
SHOW INDEX FROM users;
```

## Using Unique Keys for Query Performance

Because unique keys create secondary indexes, they also speed up lookups on those columns.

```sql
-- This uses the uk_email index
SELECT id, name FROM users WHERE email = 'alice@example.com';
-- EXPLAIN type: const (single row via unique index)
```

## Summary

A MySQL unique key enforces column-level uniqueness while allowing NULL values. Use unique keys on columns that must have distinct non-NULL values (email, username, SKU). Use composite unique keys to enforce uniqueness across multiple columns together. Unlike primary keys, unique keys do not serve as the clustered index - but they do create secondary indexes that speed up lookups on those columns.
