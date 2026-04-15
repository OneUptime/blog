# How to Model Hierarchical Data in ClickHouse

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: ClickHouse, Hierarchical Data, Dictionary, Tree, Analytics, Schema Design

Description: Learn how to model hierarchical data in ClickHouse using dictionary hierarchies, materialized path patterns, and recursive query alternatives.

---

Hierarchical data (org charts, product categories, geographic regions, file systems) presents a challenge in columnar databases. While ClickHouse supports recursive CTEs since version 24.3, dictionary-based hierarchies, materialized path strings, and closure tables often provide better performance for hierarchical queries at scale.

## Approach 1: Dictionary Hierarchy (Built-in ClickHouse Feature)

ClickHouse dictionaries support parent-child relationships natively:

```sql
CREATE TABLE category_table (
    id UInt64,
    name String,
    parent_id UInt64
) ENGINE = MergeTree()
ORDER BY id;

INSERT INTO category_table VALUES
    (1, 'All', 0),
    (2, 'Electronics', 1),
    (3, 'Computers', 2),
    (4, 'Laptops', 3),
    (5, 'Clothing', 1),
    (6, 'Shoes', 5);

CREATE DICTIONARY category_hierarchy (
    id UInt64,
    name String,
    parent_id UInt64 HIERARCHICAL
) PRIMARY KEY id
SOURCE(CLICKHOUSE(TABLE 'category_table'))
LAYOUT(FLAT())
LIFETIME(3600);
```

Use hierarchy functions:

```sql
-- Get all ancestors of 'Laptops' (id=4)
SELECT dictGetHierarchy('category_hierarchy', 4) AS ancestors;
-- Returns: [4, 3, 2, 1]

-- Check if 'Laptops' is under 'Electronics'
SELECT dictIsIn('category_hierarchy', 4, 2) AS is_under_electronics;
-- Returns: 1

-- Find all items under 'Electronics' in a query
SELECT product_id, name
FROM products
WHERE dictIsIn('category_hierarchy', category_id, 2);
```

## Approach 2: Materialized Path

Store the full path from root to node as a string:

```sql
CREATE TABLE categories (
    id UInt32,
    name String,
    path String,    -- e.g. '/1/2/3/4/'
    depth UInt8,
    parent_id UInt32
) ENGINE = MergeTree()
ORDER BY (path, id);

INSERT INTO categories VALUES
    (1, 'All',         '/1/',        1, 0),
    (2, 'Electronics', '/1/2/',      2, 1),
    (3, 'Computers',   '/1/2/3/',    3, 2),
    (4, 'Laptops',     '/1/2/3/4/',  4, 3);

-- Find all descendants of Electronics (id=2)
SELECT id, name, depth
FROM categories
WHERE path LIKE '/1/2/%'
ORDER BY path;

-- Find all ancestors of Laptops (id=4)
SELECT id, name
FROM categories
WHERE '/1/2/3/4/' LIKE concat(path, '%')
ORDER BY depth;
```

## Approach 3: Closure Table

Pre-compute all ancestor-descendant pairs for O(1) traversal:

```sql
CREATE TABLE category_closure (
    ancestor_id UInt32,
    descendant_id UInt32,
    depth UInt8
) ENGINE = MergeTree()
ORDER BY (ancestor_id, descendant_id);

-- All descendants of Electronics (id=2) at any depth
SELECT d.id, d.name
FROM categories d
JOIN category_closure c ON d.id = c.descendant_id
WHERE c.ancestor_id = 2 AND c.depth > 0;
```

## Flattening Hierarchies for Analytics

Pre-compute parent hierarchy for each node to avoid runtime traversal:

```sql
CREATE TABLE products_with_category_path (
    product_id UInt32,
    name String,
    category_id UInt32,
    category_name String,
    parent_category_id UInt32,
    parent_category_name String,
    root_category_name String
) ENGINE = MergeTree()
ORDER BY (root_category_name, parent_category_name, product_id);
```

## Summary

Although ClickHouse now supports recursive CTEs (since version 24.3), hierarchical data is often modeled more efficiently with dictionary hierarchies (best for filtering), materialized path strings (best for range queries), and closure tables (best for flexible traversal). For analytics, pre-flatten the hierarchy into fact tables to avoid traversal at query time entirely.
