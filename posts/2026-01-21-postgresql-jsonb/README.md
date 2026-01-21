# How to Use PostgreSQL JSONB for Document Storage

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: PostgreSQL, JSONB, JSON, Document Storage, NoSQL, Schema Flexibility

Description: A comprehensive guide to using PostgreSQL JSONB for document storage, covering queries, indexing, operators, and best practices for combining relational and document models.

---

PostgreSQL's JSONB data type offers the flexibility of document databases within a powerful relational database. This guide covers everything you need to effectively use JSONB for flexible schema storage, complex queries, and hybrid data models.

## Prerequisites

- PostgreSQL 9.4+ (JSONB introduced)
- PostgreSQL 12+ recommended (improved JSONB features)
- Basic understanding of JSON format

## JSON vs JSONB

| Feature | JSON | JSONB |
|---------|------|-------|
| Storage | Text (as-is) | Binary (parsed) |
| Duplicate keys | Preserved | Last value kept |
| Key order | Preserved | Not preserved |
| Whitespace | Preserved | Not preserved |
| Indexing | Limited | Full GIN support |
| Processing | Slower | Faster |

Use JSONB for most cases. Use JSON only when preserving exact format matters.

## Creating Tables with JSONB

### Basic Table

```sql
CREATE TABLE products (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    attributes JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMP DEFAULT NOW()
);
```

### Insert JSONB Data

```sql
-- Insert with JSONB
INSERT INTO products (name, attributes) VALUES
('Laptop', '{
    "brand": "Dell",
    "specs": {
        "cpu": "Intel i7",
        "ram": 16,
        "storage": "512GB SSD"
    },
    "tags": ["electronics", "computers", "portable"],
    "price": 999.99
}'),
('Phone', '{
    "brand": "Apple",
    "specs": {
        "model": "iPhone 15",
        "storage": "256GB"
    },
    "tags": ["electronics", "mobile"],
    "price": 799.99
}');
```

## Querying JSONB

### Access Operators

| Operator | Returns | Example |
|----------|---------|---------|
| `->` | JSONB | `data->'key'` |
| `->>` | TEXT | `data->>'key'` |
| `#>` | JSONB (path) | `data#>'{a,b}'` |
| `#>>` | TEXT (path) | `data#>>'{a,b}'` |

### Basic Queries

```sql
-- Get JSON value (returns JSONB)
SELECT attributes->'brand' FROM products;

-- Get text value
SELECT attributes->>'brand' FROM products;

-- Nested access
SELECT attributes->'specs'->>'cpu' FROM products;

-- Path access
SELECT attributes#>>'{specs,cpu}' FROM products;

-- In WHERE clause
SELECT * FROM products
WHERE attributes->>'brand' = 'Dell';

-- Numeric comparison (cast required)
SELECT * FROM products
WHERE (attributes->>'price')::numeric > 500;
```

### Containment Operators

```sql
-- Contains (@>)
SELECT * FROM products
WHERE attributes @> '{"brand": "Dell"}';

-- Contains nested
SELECT * FROM products
WHERE attributes @> '{"specs": {"ram": 16}}';

-- Is contained by (<@)
SELECT * FROM products
WHERE '{"brand": "Dell", "price": 999.99}' <@ attributes;
```

### Existence Operators

```sql
-- Key exists (?)
SELECT * FROM products
WHERE attributes ? 'brand';

-- Any key exists (?|)
SELECT * FROM products
WHERE attributes ?| array['warranty', 'discount'];

-- All keys exist (?&)
SELECT * FROM products
WHERE attributes ?& array['brand', 'price'];
```

### Array Operations

```sql
-- Check array contains value
SELECT * FROM products
WHERE attributes->'tags' ? 'electronics';

-- Check array contains multiple values
SELECT * FROM products
WHERE attributes->'tags' ?& array['electronics', 'portable'];

-- Get array length
SELECT
    name,
    jsonb_array_length(attributes->'tags') AS tag_count
FROM products;

-- Unnest array
SELECT
    name,
    jsonb_array_elements_text(attributes->'tags') AS tag
FROM products;
```

## JSONB Functions

### Extraction Functions

