# How to Implement Adjacency List Model in MySQL

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MySQL, Hierarchy, Pattern, Schema, CTE

Description: Learn how to implement the adjacency list model for hierarchical data in MySQL, covering insertions, recursive traversal, and common operations.

---

## What Is the Adjacency List Model?

The adjacency list model is the most common approach for storing hierarchical data in a relational database. Each row stores a reference to its immediate parent via a `parent_id` column. It is simple to understand, easy to modify, and integrates naturally with MySQL's recursive CTE support in version 8.0.

## Schema Setup

```sql
CREATE TABLE employees (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    title VARCHAR(100),
    manager_id INT NULL,  -- NULL for top-level (CEO)
    department VARCHAR(100),
    salary DECIMAL(10,2),
    INDEX idx_manager (manager_id),
    FOREIGN KEY (manager_id) REFERENCES employees(id) ON DELETE SET NULL
);

-- Seed data representing an org chart
INSERT INTO employees (id, name, title, manager_id, department, salary) VALUES
    (1,  'Sarah CEO',    'CEO',              NULL, 'Executive',   250000),
    (2,  'Bob VP Eng',   'VP Engineering',   1,    'Engineering', 180000),
    (3,  'Carol VP Mkt', 'VP Marketing',     1,    'Marketing',   170000),
    (4,  'Dave Dir',     'Director',         2,    'Engineering', 140000),
    (5,  'Eve Dir',      'Director',         2,    'Engineering', 135000),
    (6,  'Frank Mgr',    'Manager',          4,    'Engineering', 110000),
    (7,  'Grace Eng',    'Engineer',         6,    'Engineering',  90000),
    (8,  'Henry Eng',    'Engineer',         6,    'Engineering',  85000);
```

## Fetching Direct Reports

```sql
-- Get all direct reports of Bob (id=2)
SELECT id, name, title
FROM employees
WHERE manager_id = 2
ORDER BY name;
```

## Full Subtree with Recursive CTE

```sql
-- Get the full reporting hierarchy under Bob (id=2)
WITH RECURSIVE org_chart AS (
    -- Anchor: start with Bob
    SELECT
        id,
        name,
        title,
        manager_id,
        0 AS depth,
        CAST(name AS CHAR(1000)) AS reporting_chain
    FROM employees
    WHERE id = 2

    UNION ALL

    -- Recursive: add each person's direct reports
    SELECT
        e.id,
        e.name,
        e.title,
        e.manager_id,
        oc.depth + 1,
        CONCAT(oc.reporting_chain, ' > ', e.name)
    FROM employees e
    JOIN org_chart oc ON e.manager_id = oc.id
)
SELECT
    CONCAT(REPEAT('  ', depth), name) AS indented_name,
    title,
    depth,
    reporting_chain
FROM org_chart
ORDER BY reporting_chain;
```

## Finding the Path to Root (Management Chain)

```sql
-- Find the management chain for Henry (id=8)
WITH RECURSIVE management_chain AS (
    -- Start from Henry
    SELECT id, name, title, manager_id
    FROM employees
    WHERE id = 8

    UNION ALL

    -- Walk upward to CEO
    SELECT e.id, e.name, e.title, e.manager_id
    FROM employees e
    JOIN management_chain mc ON e.id = mc.manager_id
)
SELECT name, title
FROM management_chain
ORDER BY id ASC;  -- CEO first
```

## Counting Subordinates per Manager

```sql
-- Count total subordinates (all levels) for each manager
WITH RECURSIVE subordinates AS (
    SELECT id, id AS sub_id FROM employees

    UNION ALL

    SELECT s.id, e.id AS sub_id
    FROM subordinates s
    JOIN employees e ON e.manager_id = s.sub_id
)
SELECT
    e.id,
    e.name,
    e.title,
    COUNT(s.sub_id) - 1 AS subordinate_count  -- Subtract self
FROM employees e
LEFT JOIN subordinates s ON e.id = s.id
GROUP BY e.id, e.name, e.title
ORDER BY subordinate_count DESC;
```

## Updating the Hierarchy

```sql
-- Reassign Grace and Henry to report directly to Dave (id=4)
UPDATE employees
SET manager_id = 4
WHERE id IN (7, 8);

-- Promote Frank to report to Bob (bypass Dave level)
UPDATE employees
SET manager_id = 2
WHERE id = 6;
```

## Preventing Circular References

```sql
-- Check before reassigning: would setting employee 4's manager to 7 create a cycle?
WITH RECURSIVE check_cycle AS (
    SELECT id, manager_id FROM employees WHERE id = 7  -- Start from proposed new manager

    UNION ALL

    SELECT e.id, e.manager_id
    FROM employees e
    JOIN check_cycle cc ON e.id = cc.manager_id
)
SELECT COUNT(*) AS cycle_detected
FROM check_cycle
WHERE id = 4;  -- The employee being reassigned - non-zero means cycle
```

## Summary

The adjacency list model in MySQL stores each node's parent reference in a single `manager_id` (or `parent_id`) column. It is the easiest hierarchical model to implement and modify. With MySQL 8.0 recursive CTEs, you can traverse entire trees, build breadcrumb paths, count subtree sizes, and detect circular references - all within SQL without application-level tree walking.
