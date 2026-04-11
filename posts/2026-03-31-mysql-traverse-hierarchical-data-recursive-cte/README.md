# How to Traverse Hierarchical Data with Recursive CTEs in MySQL

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MySQL, Recursive CTE, Hierarchical, SQL, Query

Description: Learn how to traverse parent-child hierarchical data in MySQL using recursive CTEs to walk tree structures like categories, org charts, and threaded comments.

---

## What Is Hierarchical Data?

Hierarchical data is organized in a tree structure where each record has an optional parent. Common examples include:

- Product category trees
- Employee reporting structures
- Comment threads
- File system directories

MySQL 8.0 supports recursive CTEs through the `WITH RECURSIVE` syntax, making tree traversal clean and efficient.

## Sample Table: Category Tree

```sql
CREATE TABLE categories (
  category_id   INT PRIMARY KEY,
  parent_id     INT NULL,
  category_name VARCHAR(100)
);

INSERT INTO categories VALUES
  (1,  NULL, 'Electronics'),
  (2,  1,    'Computers'),
  (3,  1,    'Phones'),
  (4,  2,    'Laptops'),
  (5,  2,    'Desktops'),
  (6,  3,    'Smartphones'),
  (7,  3,    'Feature Phones'),
  (8,  4,    'Gaming Laptops'),
  (9,  NULL, 'Clothing'),
  (10, 9,    'Men'),
  (11, 9,    'Women');
```

## Traversing Downward (Root to Leaves)

To retrieve all descendants of a given root node, start with the root in the anchor member and recursively join on `parent_id`:

```sql
WITH RECURSIVE category_tree AS (
  -- Anchor: start at the root
  SELECT
    category_id,
    parent_id,
    category_name,
    0 AS depth,
    CAST(category_name AS CHAR(1000)) AS path
  FROM categories
  WHERE parent_id IS NULL

  UNION ALL

  -- Recursive: join children to current level
  SELECT
    c.category_id,
    c.parent_id,
    c.category_name,
    ct.depth + 1,
    CONCAT(ct.path, ' > ', c.category_name)
  FROM categories c
  INNER JOIN category_tree ct ON c.parent_id = ct.category_id
)
SELECT
  category_id,
  depth,
  CONCAT(REPEAT('  ', depth), category_name) AS indented_name,
  path
FROM category_tree
ORDER BY path;
```

The `depth` column tracks level and `path` shows the full ancestry chain.

## Traversing Upward (Leaf to Root)

To find all ancestors of a given node - for example, to build a breadcrumb:

```sql
WITH RECURSIVE ancestors AS (
  -- Anchor: start at the target leaf
  SELECT category_id, parent_id, category_name, 0 AS level
  FROM categories
  WHERE category_id = 8  -- Gaming Laptops

  UNION ALL

  -- Recursive: walk up to the parent
  SELECT c.category_id, c.parent_id, c.category_name, a.level + 1
  FROM categories c
  INNER JOIN ancestors a ON c.category_id = a.parent_id
)
SELECT category_id, category_name, level
FROM ancestors
ORDER BY level DESC;
```

This returns the path from root down to the target: Electronics > Computers > Laptops > Gaming Laptops.

## Filtering a Subtree

To retrieve only the subtree under a specific node (not the whole tree), use that node as the anchor:

```sql
WITH RECURSIVE subtree AS (
  SELECT category_id, parent_id, category_name, 0 AS depth
  FROM categories
  WHERE category_id = 2  -- Computers subtree

  UNION ALL

  SELECT c.category_id, c.parent_id, c.category_name, s.depth + 1
  FROM categories c
  INNER JOIN subtree s ON c.parent_id = s.category_id
)
SELECT category_id, depth, category_name
FROM subtree
ORDER BY depth, category_name;
```

## Preventing Infinite Loops

If your data could have circular references, add a cycle guard:

```sql
WITH RECURSIVE safe_tree AS (
  SELECT category_id, parent_id, category_name,
         CAST(category_id AS CHAR(200)) AS visited_ids
  FROM categories WHERE parent_id IS NULL

  UNION ALL

  SELECT c.category_id, c.parent_id, c.category_name,
         CONCAT(st.visited_ids, ',', c.category_id)
  FROM categories c
  INNER JOIN safe_tree st ON c.parent_id = st.category_id
  WHERE FIND_IN_SET(c.category_id, st.visited_ids) = 0
)
SELECT * FROM safe_tree;
```

You can also set `cte_max_recursion_depth` (default 1000) to cap the maximum recursion depth for CTEs.

## Summary

MySQL's `WITH RECURSIVE` makes traversing hierarchical data natural and readable. Use it to walk trees top-down for full subtree queries, bottom-up for breadcrumb paths, or from any node to explore a partial subtree. The `depth` and `path` columns you build during recursion make it easy to indent output and reconstruct ancestry chains.
