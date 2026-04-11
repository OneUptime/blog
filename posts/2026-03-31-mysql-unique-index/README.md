# How to Create a Unique Index in MySQL

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MySQL, Index, Constraint, Unique, InnoDB

Description: Learn how to create unique indexes in MySQL to enforce data integrity, understand NULL handling, and manage unique constraints on single and multiple columns.

---

## What Is a Unique Index?

A unique index enforces that no two rows in a table can have the same value for the indexed column or combination of columns. It serves dual purposes: a data integrity constraint and a B-tree index that speeds up lookups on those columns.

## Creating a Unique Index at Table Creation

```sql
CREATE TABLE users (
    id    INT          NOT NULL AUTO_INCREMENT PRIMARY KEY,
    email VARCHAR(255) NOT NULL,
    username VARCHAR(50) NOT NULL,
    UNIQUE KEY uk_email (email),
    UNIQUE KEY uk_username (username)
);
```

## Adding a Unique Index to an Existing Table

```sql
-- Using CREATE UNIQUE INDEX
CREATE UNIQUE INDEX uk_email ON users(email);

-- Using ALTER TABLE
ALTER TABLE users ADD UNIQUE INDEX uk_email (email);
```

Both forms are equivalent. `ALTER TABLE` is preferred when combining multiple changes in one statement.

## Composite Unique Index

A composite unique index enforces uniqueness across the combination of columns, not on each column individually:

```sql
-- A user can appear multiple times, and a product can appear multiple times,
-- but the same user cannot order the same product twice in the same order
CREATE UNIQUE INDEX uk_order_product
    ON order_items(order_id, product_id);
```

## NULL Handling in Unique Indexes

MySQL allows multiple NULL values in a unique column. Each NULL is considered distinct, so the uniqueness constraint is not violated by multiple NULLs:

```sql
CREATE TABLE profiles (
    id INT PRIMARY KEY,
    phone VARCHAR(20) NULL,
    UNIQUE KEY uk_phone (phone)
);

INSERT INTO profiles VALUES (1, NULL);
INSERT INTO profiles VALUES (2, NULL);  -- succeeds: two NULLs are allowed
INSERT INTO profiles VALUES (3, '555-1234');
INSERT INTO profiles VALUES (4, '555-1234');  -- ERROR: duplicate entry
```

## Checking for Existing Violations Before Adding a Unique Index

Adding a unique index fails if the table already contains duplicates. Find them first:

```sql
SELECT email, COUNT(*) AS cnt
FROM users
GROUP BY email
HAVING cnt > 1;
```

Resolve duplicates before proceeding:

```sql
-- Keep the lowest id for each email, delete the rest
DELETE u1
FROM users u1
JOIN users u2 ON u1.email = u2.email AND u1.id > u2.id;
```

## Listing Unique Indexes on a Table

```sql
SHOW INDEX FROM users WHERE Non_unique = 0;
```

## Dropping a Unique Index

```sql
DROP INDEX uk_email ON users;
-- or
ALTER TABLE users DROP INDEX uk_email;
```

Note: To drop a primary key, use `ALTER TABLE ... DROP PRIMARY KEY` or `DROP INDEX \`PRIMARY\` ON table_name` (the reserved word `PRIMARY` must be backtick-quoted).

## Performance Considerations

Unique indexes carry the same write overhead as regular indexes - each INSERT or UPDATE must check the index for duplicates. On high-write tables, keep unique indexes to what the data model genuinely requires.

## Summary

Unique indexes in MySQL enforce column-level or composite uniqueness as both a constraint and a performance tool. Remember that NULL values are treated as distinct, always check for existing duplicates before adding a unique index to a populated table, and use composite unique indexes when the uniqueness requirement spans multiple columns.
