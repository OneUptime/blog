# How to Use CHECK Constraints in MySQL 8

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MySQL, Check Constraints, Data Integrity, Database Design

Description: Learn how to add and enforce CHECK constraints in MySQL 8 to validate column values and maintain data integrity at the database level.

---

## What Are CHECK Constraints

A CHECK constraint is a rule that limits the values accepted by a column or combination of columns. In MySQL 8.0.16 and later, CHECK constraints are fully enforced on INSERT and UPDATE. Prior to MySQL 8, the syntax was accepted but silently ignored.

## Creating a Table with CHECK Constraints

```sql
CREATE TABLE products (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(200) NOT NULL,
  price DECIMAL(10, 2) NOT NULL,
  stock INT NOT NULL,
  status ENUM('active', 'inactive', 'discontinued') NOT NULL DEFAULT 'active',
  CONSTRAINT chk_price_positive CHECK (price > 0),
  CONSTRAINT chk_stock_non_negative CHECK (stock >= 0)
);
```

Giving each constraint an explicit name (like `chk_price_positive`) makes error messages and `ALTER TABLE` operations cleaner.

## Adding a CHECK Constraint to an Existing Table

```sql
ALTER TABLE products
  ADD CONSTRAINT chk_name_length CHECK (CHAR_LENGTH(name) >= 3);
```

## Testing the Constraint

```sql
-- This will succeed
INSERT INTO products (name, price, stock) VALUES ('Widget', 9.99, 100);

-- This will fail: price must be positive
INSERT INTO products (name, price, stock) VALUES ('Gadget', -5.00, 50);
-- ERROR 3819 (HY000): Check constraint 'chk_price_positive' is violated.
```

## Multi-Column CHECK Constraints

CHECK constraints can reference multiple columns in the same table:

```sql
CREATE TABLE promotions (
  id INT AUTO_INCREMENT PRIMARY KEY,
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  discount_pct DECIMAL(5, 2) NOT NULL,
  CONSTRAINT chk_dates CHECK (end_date > start_date),
  CONSTRAINT chk_discount_range CHECK (discount_pct BETWEEN 1 AND 100)
);
```

```sql
-- This will fail: end_date must be after start_date
INSERT INTO promotions (start_date, end_date, discount_pct)
VALUES ('2026-04-01', '2026-03-01', 10);
-- ERROR 3819: Check constraint 'chk_dates' is violated.
```

## Viewing CHECK Constraints

Query `INFORMATION_SCHEMA.TABLE_CONSTRAINTS`:

```sql
SELECT CONSTRAINT_NAME, TABLE_NAME, CONSTRAINT_TYPE
FROM INFORMATION_SCHEMA.TABLE_CONSTRAINTS
WHERE TABLE_SCHEMA = 'myapp'
  AND CONSTRAINT_TYPE = 'CHECK';
```

Or use `SHOW CREATE TABLE`:

```sql
SHOW CREATE TABLE products;
```

## Viewing Constraint Definitions

```sql
SELECT CONSTRAINT_NAME, CHECK_CLAUSE
FROM INFORMATION_SCHEMA.CHECK_CONSTRAINTS
WHERE CONSTRAINT_SCHEMA = 'myapp';
```

## Disabling a CHECK Constraint

You can disable a CHECK constraint without dropping it by setting it to NOT ENFORCED:

```sql
ALTER TABLE products ALTER CHECK chk_price_positive NOT ENFORCED;
```

To re-enable it:

```sql
ALTER TABLE products ALTER CHECK chk_price_positive ENFORCED;
```

You can also drop a constraint entirely:

```sql
ALTER TABLE products DROP CONSTRAINT chk_price_positive;
```

## Temporarily Disabling a Constraint for Bulk Load

When loading historical data that might not satisfy current rules, disable the constraint, load data, then re-enable:

```sql
ALTER TABLE products ALTER CHECK chk_stock_non_negative NOT ENFORCED;

-- Load historical data
LOAD DATA INFILE '/data/legacy_products.csv'
INTO TABLE products
FIELDS TERMINATED BY ','
LINES TERMINATED BY '\n'
(name, price, stock, status);

-- Re-enable the constraint
ALTER TABLE products ALTER CHECK chk_stock_non_negative ENFORCED;
```

Note that re-enabling an existing constraint with ENFORCED does not validate rows that were inserted while the constraint was not enforced. If you need to ensure all existing rows satisfy the constraint, drop and re-add it instead — adding a new CHECK constraint validates all existing rows.

## NOT ENFORCED Option

You can add a constraint in a non-enforced mode for documentation purposes:

```sql
ALTER TABLE products
  ADD CONSTRAINT chk_price_max CHECK (price < 100000) NOT ENFORCED;
```

This is useful when migrating from systems where certain rules existed logically but not at the database level, without immediately blocking existing violations.

## Practical Example - Order Table Validation

```sql
CREATE TABLE orders (
  id INT AUTO_INCREMENT PRIMARY KEY,
  customer_id INT NOT NULL,
  total_amount DECIMAL(12, 2) NOT NULL,
  quantity INT NOT NULL,
  order_status VARCHAR(20) NOT NULL,
  CONSTRAINT chk_total_positive CHECK (total_amount > 0),
  CONSTRAINT chk_quantity_positive CHECK (quantity > 0),
  CONSTRAINT chk_valid_status CHECK (
    order_status IN ('pending', 'confirmed', 'shipped', 'delivered', 'cancelled')
  )
);
```

## Summary

MySQL 8 CHECK constraints provide a simple and powerful way to enforce business rules directly at the database layer, reducing the risk of bad data from any application or migration path. They are fully enforced on INSERT and UPDATE operations, and can be named, dropped, and optionally set as NOT ENFORCED for migration flexibility.
