# How to Build Recursive-Like Queries in ClickHouse

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: ClickHouse, Recursive Query, CTE, Hierarchy, SQL

Description: Learn how to build recursive-like queries in ClickHouse to traverse hierarchies and compute path-based relationships without native recursion.

---

## Recursive Queries in ClickHouse

ClickHouse has supported recursive CTEs (`WITH RECURSIVE`) natively since version 24.4, using the new query analyzer (enabled by default since version 24.8). However, for large-scale hierarchies or performance-critical workloads, alternative patterns such as self-joins, arrays, and dictionary-based lookups often outperform recursive CTEs. These approaches are useful for organizational hierarchies, category trees, and graph traversal.

## Sample Hierarchy Data

```sql
CREATE TABLE org_chart
(
    id UInt32,
    name String,
    parent_id Nullable(UInt32)
)
ENGINE = MergeTree()
ORDER BY id;

INSERT INTO org_chart VALUES
(1, 'CEO', NULL),
(2, 'VP Engineering', 1),
(3, 'VP Sales', 1),
(4, 'Engineering Manager', 2),
(5, 'Sales Manager', 3),
(6, 'Developer', 4),
(7, 'Sales Rep', 5);
```

## Simulating Depth-Limited Traversal with Self-Joins

For shallow hierarchies (known max depth), chain self-joins:

```sql
SELECT
    l0.id,
    l0.name AS level0,
    l1.name AS level1,
    l2.name AS level2
FROM org_chart l0
LEFT JOIN org_chart l1 ON l0.id = l1.parent_id
LEFT JOIN org_chart l2 ON l1.id = l2.parent_id
WHERE l0.parent_id IS NULL;
```

## Building Path Arrays Iteratively

You can precompute paths by iterating in application code and storing them, or use ClickHouse arrays with `arrayMap` for limited traversal:

```sql
-- Assign level by counting ancestors via dictionary
CREATE DICTIONARY org_dict
(
    id UInt32,
    parent_id UInt32
)
PRIMARY KEY id
SOURCE(CLICKHOUSE(QUERY 'SELECT id, coalesce(parent_id, 0) AS parent_id FROM org_chart'))
LAYOUT(FLAT())
LIFETIME(300);
```

Then in a query:

```sql
SELECT
    id,
    name,
    dictGet('org_dict', 'parent_id', id) AS parent,
    dictGet('org_dict', 'parent_id', dictGet('org_dict', 'parent_id', id)) AS grandparent
FROM org_chart;
```

## Using Arrays for Path Accumulation

Store materialized paths directly in the table for efficient querying:

```sql
CREATE TABLE org_chart_paths
(
    id UInt32,
    name String,
    path Array(UInt32)
)
ENGINE = MergeTree()
ORDER BY id;

INSERT INTO org_chart_paths VALUES
(1, 'CEO', [1]),
(2, 'VP Engineering', [1, 2]),
(4, 'Engineering Manager', [1, 2, 4]),
(6, 'Developer', [1, 2, 4, 6]);
```

Query node 2 and all its descendants:

```sql
SELECT id, name
FROM org_chart_paths
WHERE has(path, 2);
```

## Generating Sequences with numbers()

For number-based recursion like Fibonacci approximations or sequence generation:

```sql
SELECT
    number,
    sum(number) OVER (ORDER BY number ROWS BETWEEN UNBOUNDED PRECEDING AND CURRENT ROW) AS cumulative
FROM numbers(10);
```

## Summary

While ClickHouse supports native recursive CTEs since version 24.4, alternative patterns often perform better at scale. Self-joins work well for fixed-depth trees, dictionaries enable fast parent lookups, and materialized path arrays handle ancestor/descendant queries efficiently. For dynamic hierarchies, storing the path array at write time is the most performant pattern.
