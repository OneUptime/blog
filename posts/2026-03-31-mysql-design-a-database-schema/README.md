# How to Design a Database Schema in MySQL

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MySQL, Schema Design, Database, Normalization, Best Practice

Description: Learn the principles and process of designing a well-structured MySQL database schema, covering entity modeling, keys, relationships, and data types.

---

## Overview

Database schema design is the process of defining tables, columns, keys, and relationships before writing a single row of data. A well-designed schema prevents data anomalies, simplifies queries, and scales gracefully. A poorly designed one leads to duplicated data, inconsistent updates, and painful migrations later.

## Step 1 - Identify Entities

Start by listing the real-world things your application manages. For an e-commerce system:

```text
Customer, Order, Product, Category, OrderItem, Address
```

Each entity becomes a table. Each attribute of the entity becomes a column.

## Step 2 - Choose Primary Keys

Every table needs a primary key that uniquely identifies each row:

```sql
-- Surrogate key (recommended for most tables)
CREATE TABLE customers (
    id         INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    email      VARCHAR(255) NOT NULL,
    created_at DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Natural key (when a natural unique identifier exists)
CREATE TABLE countries (
    code CHAR(2) PRIMARY KEY,   -- ISO 3166-1 alpha-2
    name VARCHAR(100) NOT NULL
);
```

Surrogate keys (`AUTO_INCREMENT` integers or `UUID`s) are usually safer because natural keys can change.

## Step 3 - Define Relationships with Foreign Keys

```sql
CREATE TABLE orders (
    id          INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    customer_id INT UNSIGNED NOT NULL,
    total       DECIMAL(10,2) NOT NULL,
    created_at  DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_orders_customer
        FOREIGN KEY (customer_id) REFERENCES customers (id)
        ON DELETE RESTRICT ON UPDATE CASCADE
);

CREATE TABLE order_items (
    order_id   INT UNSIGNED NOT NULL,
    product_id INT UNSIGNED NOT NULL,
    qty        INT UNSIGNED NOT NULL DEFAULT 1,
    unit_price DECIMAL(10,2) NOT NULL,
    PRIMARY KEY (order_id, product_id),
    CONSTRAINT fk_items_order   FOREIGN KEY (order_id)   REFERENCES orders   (id) ON DELETE CASCADE,
    CONSTRAINT fk_items_product FOREIGN KEY (product_id) REFERENCES products (id) ON DELETE RESTRICT
);
```

## Step 4 - Choose Appropriate Data Types

| Data | Recommended Type | Notes |
|------|-----------------|-------|
| Monetary values | `DECIMAL(10,2)` | Never use FLOAT for money |
| Dates | `DATE` or `DATETIME` | Use `DATETIME` for timestamps |
| True/false | `TINYINT(1)` or `BOOLEAN` | MySQL maps BOOLEAN to TINYINT |
| Text up to 255 chars | `VARCHAR(n)` | Set n based on realistic max |
| Long text | `TEXT` | Avoid indexing full TEXT columns |
| JSON documents | `JSON` | Available since MySQL 5.7.8 |

## Step 5 - Add Indexes for Common Queries

```sql
-- InnoDB auto-creates indexes on foreign key columns, but explicit indexes let you control naming
CREATE INDEX idx_orders_customer ON orders (customer_id);

-- Composite index for common filters
CREATE INDEX idx_orders_customer_date ON orders (customer_id, created_at);

-- Unique constraint doubles as a unique index
ALTER TABLE customers ADD UNIQUE KEY uq_email (email);
```

## Step 6 - Apply Constraints

```sql
ALTER TABLE products
    ADD CONSTRAINT chk_price CHECK (price >= 0),
    ADD CONSTRAINT chk_stock CHECK (stock >= 0);
```

## Summary

Good schema design starts with clear entity identification, explicit primary and foreign keys, and appropriate data types for each column. Add indexes proactively on foreign keys and frequently filtered columns. Apply normalization (1NF, 2NF, 3NF) to eliminate redundancy, and use constraints to enforce business rules at the database level rather than relying solely on application code.
