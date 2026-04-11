# How to Use ON DELETE SET NULL in MySQL

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MySQL, Foreign Key, DDL, SQL, Referential Integrity

Description: Learn how ON DELETE SET NULL works in MySQL foreign keys to preserve child rows while nullifying the foreign key column when the parent is deleted.

---

## What Is ON DELETE SET NULL?

`ON DELETE SET NULL` is a foreign key referential action that sets the foreign key column in child rows to `NULL` when the referenced parent row is deleted. Unlike `ON DELETE CASCADE`, which removes child rows, `SET NULL` preserves them - just without a parent reference.

This is the right choice when child rows are meaningful on their own and should survive the parent's deletion in an unlinked state.

## When to Use ON DELETE SET NULL

- An employee record is deleted; their tasks should remain but `assigned_to` becomes NULL (reassigned later).
- A category is deleted; products remain visible but their `category_id` is set to NULL.
- An author is removed; blog posts stay published but `author_id` is nullified.

## Setting Up an Example

The FK column must be nullable for `SET NULL` to work:

```sql
CREATE TABLE departments (
  dept_id   INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  dept_name VARCHAR(100) NOT NULL
) ENGINE=InnoDB;

CREATE TABLE employees (
  employee_id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  full_name   VARCHAR(100) NOT NULL,
  dept_id     INT UNSIGNED NULL,  -- nullable to allow SET NULL
  CONSTRAINT fk_emp_dept
    FOREIGN KEY (dept_id) REFERENCES departments (dept_id)
    ON DELETE SET NULL
) ENGINE=InnoDB;
```

## Observing the Behavior

```sql
INSERT INTO departments VALUES (1, 'Engineering'), (2, 'Sales');

INSERT INTO employees (full_name, dept_id) VALUES
  ('Alice Chen',  1),
  ('Bob Kumar',   1),
  ('Carol Smith', 2);

-- Delete the Engineering department
DELETE FROM departments WHERE dept_id = 1;

-- Check employees
SELECT employee_id, full_name, dept_id FROM employees;
```

Result:

```text
+-------------+--------------+---------+
| employee_id | full_name    | dept_id |
+-------------+--------------+---------+
|           1 | Alice Chen   |    NULL |
|           2 | Bob Kumar    |    NULL |
|           3 | Carol Smith  |       2 |
+-------------+--------------+---------+
```

Alice and Bob are still in the table, but their `dept_id` is now `NULL`.

## Combining ON DELETE SET NULL with ON UPDATE CASCADE

You can specify different actions for delete and update on the same FK:

```sql
ALTER TABLE employees
  DROP FOREIGN KEY fk_emp_dept,
  ADD CONSTRAINT fk_emp_dept
    FOREIGN KEY (dept_id) REFERENCES departments (dept_id)
    ON DELETE SET NULL
    ON UPDATE CASCADE;
```

With this setup: if a department is deleted, employees lose the reference (NULL); if a department's `dept_id` changes, the employees' `dept_id` updates to match.

## Common Mistake: Non-Nullable Column

If the FK column is `NOT NULL`, MySQL will reject the `ON DELETE SET NULL` action at the point of table creation:

```sql
-- This will fail at table creation
dept_id INT UNSIGNED NOT NULL,
CONSTRAINT fk_emp_dept FOREIGN KEY (dept_id) REFERENCES departments (dept_id)
ON DELETE SET NULL  -- Error: column is NOT NULL
```

Always declare the FK column as `NULL` (or add a `DEFAULT NULL`) when using `SET NULL`.

## Adding ON DELETE SET NULL to an Existing Table

```sql
-- Drop existing FK
ALTER TABLE employees DROP FOREIGN KEY fk_emp_dept;

-- Ensure column is nullable
ALTER TABLE employees MODIFY dept_id INT UNSIGNED NULL;

-- Re-add FK with SET NULL
ALTER TABLE employees
  ADD CONSTRAINT fk_emp_dept
    FOREIGN KEY (dept_id) REFERENCES departments (dept_id)
    ON DELETE SET NULL;
```

## Querying Orphaned Records After Deletion

After a parent is deleted, find all child records that lost their reference:

```sql
SELECT employee_id, full_name
FROM employees
WHERE dept_id IS NULL;
```

This is useful for building a dashboard of unassigned items or for triggering reassignment workflows.

## ON DELETE Options Compared

| Option | Child row action |
|---|---|
| CASCADE | Child row is deleted |
| SET NULL | FK column set to NULL |
| SET DEFAULT | FK column set to its default value (parsed but not supported by InnoDB) |
| RESTRICT | Parent delete rejected if children exist |
| NO ACTION | Same as RESTRICT in MySQL |

## Summary

`ON DELETE SET NULL` preserves child rows when their parent is deleted by setting the foreign key column to `NULL`. The column must be nullable. Use it for loose parent-child relationships where child data retains independent value - such as tasks that outlive assigned employees or products that outlive deleted categories.
