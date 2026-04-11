# How to Implement Parent-Child Relationships in MySQL

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MySQL, Schema, Hierarchy, Relationship, Foreign Key

Description: Learn how to model parent-child relationships in MySQL using self-referencing foreign keys with practical examples for categories and org charts.

---

## What Are Parent-Child Relationships?

A parent-child relationship exists when records in a table can reference other records in the same table as their parent. Common examples include categories with subcategories, organizational charts, comment threads, file system directories, and geographic hierarchies.

The simplest implementation is the self-referencing foreign key (adjacency list model).

## Schema Design

```sql
-- Product categories with parent-child hierarchy
CREATE TABLE categories (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    slug VARCHAR(100) NOT NULL UNIQUE,
    parent_id INT NULL DEFAULT NULL,  -- NULL = root category
    sort_order INT NOT NULL DEFAULT 0,
    is_active TINYINT(1) NOT NULL DEFAULT 1,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_parent (parent_id),
    FOREIGN KEY (parent_id) REFERENCES categories(id) ON DELETE SET NULL
);
```

## Inserting Hierarchical Data

```sql
-- Root categories (no parent)
INSERT INTO categories (name, slug, parent_id) VALUES
    ('Electronics', 'electronics', NULL),
    ('Clothing', 'clothing', NULL),
    ('Books', 'books', NULL);

-- Child categories
INSERT INTO categories (name, slug, parent_id) VALUES
    ('Laptops', 'laptops', 1),         -- Parent: Electronics
    ('Smartphones', 'smartphones', 1),  -- Parent: Electronics
    ('Men''s Clothing', 'mens', 2),     -- Parent: Clothing
    ('Women''s Clothing', 'womens', 2); -- Parent: Clothing

-- Grandchild categories
INSERT INTO categories (name, slug, parent_id) VALUES
    ('Gaming Laptops', 'gaming-laptops', 4),  -- Parent: Laptops
    ('Business Laptops', 'business-laptops', 4);
```

## Fetching Direct Children

```sql
-- Get immediate children of a category
SELECT id, name, slug
FROM categories
WHERE parent_id = 1  -- Electronics children
  AND is_active = 1
ORDER BY sort_order, name;
```

## Fetching Full Hierarchy with CTE

```sql
-- Fetch the entire category tree starting from root
WITH RECURSIVE category_tree AS (
    -- Anchor: root categories
    SELECT
        id,
        name,
        slug,
        parent_id,
        0 AS depth,
        CAST(name AS CHAR(500)) AS path,
        CAST(LPAD(sort_order, 5, '0') AS CHAR(500)) AS sort_path
    FROM categories
    WHERE parent_id IS NULL
      AND is_active = 1

    UNION ALL

    -- Recursive: children
    SELECT
        c.id,
        c.name,
        c.slug,
        c.parent_id,
        ct.depth + 1,
        CONCAT(ct.path, ' > ', c.name),
        CONCAT(ct.sort_path, '.', LPAD(c.sort_order, 5, '0'))
    FROM categories c
    JOIN category_tree ct ON c.parent_id = ct.id
    WHERE c.is_active = 1
)
SELECT
    id,
    CONCAT(REPEAT('  ', depth), name) AS indented_name,
    slug,
    depth,
    path
FROM category_tree
ORDER BY sort_path;
```

## Fetching Breadcrumb Path for a Category

```sql
-- Get breadcrumb path: "Electronics > Laptops > Gaming Laptops"
WITH RECURSIVE breadcrumb AS (
    -- Start from the target category
    SELECT id, name, parent_id, 0 AS level
    FROM categories
    WHERE id = 8  -- Gaming Laptops

    UNION ALL

    -- Walk up to root
    SELECT c.id, c.name, c.parent_id, b.level + 1
    FROM categories c
    JOIN breadcrumb b ON c.id = b.parent_id
)
SELECT name
FROM breadcrumb
ORDER BY level DESC;  -- Root first
```

## Moving a Category

```sql
-- Move 'Gaming Laptops' from 'Laptops' to 'Electronics' directly
UPDATE categories
SET parent_id = 1  -- Electronics
WHERE id = 8;      -- Gaming Laptops
```

## Checking for Circular References

Before moving, verify you are not creating a circular reference:

```sql
-- Check if target_parent is a descendant of the node being moved
WITH RECURSIVE descendants AS (
    SELECT id FROM categories WHERE id = 8  -- Node being moved

    UNION ALL

    SELECT c.id FROM categories c
    JOIN descendants d ON c.parent_id = d.id
)
SELECT COUNT(*) AS would_be_circular
FROM descendants
WHERE id = 1;  -- Target parent - 0 means safe to move
```

## Summary

Parent-child relationships in MySQL are implemented with a self-referencing `parent_id` foreign key. Direct parent-child queries are simple indexed lookups. Recursive CTEs in MySQL 8.0 enable full tree traversal for displaying hierarchies and building breadcrumb paths. The adjacency list model is straightforward to query and update, making it the right starting point for most hierarchical data needs.
