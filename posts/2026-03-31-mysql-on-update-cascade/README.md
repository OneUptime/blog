# How to Use ON UPDATE CASCADE in MySQL

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MySQL, Foreign Key, Cascade, Constraint, Referential Integrity

Description: Learn how ON UPDATE CASCADE in MySQL automatically propagates primary key changes to related foreign key columns, keeping referential integrity intact.

---

## What Is ON UPDATE CASCADE?

`ON UPDATE CASCADE` is a referential action for foreign key constraints in MySQL. When a referenced primary key value changes, MySQL automatically updates all matching foreign key values in child tables. This eliminates the need for manual updates across related tables and prevents orphaned rows.

## Creating Tables with ON UPDATE CASCADE

```sql
CREATE TABLE departments (
    id INT PRIMARY KEY,
    name VARCHAR(100) NOT NULL
);

CREATE TABLE employees (
    id INT PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    department_id INT,
    CONSTRAINT fk_dept
        FOREIGN KEY (department_id)
        REFERENCES departments(id)
        ON UPDATE CASCADE
        ON DELETE SET NULL
);
```

When the `id` in `departments` changes, MySQL automatically updates `department_id` in every matching `employees` row.

## Triggering the Cascade

```sql
INSERT INTO departments (id, name) VALUES (10, 'Engineering');
INSERT INTO employees (id, name, department_id) VALUES (1, 'Alice', 10);
INSERT INTO employees (id, name, department_id) VALUES (2, 'Bob', 10);

-- Update the primary key in the parent table
UPDATE departments SET id = 20 WHERE id = 10;

-- Both employees now have department_id = 20
SELECT * FROM employees;
```

```text
+----+-------+---------------+
| id | name  | department_id |
+----+-------+---------------+
|  1 | Alice |            20 |
|  2 | Bob   |            20 |
+----+-------+---------------+
```

## Adding ON UPDATE CASCADE to an Existing Table

If the foreign key already exists without the cascade action, you must drop it and re-add it:

```sql
ALTER TABLE employees
    DROP FOREIGN KEY fk_dept;

ALTER TABLE employees
    ADD CONSTRAINT fk_dept
        FOREIGN KEY (department_id)
        REFERENCES departments(id)
        ON UPDATE CASCADE;
```

## Verifying the Foreign Key Definition

```sql
SELECT
    CONSTRAINT_NAME,
    UPDATE_RULE,
    DELETE_RULE
FROM information_schema.REFERENTIAL_CONSTRAINTS
WHERE CONSTRAINT_SCHEMA = 'your_database'
  AND TABLE_NAME = 'employees';
```

## Chained Cascades

MySQL supports multi-level cascades. When a cascaded update changes a column that is itself part of a key referenced by another foreign key, the cascade chains to the next table automatically.

```sql
CREATE TABLE regions (id INT PRIMARY KEY, name VARCHAR(50));
CREATE TABLE departments (
    id INT,
    region_id INT,
    name VARCHAR(100),
    PRIMARY KEY (region_id, id),
    FOREIGN KEY (region_id) REFERENCES regions(id) ON UPDATE CASCADE
);
CREATE TABLE employees (
    id INT PRIMARY KEY,
    region_id INT,
    department_id INT,
    FOREIGN KEY (region_id, department_id) REFERENCES departments(region_id, id) ON UPDATE CASCADE
);
```

Updating `regions.id` cascades into `departments.region_id` (part of the composite primary key), which in turn cascades into `employees.region_id` (part of the composite foreign key referencing `departments`).

## Common Pitfalls

- InnoDB is required - MyISAM does not enforce foreign keys or cascade actions.
- Avoid circular cascades - MySQL will raise an error if it detects a cycle during the cascade chain.
- Updating a primary key that is auto-incremented is unusual. Use surrogate keys and avoid changing primary keys where possible.

```sql
-- Check table engine
SHOW TABLE STATUS WHERE Name = 'employees'\G
```

## Summary

`ON UPDATE CASCADE` simplifies maintaining referential integrity when parent table primary keys must change. Define it alongside your foreign key constraint, ensure both tables use InnoDB, and MySQL will automatically propagate updates through all related child rows.
