# How to Add a CHECK Constraint in MySQL 8

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MySQL, DDL, Constraint, Data Validation

Description: Learn how to add CHECK constraints in MySQL 8.0.16+ to enforce custom data validation rules at the database level using ALTER TABLE.

---

## What Is a CHECK Constraint?

A `CHECK` constraint enforces a condition on column values. Every row inserted or updated must satisfy the condition or MySQL rejects the operation. MySQL 8.0.16+ fully enforces `CHECK` constraints (earlier versions parsed them but did not enforce them).

## Basic Syntax

```sql
ALTER TABLE table_name
ADD CONSTRAINT constraint_name CHECK (condition);
```

Or inline without a name:

```sql
ALTER TABLE table_name
ADD CHECK (condition);
```

## Simple Examples

```sql
-- Ensure price is non-negative
ALTER TABLE products
ADD CONSTRAINT chk_price CHECK (price >= 0);

-- Ensure age is in a valid range
ALTER TABLE users
ADD CONSTRAINT chk_age CHECK (age BETWEEN 0 AND 150);

-- Ensure status is one of allowed values
ALTER TABLE orders
ADD CONSTRAINT chk_status CHECK (status IN ('pending', 'shipped', 'delivered', 'cancelled'));

-- Ensure end date is after start date
ALTER TABLE events
ADD CONSTRAINT chk_dates CHECK (end_date >= start_date);
```

## Defining CHECK Constraints at Table Creation

```sql
CREATE TABLE employees (
    id          INT           NOT NULL AUTO_INCREMENT,
    name        VARCHAR(100)  NOT NULL,
    salary      DECIMAL(10,2) NOT NULL,
    department  VARCHAR(50)   NOT NULL,
    hire_date   DATE          NOT NULL,
    PRIMARY KEY (id),
    CONSTRAINT chk_salary     CHECK (salary > 0),
    CONSTRAINT chk_department CHECK (department IN ('Engineering', 'Marketing', 'HR', 'Finance'))
);
```

## Cross-Column CHECK Constraints

CHECK constraints can reference multiple columns:

```sql
ALTER TABLE promotions
ADD CONSTRAINT chk_promotion_dates
CHECK (end_date > start_date AND discount_pct BETWEEN 0 AND 100);
```

```sql
ALTER TABLE loan_applications
ADD CONSTRAINT chk_loan_amount
CHECK (loan_amount >= 1000 AND loan_amount <= monthly_income * 60);
```

## Enforced vs Not Enforced

MySQL 8.0 allows creating a `CHECK` constraint that is not enforced (useful as documentation):

```sql
ALTER TABLE products
ADD CONSTRAINT chk_weight CHECK (weight > 0) NOT ENFORCED;
```

Use `ENFORCED` (the default) to actually validate data:

```sql
ALTER TABLE products
ADD CONSTRAINT chk_weight CHECK (weight > 0) ENFORCED;
```

## Viewing CHECK Constraints

```sql
-- Via INFORMATION_SCHEMA
SELECT
    CONSTRAINT_NAME,
    CHECK_CLAUSE
FROM INFORMATION_SCHEMA.CHECK_CONSTRAINTS
WHERE CONSTRAINT_SCHEMA = DATABASE();

-- Via SHOW CREATE TABLE
SHOW CREATE TABLE products;
```

## Dropping a CHECK Constraint

```sql
ALTER TABLE products
DROP CHECK chk_price;

-- Or using DROP CONSTRAINT (MySQL 8.0.19+)
ALTER TABLE products
DROP CONSTRAINT chk_price;
```

## Checking Existing Data Before Adding a Constraint

Before adding a constraint, verify existing data satisfies the condition:

```sql
-- Find rows that violate the intended constraint
SELECT id, price FROM products WHERE price < 0;

-- If none, safely add the constraint
ALTER TABLE products
ADD CONSTRAINT chk_price CHECK (price >= 0);
```

## Limitations

```text
- CHECK constraints cannot reference other tables (use triggers for that).
- Subqueries are not allowed in CHECK conditions.
- Stored functions, user-defined functions, and non-deterministic built-in functions (e.g., NOW(), RAND()) are not allowed. Only literals, deterministic built-in functions, and operators are permitted.
- CHECK constraints are per-table; they apply to all rows on INSERT and UPDATE.
```

## Summary

`CHECK` constraints in MySQL 8.0.16+ enforce custom validation rules at the database level, rejecting inserts and updates that violate the condition. They support single-column and cross-column expressions, can reference multiple columns, and can be set as `ENFORCED` or `NOT ENFORCED`. Always verify existing data satisfies the condition before adding a constraint, and use `INFORMATION_SCHEMA.CHECK_CONSTRAINTS` to audit constraints across tables.
