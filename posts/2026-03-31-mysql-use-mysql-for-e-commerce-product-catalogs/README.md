# How to Use MySQL for E-Commerce Product Catalogs

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MySQL, E-Commerce, Catalog, Schema, Search

Description: Learn how to design a MySQL product catalog for e-commerce with categories, variants, pricing, and full-text search to support browse and search product experiences.

---

A product catalog is the core of any e-commerce database. The schema must handle hierarchical categories, product variants (size, color), flexible attributes, pricing rules, and search. MySQL's combination of relational structure and full-text indexing makes it well-suited for catalogs up to millions of products.

## Core Product Schema

```sql
CREATE TABLE categories (
  id        INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  parent_id INT UNSIGNED,
  name      VARCHAR(200) NOT NULL,
  slug      VARCHAR(200) NOT NULL,
  sort_order SMALLINT NOT NULL DEFAULT 0,
  UNIQUE KEY uq_slug (slug),
  CONSTRAINT fk_cat_parent FOREIGN KEY (parent_id) REFERENCES categories (id)
);

CREATE TABLE products (
  id           BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  category_id  INT UNSIGNED NOT NULL,
  sku          VARCHAR(100) NOT NULL,
  name         VARCHAR(300) NOT NULL,
  description  TEXT,
  base_price   DECIMAL(10,2) NOT NULL,
  is_active    TINYINT(1) NOT NULL DEFAULT 1,
  created_at   DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY uq_sku (sku),
  INDEX idx_category_active (category_id, is_active),
  FULLTEXT INDEX ft_name_desc (name, description),
  CONSTRAINT fk_product_cat FOREIGN KEY (category_id) REFERENCES categories (id)
) ENGINE=InnoDB;
```

## Product Variants

Variants model size/color combinations with their own SKUs and pricing:

```sql
CREATE TABLE product_variants (
  id         BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  product_id BIGINT UNSIGNED NOT NULL,
  sku        VARCHAR(100) NOT NULL,
  name       VARCHAR(200) NOT NULL,
  price      DECIMAL(10,2) NOT NULL,
  stock_qty  INT NOT NULL DEFAULT 0,
  UNIQUE KEY uq_sku (sku),
  INDEX idx_product_id (product_id),
  CONSTRAINT fk_variant_product FOREIGN KEY (product_id) REFERENCES products (id) ON DELETE CASCADE
);
```

## Flexible Product Attributes

Use a JSON column for flexible attributes instead of EAV:

```sql
ALTER TABLE products ADD COLUMN attributes JSON;

UPDATE products SET attributes = '{
  "brand": "Acme",
  "material": "cotton",
  "weight_g": 250,
  "colors": ["red", "blue", "black"]
}' WHERE id = 1;
```

Add generated columns and indexes for frequently filtered attributes:

```sql
ALTER TABLE products
  ADD COLUMN brand VARCHAR(100)
  GENERATED ALWAYS AS (attributes->>'$.brand') STORED,
  ADD INDEX idx_brand (brand);
```

## Browsing by Category

```sql
SELECT p.id, p.sku, p.name, p.base_price
FROM products p
WHERE p.category_id = 5
  AND p.is_active = 1
ORDER BY p.base_price ASC
LIMIT 24;
```

## Full-Text Product Search

```sql
SELECT
  p.id,
  p.name,
  p.base_price,
  MATCH(p.name, p.description) AGAINST('wireless bluetooth headphones' IN BOOLEAN MODE) AS relevance
FROM products p
WHERE p.is_active = 1
  AND MATCH(p.name, p.description) AGAINST('wireless bluetooth headphones' IN BOOLEAN MODE)
ORDER BY relevance DESC
LIMIT 24;
```

## Price Range Filtering

```sql
SELECT id, name, base_price
FROM products
WHERE category_id = 5
  AND is_active = 1
  AND base_price BETWEEN 20.00 AND 100.00
ORDER BY base_price ASC;
```

Add a composite index for price range queries within a category:

```sql
ALTER TABLE products ADD INDEX idx_cat_active_price (category_id, is_active, base_price);
```

## Summary

A MySQL product catalog schema uses hierarchical categories with a self-referencing FK, variant tables for size/color combinations, JSON attributes with generated indexed columns for filterable fields, and FULLTEXT indexes for keyword search. Covering indexes on `(category_id, is_active, base_price)` support the browse-with-filter pattern that drives most catalog traffic. For catalogs exceeding tens of millions of products with faceted search requirements, Elasticsearch provides more advanced search capabilities.
