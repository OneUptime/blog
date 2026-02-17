# How to Write Recursive CTEs in BigQuery for Hierarchical Data Traversal

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: GCP, BigQuery, SQL, Recursive CTE, Hierarchical Data

Description: Learn how to use recursive CTEs in BigQuery to traverse hierarchical data structures like org charts, category trees, and bill of materials.

---

Hierarchical data is everywhere - organizational structures, product category trees, file system paths, bill of materials, network graphs. Querying these structures with plain SQL is painful because you do not know how many levels deep the hierarchy goes. Recursive Common Table Expressions (CTEs) solve this by letting a query reference itself, iteratively walking down (or up) a tree until it reaches the leaves. BigQuery supports recursive CTEs, and they are more practical than you might think.

## What Is a Recursive CTE

A recursive CTE has two parts: the anchor member (the starting point) and the recursive member (the step that repeats). The anchor selects the root rows, and the recursive member joins back to the CTE to find the next level, repeating until no more rows are found.

Here is the general structure:

```sql
-- General structure of a recursive CTE
WITH RECURSIVE cte_name AS (
  -- Anchor member: starting rows (e.g., root of the tree)
  SELECT columns FROM table WHERE condition

  UNION ALL

  -- Recursive member: joins back to the CTE to get the next level
  SELECT columns FROM table
  INNER JOIN cte_name ON table.parent = cte_name.id
)
SELECT * FROM cte_name;
```

## Traversing an Org Chart

Let us start with a classic example - an employee org chart where each employee has a manager_id pointing to their manager:

```sql
-- Sample employee hierarchy table
-- Each employee points to their manager via manager_id
-- The CEO has a NULL manager_id (root of the tree)
WITH RECURSIVE org_chart AS (
  -- Anchor: start with the CEO (no manager)
  SELECT
    employee_id,
    name,
    manager_id,
    title,
    1 AS level,
    CAST(name AS STRING) AS path
  FROM `my_project.hr.employees`
  WHERE manager_id IS NULL

  UNION ALL

  -- Recursive: find direct reports of the current level
  SELECT
    e.employee_id,
    e.name,
    e.manager_id,
    e.title,
    oc.level + 1 AS level,
    CONCAT(oc.path, ' > ', e.name) AS path
  FROM `my_project.hr.employees` e
  INNER JOIN org_chart oc ON e.manager_id = oc.employee_id
)
SELECT
  employee_id,
  name,
  title,
  level,
  path
FROM org_chart
ORDER BY path;
```

The `level` column tracks how deep we are in the hierarchy, and `path` builds a human-readable breadcrumb trail. The output might look like:

```
| employee_id | name          | title        | level | path                            |
|-------------|---------------|--------------|-------|---------------------------------|
| 1           | Alice Chen    | CEO          | 1     | Alice Chen                      |
| 2           | Bob Martinez  | VP Eng       | 2     | Alice Chen > Bob Martinez       |
| 5           | Diana Ross    | Eng Manager  | 3     | Alice Chen > Bob Martinez > ... |
```

## Finding All Ancestors (Bottom-Up)

Sometimes you need to go the other direction - starting from a leaf and walking up to the root. This is useful for things like "who are all the managers above this employee":

```sql
-- Walk up the hierarchy from a specific employee to the CEO
WITH RECURSIVE ancestors AS (
  -- Anchor: start with the target employee
  SELECT
    employee_id,
    name,
    manager_id,
    title,
    0 AS distance
  FROM `my_project.hr.employees`
  WHERE employee_id = 42  -- Starting employee

  UNION ALL

  -- Recursive: find the manager of the current level
  SELECT
    e.employee_id,
    e.name,
    e.manager_id,
    e.title,
    a.distance + 1
  FROM `my_project.hr.employees` e
  INNER JOIN ancestors a ON e.employee_id = a.manager_id
)
SELECT * FROM ancestors
ORDER BY distance;
```

## Product Category Trees

E-commerce category trees are another common hierarchical structure:

```sql
-- Build the full category path for every category in the tree
WITH RECURSIVE category_tree AS (
  -- Anchor: root categories (no parent)
  SELECT
    category_id,
    category_name,
    parent_category_id,
    CAST(category_name AS STRING) AS full_path,
    1 AS depth
  FROM `my_project.catalog.categories`
  WHERE parent_category_id IS NULL

  UNION ALL

  -- Recursive: find child categories
  SELECT
    c.category_id,
    c.category_name,
    c.parent_category_id,
    CONCAT(ct.full_path, ' / ', c.category_name) AS full_path,
    ct.depth + 1
  FROM `my_project.catalog.categories` c
  INNER JOIN category_tree ct ON c.parent_category_id = ct.category_id
)
-- Show all categories with their full paths
SELECT
  category_id,
  category_name,
  full_path,
  depth
FROM category_tree
ORDER BY full_path;
```