```sql
-- Extract keys
SELECT jsonb_object_keys(attributes) FROM products;

-- Extract key-value pairs
SELECT * FROM jsonb_each(
    '{"brand": "Dell", "price": 999}'::jsonb
);

-- Extract with types
SELECT * FROM jsonb_each_text(
    '{"brand": "Dell", "price": 999}'::jsonb
);
```

### Modification Functions

```sql
-- Set/update value
UPDATE products
SET attributes = jsonb_set(
    attributes,
    '{specs,ram}',
    '32'::jsonb
)
WHERE name = 'Laptop';

-- Set nested path (create if missing)
UPDATE products
SET attributes = jsonb_set(
    attributes,
    '{warranty,years}',
    '2'::jsonb,
    true  -- create_missing
)
WHERE name = 'Laptop';

-- Remove key
UPDATE products
SET attributes = attributes - 'temporary_field';

-- Remove nested key
UPDATE products
SET attributes = attributes #- '{specs,old_field}';

-- Remove from array by index
UPDATE products
SET attributes = attributes #- '{tags,0}';
```

### Concatenation

```sql
-- Merge JSONB objects (|| operator)
UPDATE products
SET attributes = attributes || '{"discount": 10}'::jsonb;

-- Merge with override
SELECT '{"a": 1, "b": 2}'::jsonb || '{"b": 3, "c": 4}'::jsonb;
-- Result: {"a": 1, "b": 3, "c": 4}
```

### Aggregation

```sql
-- Build object from rows
SELECT jsonb_object_agg(name, attributes->'price')
FROM products;

-- Build array from rows
SELECT jsonb_agg(attributes->'brand')
FROM products;
```

## Indexing JSONB

### GIN Index (General)

```sql
-- Index all paths (supports @>, ?, ?|, ?&)
CREATE INDEX idx_products_attributes ON products USING GIN (attributes);

-- Query uses index
SELECT * FROM products WHERE attributes @> '{"brand": "Dell"}';
```

### GIN with jsonb_path_ops (Optimized)

```sql
-- Smaller index, only supports @>
CREATE INDEX idx_products_attributes_path
ON products USING GIN (attributes jsonb_path_ops);

-- Faster for containment queries
SELECT * FROM products WHERE attributes @> '{"brand": "Dell"}';
```

### B-tree on Specific Path

```sql
-- Index specific key for equality/range
CREATE INDEX idx_products_brand ON products ((attributes->>'brand'));
CREATE INDEX idx_products_price ON products (((attributes->>'price')::numeric));

-- Query uses index
SELECT * FROM products WHERE attributes->>'brand' = 'Dell';
SELECT * FROM products WHERE (attributes->>'price')::numeric > 500;
```

### Expression Index for Arrays

```sql
-- Index for array containment
CREATE INDEX idx_products_tags ON products USING GIN ((attributes->'tags'));

-- Query uses index
SELECT * FROM products WHERE attributes->'tags' ? 'electronics';
```

## JSONPath Queries (PostgreSQL 12+)

### Basic JSONPath

```sql
-- JSONPath query
SELECT jsonb_path_query(attributes, '$.specs.cpu')
FROM products;

-- Check if path matches
SELECT * FROM products
WHERE jsonb_path_exists(attributes, '$.specs.ram ? (@ > 8)');

-- Get first match
SELECT jsonb_path_query_first(attributes, '$.tags[*]')
FROM products;
```

### JSONPath Predicates

```sql
-- Filter by condition
SELECT * FROM products
WHERE jsonb_path_exists(
    attributes,
    '$.price ? (@ > 500 && @ < 1000)'
);

-- Array filtering
SELECT jsonb_path_query_array(
    attributes,
    '$.tags[*] ? (@ like_regex "^elec")'
)
FROM products;
```

## Practical Examples

### User Preferences

```sql
CREATE TABLE users (
    id SERIAL PRIMARY KEY,
    email VARCHAR(255) UNIQUE,
    preferences JSONB DEFAULT '{
        "theme": "light",
        "notifications": {
            "email": true,
            "push": false
        },
        "language": "en"
    }'::jsonb
);

-- Update single preference
UPDATE users
SET preferences = jsonb_set(preferences, '{theme}', '"dark"')
WHERE id = 1;

-- Toggle notification
UPDATE users
SET preferences = jsonb_set(
    preferences,
    '{notifications,push}',
    to_jsonb(NOT (preferences#>>'{notifications,push}')::boolean)
)
WHERE id = 1;
```

