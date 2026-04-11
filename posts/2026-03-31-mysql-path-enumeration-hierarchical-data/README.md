# How to Implement Path Enumeration for Hierarchical Data in MySQL

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MySQL, Hierarchy, Path Enumeration, Query, Schema

Description: Learn how to use the path enumeration pattern in MySQL to store and query hierarchical data like file systems, org charts, and category trees.

---

## What Is Path Enumeration?

Path enumeration (also called materialized path) stores the full path from the root to each node as a delimited string in a single column. For example, a node might store `/1/4/9/` indicating it is node 9, a child of node 4, which is a child of node 1. This makes subtree queries fast via simple `LIKE` prefix matching.

## Schema Setup

```sql
CREATE TABLE categories (
  id   INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  path VARCHAR(1000) NOT NULL COMMENT 'e.g. /1/4/9/'
);

CREATE INDEX idx_path ON categories (path(255));
```

The path column should be long enough to accommodate deep hierarchies. An index on `path` enables efficient prefix searches.

## Inserting a Root Node

```sql
INSERT INTO categories (name, path) VALUES ('Root', '/');
-- Suppose LAST_INSERT_ID() returns 1, update to embed the id
UPDATE categories SET path = CONCAT('/', id, '/') WHERE id = 1;
```

## Inserting a Child Node

To insert a child under a known parent:

```sql
-- Retrieve the parent's path
SELECT path INTO @parent_path FROM categories WHERE id = 4;

-- Insert the new node with a temporary path, then fix it
INSERT INTO categories (name, path) VALUES ('Laptops', '/placeholder/');
SET @new_id = LAST_INSERT_ID();
UPDATE categories
  SET path = CONCAT(@parent_path, @new_id, '/')
WHERE id = @new_id;
```

A stored procedure or application layer typically wraps these steps.

## Querying All Descendants

Because every descendant's path starts with the ancestor's path, a `LIKE` prefix query retrieves the full subtree:

```sql
SELECT * FROM categories
WHERE path LIKE '/1/4/%'
ORDER BY path;
```

The result is naturally ordered from ancestor to descendant when sorted by `path`.

## Querying Direct Children

Use the path length to distinguish depth. Direct children have exactly one extra segment:

```sql
SELECT * FROM categories
WHERE path LIKE CONCAT(@parent_path, '%')
  AND path != @parent_path
  AND path NOT LIKE CONCAT(@parent_path, '%/%/%');
```

A cleaner approach is to store a `depth` integer alongside `path` and filter by `depth = parent_depth + 1`.

## Querying Ancestors (Breadcrumb)

Split the path string and look up each ancestor by ID:

```sql
SELECT * FROM categories
WHERE FIND_IN_SET(id,
  REPLACE(TRIM(BOTH '/' FROM '/1/4/9/'), '/', ',')
) > 0
ORDER BY LENGTH(path);
```

## Moving a Subtree

Updating a subtree means replacing the old path prefix with the new one for all affected rows:

```sql
UPDATE categories
SET path = CONCAT(@new_parent_path,
                  SUBSTRING(path, LENGTH(@old_parent_path) + 1))
WHERE path LIKE CONCAT(@old_parent_path, '%');
```

## Deleting a Subtree

```sql
DELETE FROM categories
WHERE path LIKE CONCAT(@subtree_path, '%');
```

This removes the node and all descendants in one statement.

## Trade-offs vs. Closure Table

Path enumeration is simpler to implement and requires only one extra column. It handles unlimited depth without extra join tables. However, `LIKE '%...'` queries cannot use a standard B-Tree index efficiently. Using a prefix `LIKE '/1/4/%'` (anchored left) allows index range scans. It is best suited for datasets where paths stay short and hierarchies are read far more than modified.

## Summary

Path enumeration is a lightweight pattern for hierarchical data in MySQL. Store the materialized path as a delimited string, index it, and use prefix `LIKE` queries to fetch subtrees in a single scan. It is ideal for category trees and file-system-like structures where simplicity matters and paths remain reasonably short.