This produces output like:
```
Electronics / Computers / Laptops / Gaming Laptops
Electronics / Computers / Laptops / Business Laptops
Electronics / Phones / Smartphones / Android
```

## Bill of Materials (BOM) Explosion

Manufacturing and engineering use bill of materials structures where a product is made up of components, which are themselves made of sub-components:

```sql
-- Explode a bill of materials to find all components of a product
WITH RECURSIVE bom_explosion AS (
  -- Anchor: top-level product
  SELECT
    component_id,
    component_name,
    parent_id,
    quantity,
    quantity AS total_quantity,  -- At top level, total = quantity
    1 AS bom_level
  FROM `my_project.manufacturing.bom`
  WHERE parent_id IS NULL
    AND component_id = 'PROD-001'  -- Starting product

  UNION ALL

  -- Recursive: find sub-components and multiply quantities
  SELECT
    b.component_id,
    b.component_name,
    b.parent_id,
    b.quantity,
    b.quantity * be.total_quantity AS total_quantity,
    be.bom_level + 1
  FROM `my_project.manufacturing.bom` b
  INNER JOIN bom_explosion be ON b.parent_id = be.component_id
)
SELECT
  component_id,
  component_name,
  bom_level,
  total_quantity
FROM bom_explosion
ORDER BY bom_level, component_name;
```

The `total_quantity` multiplication is key - if a product needs 2 assemblies and each assembly needs 3 bolts, the total bolts needed is 6.

## Graph Traversal: Finding Connected Nodes

Recursive CTEs can traverse graph structures beyond simple trees. Here is finding all nodes reachable from a starting node:

```sql
-- Find all servers reachable from a starting server in a network graph
WITH RECURSIVE reachable AS (
  -- Anchor: starting server
  SELECT
    CAST('server-a' AS STRING) AS server_id,
    0 AS hops,
    CAST('server-a' AS STRING) AS path

  UNION ALL

  -- Recursive: find servers connected to current set
  SELECT
    n.target_server AS server_id,
    r.hops + 1 AS hops,
    CONCAT(r.path, ' -> ', n.target_server) AS path
  FROM `my_project.network.connections` n
  INNER JOIN reachable r ON n.source_server = r.server_id
  -- Prevent cycles by checking the path
  WHERE STRPOS(r.path, n.target_server) = 0
  -- Limit depth to prevent infinite recursion
  AND r.hops < 10
)
SELECT DISTINCT
  server_id,
  MIN(hops) AS min_hops
FROM reachable
GROUP BY server_id
ORDER BY min_hops;
```

The cycle prevention (`STRPOS` check) and depth limit are essential for graph traversal. Without them, cycles in the graph would cause infinite recursion.

## Recursion Limits and Safety

BigQuery has a default recursion limit of 500 iterations. For most hierarchical data, this is more than enough (a 500-level-deep tree would be unusual). But you should always add a depth guard:

```sql
-- Safe recursive CTE with explicit depth limit
WITH RECURSIVE safe_hierarchy AS (
  SELECT id, parent_id, name, 1 AS depth
  FROM my_table
  WHERE parent_id IS NULL

  UNION ALL

  SELECT t.id, t.parent_id, t.name, sh.depth + 1
  FROM my_table t
  INNER JOIN safe_hierarchy sh ON t.parent_id = sh.id
  -- Explicit depth limit prevents runaway recursion
  WHERE sh.depth < 50
)
SELECT * FROM safe_hierarchy;
```

## Performance Considerations

Recursive CTEs in BigQuery process each iteration as a separate stage. The more levels in your hierarchy, the more stages BigQuery needs to execute. For deep hierarchies (dozens of levels) or wide ones (millions of nodes per level), performance can degrade.

A few tips to keep recursive CTEs performant: filter early to reduce the number of rows at each level, keep the join condition selective (use indexed or clustered columns), and avoid accumulating large strings in the path column if you do not need them. For very large graphs, consider materializing intermediate results.

Recursive CTEs unlock a whole class of queries that would otherwise require procedural code or multiple round trips. If you are dealing with any kind of hierarchical or graph-structured data in BigQuery, they are an essential tool in your SQL toolkit.
