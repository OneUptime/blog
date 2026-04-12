# How to Handle Bill of Materials with Recursive CTEs in MySQL

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MySQL, Recursive CTE, SQL, Hierarchical, Manufacturing

Description: Learn how to model and query bill of materials (BOM) structures in MySQL using recursive CTEs to explode multi-level product component trees.

---

## What Is a Bill of Materials?

A bill of materials (BOM) describes the components needed to build a product. Components can themselves have sub-components, forming a tree of arbitrary depth. Examples include:

- A laptop that requires a motherboard, display, and battery
- A motherboard that requires a CPU socket, RAM slots, and chipset
- A display assembly that requires a panel, backlight, and frame

This is a classic recursive tree problem, ideal for MySQL's `WITH RECURSIVE`.

## Schema and Sample Data

```sql
CREATE TABLE components (
  component_id   INT PRIMARY KEY,
  component_name VARCHAR(100),
  unit_cost      DECIMAL(10, 2)
);

CREATE TABLE bom (
  parent_id INT NOT NULL,
  child_id  INT NOT NULL,
  quantity  INT NOT NULL DEFAULT 1,
  PRIMARY KEY (parent_id, child_id),
  FOREIGN KEY (parent_id) REFERENCES components (component_id),
  FOREIGN KEY (child_id)  REFERENCES components (component_id)
);

INSERT INTO components VALUES
  (1, 'Laptop',        NULL),
  (2, 'Motherboard',   150.00),
  (3, 'Display Assy',   80.00),
  (4, 'Battery Pack',   25.00),
  (5, 'CPU',            90.00),
  (6, 'RAM 8GB',        20.00),
  (7, 'LCD Panel',      50.00),
  (8, 'Backlight',      15.00),
  (9, 'Chassis',        30.00);

INSERT INTO bom VALUES
  (1, 2, 1), (1, 3, 1), (1, 4, 1), (1, 9, 1),
  (2, 5, 1), (2, 6, 2),
  (3, 7, 1), (3, 8, 1);
```

## Exploding the BOM (Full Component Tree)

```sql
WITH RECURSIVE bom_explosion AS (
  -- Anchor: the top-level product
  SELECT
    b.parent_id AS root_id,
    b.child_id,
    b.quantity,
    c.component_name,
    c.unit_cost,
    1 AS level,
    CAST(c.component_name AS CHAR(1000)) AS path
  FROM bom b
  JOIN components c ON b.child_id = c.component_id
  WHERE b.parent_id = 1  -- Laptop

  UNION ALL

  -- Recursive: sub-components of each component
  SELECT
    be.root_id,
    b.child_id,
    be.quantity * b.quantity AS quantity,
    c.component_name,
    c.unit_cost,
    be.level + 1,
    CONCAT(be.path, ' > ', c.component_name)
  FROM bom b
  JOIN bom_explosion be ON b.parent_id = be.child_id
  JOIN components c ON b.child_id = c.component_id
)
SELECT
  level,
  CONCAT(REPEAT('  ', level - 1), component_name) AS component,
  quantity,
  unit_cost,
  quantity * unit_cost AS extended_cost,
  path
FROM bom_explosion
ORDER BY path;
```

Note that `be.quantity * b.quantity` accumulates quantities correctly as you go deeper.

## Calculating Total Material Cost

To roll up the total cost of a product including all nested components:

```sql
WITH RECURSIVE bom_explosion AS (
  SELECT b.child_id, b.quantity, c.unit_cost
  FROM bom b
  JOIN components c ON b.child_id = c.component_id
  WHERE b.parent_id = 1

  UNION ALL

  SELECT b.child_id, be.quantity * b.quantity, c.unit_cost
  FROM bom b
  JOIN bom_explosion be ON b.parent_id = be.child_id
  JOIN components c ON b.child_id = c.component_id
)
SELECT
  SUM(quantity * unit_cost) AS total_material_cost
FROM bom_explosion;
```

## Finding Where a Component Is Used

To find every product that directly or indirectly uses a given component (where-used query):

```sql
WITH RECURSIVE where_used AS (
  SELECT parent_id, child_id, 1 AS level
  FROM bom
  WHERE child_id = 6  -- RAM 8GB

  UNION ALL

  SELECT b.parent_id, b.child_id, wu.level + 1
  FROM bom b
  JOIN where_used wu ON b.child_id = wu.parent_id
)
SELECT DISTINCT wu.parent_id, c.component_name, wu.level
FROM where_used wu
JOIN components c ON wu.parent_id = c.component_id
ORDER BY wu.level DESC;
```

## Cycle Detection

In a well-formed BOM cycles should not exist, but data entry errors can create them. Add a comma-separated ID path column to your CTE and use it as a cycle guard:

```sql
CAST(b.child_id AS CHAR(1000)) AS id_path          -- in the anchor member
CONCAT(be.id_path, ',', b.child_id) AS id_path     -- in the recursive member
```

Then add this filter to the recursive member:

```sql
WHERE FIND_IN_SET(b.child_id, be.id_path) = 0
```

Or rely on `cte_max_recursion_depth` (default 1000) to stop infinite recursion.

## Summary

MySQL recursive CTEs are a natural fit for bill-of-materials queries. With a simple parent-child BOM table, you can explode multi-level assemblies, accumulate quantities across levels, calculate total material costs, and run where-used searches - all in clean, readable SQL without application-layer recursion.
