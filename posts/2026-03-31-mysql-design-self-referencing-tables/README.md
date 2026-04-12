# How to Design Self-Referencing Tables in MySQL

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MySQL, Self-Join, Hierarchical Data, Schema Design

Description: Learn how to model hierarchical and recursive data in MySQL using self-referencing tables, with queries for trees and organizational charts.

---

A self-referencing table (also called a recursive or adjacency list table) has a foreign key that points back to its own primary key. This pattern models hierarchical structures like organizational charts, category trees, threaded comments, and file systems.

## Basic Schema

```sql
CREATE TABLE categories (
    id        INT UNSIGNED NOT NULL AUTO_INCREMENT,
    parent_id INT UNSIGNED NULL,
    name      VARCHAR(100) NOT NULL,
    PRIMARY KEY (id),
    KEY idx_parent (parent_id),
    CONSTRAINT fk_category_parent
        FOREIGN KEY (parent_id) REFERENCES categories (id)
        ON DELETE SET NULL
        ON UPDATE CASCADE
);
```

Root nodes have `parent_id = NULL`. Non-root nodes have a `parent_id` pointing to their parent row.

## Inserting a Tree

```sql
INSERT INTO categories (parent_id, name) VALUES
    (NULL,  'Electronics'),          -- id 1, root
    (1,     'Phones'),               -- id 2
    (1,     'Laptops'),              -- id 3
    (2,     'Smartphones'),          -- id 4
    (2,     'Feature Phones'),       -- id 5
    (3,     'Gaming Laptops');       -- id 6
```

## Querying One Level Down (Self-Join)

```sql
SELECT parent.name AS parent_category,
       child.name  AS child_category
FROM   categories parent
JOIN   categories child ON child.parent_id = parent.id
WHERE  parent.parent_id IS NULL;
```

## Recursive Traversal With a CTE

MySQL 8.0+ supports recursive CTEs, making full tree traversal possible without application-side loops:

```sql
WITH RECURSIVE category_tree AS (
    -- Anchor: start from root
    SELECT id, parent_id, name, 0 AS depth, CAST(name AS CHAR(500)) AS path
    FROM   categories
    WHERE  parent_id IS NULL

    UNION ALL

    -- Recursive: join children
    SELECT c.id, c.parent_id, c.name,
           ct.depth + 1,
           CONCAT(ct.path, ' > ', c.name)
    FROM   categories c
    JOIN   category_tree ct ON ct.id = c.parent_id
)
SELECT depth, path, name
FROM   category_tree
ORDER BY path;
```

## Finding All Ancestors

```sql
WITH RECURSIVE ancestors AS (
    SELECT id, parent_id, name
    FROM   categories WHERE id = 4        -- start at 'Smartphones'

    UNION ALL

    SELECT c.id, c.parent_id, c.name
    FROM   categories c
    JOIN   ancestors a ON c.id = a.parent_id
)
SELECT name FROM ancestors WHERE id != 4;
```

## Preventing Cycles

A self-referencing table can suffer from circular references (A is parent of B, B is parent of A). Guard against this with application validation or a trigger that traverses the chain before insertion.

```sql
-- Simple check before inserting a new parent assignment
SELECT COUNT(*) FROM categories
WHERE id = :new_parent_id
  AND parent_id = :child_id;  -- would create a cycle
```

## Summary

Model hierarchical data with a nullable `parent_id` foreign key pointing to the same table. Index `parent_id` for join performance. Use recursive CTEs in MySQL 8.0+ for full tree traversal. For very deep trees or frequent ancestor queries, consider materializing paths or using the Nested Set model instead of the adjacency list.
