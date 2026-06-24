# How to Use Recursive CTEs Alternative in ClickHouse

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: ClickHouse, CTE, Recursive Query, Hierarchical Data, SQL Pattern

Description: ClickHouse does not support recursive CTEs - learn alternative patterns using arrays, self-joins, and pre-computed hierarchies to query tree-structured data.

---

## Why Alternative Patterns Still Matter

ClickHouse added support for recursive CTEs (`WITH RECURSIVE`) in version 24.4, enabled by default since version 24.8 via the new query analyzer. However, recursive CTEs involve iterative row-level processing that can be slower than ClickHouse's native columnar operations for large-scale analytical workloads. Pre-flattened hierarchies and array-based patterns leverage ClickHouse's strengths - columnar reads, vectorized execution, and batch processing - and are often the better choice for production OLAP queries on tree-structured data.

## Common Recursive CTE Use Case: Category Hierarchy

In PostgreSQL, you might use a recursive CTE to traverse a category tree. In ClickHouse, the recommended approach is to flatten the hierarchy at write time.

## Pattern 1: Pre-Flattened Hierarchy Table

```sql
-- Store the full ancestor path at write time
CREATE TABLE category_hierarchy
(
    category_id UInt32,
    category_name String,
    parent_id UInt32,
    depth UInt8,
    path Array(UInt32),  -- [root_id, ..., parent_id, category_id]
    path_names Array(String)
)
ENGINE = MergeTree
ORDER BY (category_id);

-- Example data
INSERT INTO category_hierarchy VALUES
(1, 'Electronics',   0,  0, [1],       ['Electronics']),
(2, 'Phones',        1,  1, [1,2],     ['Electronics','Phones']),
(3, 'Smartphones',   2,  2, [1,2,3],   ['Electronics','Phones','Smartphones']);
```

```sql
-- Find all descendants of 'Electronics' (category_id = 1)
SELECT category_id, category_name, depth
FROM category_hierarchy
WHERE has(path, 1)
ORDER BY depth, category_name;
```

## Pattern 2: Array-Based Tree Traversal

```sql
-- Build ancestor chain using array functions
SELECT
    category_id,
    category_name,
    arrayJoin(path) AS ancestor_id
FROM category_hierarchy
WHERE category_id = 3;  -- Smartphones ancestors

-- Result: 1 (Electronics), 2 (Phones), 3 (Smartphones)
```

## Pattern 3: Multi-Level Self-Join (up to N levels)

For shallow trees (up to 3-4 levels), self-joins work well:

```sql
CREATE TABLE categories
(
    id UInt32,
    name String,
    parent_id UInt32  -- 0 means root
)
ENGINE = MergeTree ORDER BY id;
```

```sql
-- 3-level hierarchy traversal via self-join
SELECT
    l1.id AS root_id,
    l1.name AS root_name,
    l2.id AS child_id,
    l2.name AS child_name,
    l3.id AS grandchild_id,
    l3.name AS grandchild_name
FROM categories AS l1
LEFT JOIN categories AS l2 ON l2.parent_id = l1.id
LEFT JOIN categories AS l3 ON l3.parent_id = l2.id
WHERE l1.parent_id = 0  -- start from roots
ORDER BY l1.name, l2.name, l3.name;
```

## Pattern 4: Employee Org Chart Traversal

```sql
CREATE TABLE employees
(
    employee_id UInt64,
    name String,
    manager_id UInt64,
    department LowCardinality(String),
    -- Pre-computed fields
    level UInt8,
    reporting_chain Array(UInt64)  -- [ceo_id, ..., direct_manager_id, self_id]
)
ENGINE = MergeTree ORDER BY employee_id;
```

```sql
-- All reports under manager_id = 42 (any depth)
SELECT employee_id, name, level
FROM employees
WHERE has(reporting_chain, 42)
  AND employee_id != 42
ORDER BY level, name;
```

## When to Use External Processing

For truly dynamic recursive queries where the hierarchy changes frequently, consider computing the hierarchy in application code and materializing results:

```python
def get_all_descendants(conn, root_id):
    queue = [root_id]
    result = []
    while queue:
        current = queue.pop(0)
        children = conn.query(
            "SELECT id FROM categories WHERE parent_id = {id:UInt32}",
            parameters={'id': current}
        ).result_rows
        for (child_id,) in children:
            result.append(child_id)
            queue.append(child_id)
    return result
```

## Summary

While ClickHouse supports recursive CTEs since version 24.4, pre-flattened hierarchy tables with Array columns storing ancestor paths are often more performant for analytical workloads. For shallow trees (under 4 levels), multi-level self-joins work well. For dynamic hierarchies, pre-compute and store the ancestor path in an Array column at write time so reads remain simple `has(path, ancestor_id)` lookups.