### Event Tracking

```sql
CREATE TABLE events (
    id BIGSERIAL PRIMARY KEY,
    event_type VARCHAR(50),
    payload JSONB,
    created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_events_payload ON events USING GIN (payload);
CREATE INDEX idx_events_type_time ON events (event_type, created_at);

-- Insert event
INSERT INTO events (event_type, payload) VALUES
('page_view', '{
    "url": "/products/123",
    "user_id": 456,
    "referrer": "google.com",
    "device": {"type": "mobile", "os": "iOS"}
}');

-- Query events
SELECT * FROM events
WHERE event_type = 'page_view'
  AND payload @> '{"device": {"type": "mobile"}}';
```

### Dynamic Product Attributes

```sql
CREATE TABLE products_v2 (
    id SERIAL PRIMARY KEY,
    sku VARCHAR(50) UNIQUE,
    name VARCHAR(255),
    category VARCHAR(100),
    base_price DECIMAL(10,2),
    attributes JSONB DEFAULT '{}'::jsonb
);

-- Different products have different attributes
INSERT INTO products_v2 (sku, name, category, base_price, attributes) VALUES
('LAPTOP-001', 'Dell XPS 15', 'Laptops', 1299.99, '{
    "screen_size": 15.6,
    "resolution": "4K",
    "cpu": "Intel i9",
    "ram_gb": 32,
    "storage_gb": 1000,
    "gpu": "NVIDIA RTX 3050"
}'),
('SHIRT-001', 'Cotton T-Shirt', 'Apparel', 29.99, '{
    "size": "M",
    "color": "Blue",
    "material": "100% Cotton",
    "care": ["Machine wash", "Tumble dry low"]
}');

-- Search by dynamic attributes
SELECT * FROM products_v2
WHERE category = 'Laptops'
  AND (attributes->>'ram_gb')::int >= 16;
```

## Performance Best Practices

### Do

```sql
-- Use containment with index
SELECT * FROM products WHERE attributes @> '{"brand": "Dell"}';

-- Use specific path indexes for frequent queries
CREATE INDEX idx_brand ON products ((attributes->>'brand'));

-- Use jsonb_path_ops for containment-only queries
CREATE INDEX idx_attrs ON products USING GIN (attributes jsonb_path_ops);
```

### Avoid

```sql
-- Don't use functions in WHERE without index
-- Slow: full table scan
SELECT * FROM products
WHERE jsonb_extract_path_text(attributes, 'brand') = 'Dell';

-- Don't store huge documents
-- Consider separate tables for large nested data

-- Don't over-index
-- Each GIN index adds write overhead
```

### Hybrid Approach

```sql
-- Best of both worlds: relational + JSONB
CREATE TABLE orders (
    id SERIAL PRIMARY KEY,
    customer_id INT REFERENCES customers(id),
    status VARCHAR(20) NOT NULL,           -- Frequently queried
    total DECIMAL(10,2) NOT NULL,          -- Frequently queried
    shipping_address JSONB,                -- Flexible structure
    metadata JSONB DEFAULT '{}'::jsonb,    -- Extra data
    created_at TIMESTAMP DEFAULT NOW()
);

-- Index relational columns normally
CREATE INDEX idx_orders_customer ON orders(customer_id);
CREATE INDEX idx_orders_status ON orders(status);

-- Index specific JSONB paths as needed
CREATE INDEX idx_orders_shipping_country
ON orders ((shipping_address->>'country'));
```

## Conclusion

PostgreSQL JSONB provides powerful document storage capabilities:

1. **Use JSONB** over JSON for better performance and indexing
2. **Index strategically** - GIN for flexibility, B-tree for specific paths
3. **Combine with relational** - Use structured columns for frequent queries
4. **Leverage JSONPath** for complex queries (PostgreSQL 12+)
5. **Monitor query plans** to ensure indexes are used

JSONB gives you schema flexibility while retaining the ACID guarantees and query power of PostgreSQL.
