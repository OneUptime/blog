# How to Seed a MySQL Database for Testing

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MySQL, Testing, Seed Data, CI/CD, Fixture

Description: Learn how to seed a MySQL database for testing using SQL fixture files, ORM seeders, and factory patterns to create consistent, repeatable test environments.

---

## Why Database Seeding Matters

Tests that depend on a specific data state require a known starting condition. Without seeding, tests are brittle - they depend on the order of execution and leftover data from previous runs. A well-designed seed strategy creates a consistent, reproducible database state before each test run or test suite.

## Method 1 - SQL Fixture Files

The simplest approach: write INSERT statements in a `.sql` file and execute it before tests:

```sql
-- tests/fixtures/users.sql
TRUNCATE TABLE users;
INSERT INTO users (id, email, name, role, created_at) VALUES
  (1, 'admin@example.com', 'Admin User', 'admin', '2025-01-01 00:00:00'),
  (2, 'alice@example.com', 'Alice Smith', 'user', '2025-01-02 00:00:00'),
  (3, 'bob@example.com', 'Bob Jones', 'user', '2025-01-03 00:00:00');

TRUNCATE TABLE products;
INSERT INTO products (id, name, price, stock) VALUES
  (1, 'Widget A', 9.99, 100),
  (2, 'Widget B', 19.99, 50),
  (3, 'Premium Widget', 49.99, 25);
```

Execute in CI:

```bash
cat tests/fixtures/users.sql tests/fixtures/products.sql | \
  mysql -h 127.0.0.1 -u testuser -ptestpass myapp_test
```

## Method 2 - ORM Seeders (Node.js / Sequelize)

```javascript
// seeders/20250101-test-users.js
module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.bulkInsert('users', [
      {
        id: 1,
        email: 'admin@example.com',
        name: 'Admin User',
        role: 'admin',
        created_at: new Date('2025-01-01')
      },
      {
        id: 2,
        email: 'alice@example.com',
        name: 'Alice Smith',
        role: 'user',
        created_at: new Date('2025-01-02')
      }
    ], {});
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.bulkDelete('users', null, {});
  }
};
```

Run the seeder:

```bash
npx sequelize-cli db:seed:all --env test
```

## Method 3 - Factory Pattern for Dynamic Seed Data

For tests requiring varied data, use a factory function to generate records:

```python
import mysql.connector
import random
import string
from datetime import datetime, timedelta

def random_email():
    username = ''.join(random.choices(string.ascii_lowercase, k=8))
    return f"{username}@example.com"

def seed_users(conn, count: int = 50):
    cursor = conn.cursor()
    cursor.execute("TRUNCATE TABLE users")
    rows = [
        (i + 1, random_email(), f"User {i+1}", 'user',
         datetime(2025, 1, 1) + timedelta(days=i))
        for i in range(count)
    ]
    cursor.executemany(
        "INSERT INTO users (id, email, name, role, created_at) "
        "VALUES (%s, %s, %s, %s, %s)",
        rows
    )
    conn.commit()
    print(f"Seeded {count} users")

conn = mysql.connector.connect(
    host="127.0.0.1", user="testuser",
    password="testpass", database="myapp_test"
)
seed_users(conn, count=100)
```

## Managing Foreign Key Constraints During Seeding

Use `SET FOREIGN_KEY_CHECKS = 0` to disable foreign key enforcement during seeding, then re-enable it after:

```sql
SET FOREIGN_KEY_CHECKS = 0;

TRUNCATE TABLE order_items;
TRUNCATE TABLE orders;
TRUNCATE TABLE users;

-- Insert in any order
INSERT INTO orders ...;
INSERT INTO users ...;
INSERT INTO order_items ...;

SET FOREIGN_KEY_CHECKS = 1;
```

## Deterministic Seed Data for Reproducible Tests

Always use fixed IDs and timestamps in seed data rather than random values. This ensures test assertions remain valid across runs:

```sql
-- Good: deterministic
INSERT INTO users (id, email, created_at) VALUES (42, 'alice@test.com', '2025-01-01');

-- Bad: non-deterministic
INSERT INTO users (email, created_at) VALUES ('alice@test.com', NOW());
```

## Summary

Seed MySQL test databases using SQL fixture files for simple cases, ORM seeders for migration-aligned workflows, or factory functions for dynamic data generation. Use fixed IDs and timestamps for reproducibility, disable `FOREIGN_KEY_CHECKS` during seeding to avoid ordering constraints, and always TRUNCATE before inserting to ensure a clean starting state.
