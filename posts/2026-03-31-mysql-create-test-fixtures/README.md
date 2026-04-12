# How to Create MySQL Test Fixtures

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MySQL, Test Fixture, Testing, Seed Data

Description: Learn how to create and manage MySQL test fixtures using SQL seed files, stored procedures, and transaction rollbacks to ensure consistent test data across all test runs.

---

## What Are Test Fixtures

Test fixtures are a known, repeatable set of data loaded into a database before tests run. They ensure every test starts from the same baseline, making tests deterministic and isolated from each other. MySQL test fixtures are typically SQL files, stored procedures, or scripts that truncate tables and reinsert known rows.

## File-Based Fixtures

The simplest approach is a set of SQL files, one per domain area:

```sql
-- fixtures/users.sql
TRUNCATE TABLE users;
INSERT INTO users (id, email, role, created_at) VALUES
  (1, 'admin@test.com',  'ADMIN',  '2025-01-01 00:00:00'),
  (2, 'alice@test.com',  'USER',   '2025-01-02 00:00:00'),
  (3, 'bob@test.com',    'USER',   '2025-01-03 00:00:00');
```

```sql
-- fixtures/products.sql
TRUNCATE TABLE products;
INSERT INTO products (id, sku, name, price, stock) VALUES
  (1, 'SKU-001', 'Widget A', 9.99,  100),
  (2, 'SKU-002', 'Widget B', 19.99, 50),
  (3, 'SKU-003', 'Widget C', 4.99,  200);
```

```sql
-- fixtures/orders.sql
TRUNCATE TABLE orders;
INSERT INTO orders (id, user_id, product_id, quantity, status) VALUES
  (1, 2, 1, 2, 'COMPLETED'),
  (2, 3, 2, 1, 'PENDING'),
  (3, 2, 3, 5, 'CANCELLED');
```

Load with a shell script:

```bash
#!/usr/bin/env bash
MYSQL="mysql -h 127.0.0.1 -P 3307 -u testuser -ptestpass app_test"
$MYSQL < fixtures/users.sql
$MYSQL < fixtures/products.sql
$MYSQL < fixtures/orders.sql
echo "Fixtures loaded"
```

## Stored Procedure Fixtures

For complex fixture logic, use a stored procedure:

```sql
DELIMITER $$
CREATE PROCEDURE load_test_fixtures()
BEGIN
  -- Disable FK checks so truncation order does not matter
  SET FOREIGN_KEY_CHECKS = 0;
  TRUNCATE TABLE orders;
  TRUNCATE TABLE products;
  TRUNCATE TABLE users;
  SET FOREIGN_KEY_CHECKS = 1;

  INSERT INTO users (id, email, role) VALUES
    (1, 'admin@test.com', 'ADMIN'),
    (2, 'alice@test.com', 'USER');

  INSERT INTO products (id, sku, name, price, stock) VALUES
    (1, 'SKU-001', 'Widget A', 9.99, 100),
    (2, 'SKU-002', 'Widget B', 19.99, 50);

  INSERT INTO orders (id, user_id, product_id, quantity, status) VALUES
    (1, 2, 1, 2, 'COMPLETED'),
    (2, 2, 2, 1, 'PENDING');
END$$
DELIMITER ;

-- Load fixtures before tests
CALL load_test_fixtures();
```

## Transaction Rollback Isolation

For per-test isolation without reloading fixtures on every test, wrap each test in a transaction:

```javascript
// Node.js example using mysql2
beforeEach(async () => {
  await connection.beginTransaction();
});

afterEach(async () => {
  await connection.rollback();
});
```

This keeps the base fixture intact and reverts any mutations the test made.

## Factory Functions for Dynamic Fixtures

When tests need unique data, use a factory pattern to generate rows:

```sql
DELIMITER $$
CREATE PROCEDURE create_test_user(
  IN  p_email    VARCHAR(200),
  IN  p_role     VARCHAR(50),
  OUT p_user_id  BIGINT
)
BEGIN
  INSERT INTO users (email, role, created_at)
  VALUES (p_email, p_role, NOW());
  SET p_user_id = LAST_INSERT_ID();
END$$
DELIMITER ;
```

```python
# Python factory usage
def create_test_user(cursor, email=None, role="USER"):
    if email is None:
        import uuid
        email = f"test-{uuid.uuid4()}@example.com"
    cursor.callproc("create_test_user", [email, role, 0])
    cursor.execute("SELECT @_create_test_user_2")
    return cursor.fetchone()[0]
```

## Resetting Auto-Increment

`TRUNCATE TABLE` automatically resets the auto-increment counter in MySQL. If you use `DELETE` instead of `TRUNCATE` (for example, to avoid implicit commits inside a transaction), reset the counter manually to keep fixture IDs predictable:

```sql
DELETE FROM orders;
DELETE FROM products;
DELETE FROM users;

ALTER TABLE orders   AUTO_INCREMENT = 1;
ALTER TABLE products AUTO_INCREMENT = 1;
ALTER TABLE users    AUTO_INCREMENT = 1;
```

## Summary

MySQL test fixtures provide a consistent, repeatable baseline for integration tests. File-based fixtures are simple and easy to review; stored procedures add logic for complex setups; transaction rollbacks prevent test cross-contamination without reloading data on every test. Combine these patterns to build a fast, reliable test data management strategy.
