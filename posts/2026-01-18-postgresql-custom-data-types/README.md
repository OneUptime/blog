# How to Create Custom Data Types in PostgreSQL

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: PostgreSQL, Custom Types, Data Modeling, Composite Types, Enums, Domains

Description: Learn how to create custom data types in PostgreSQL including enums, composite types, domains with constraints, and range types for better data modeling and validation.

---

PostgreSQL comes with many built-in types, but sometimes you need something specific to your domain. Custom types enforce data integrity at the database level, making your schema self-documenting and your queries type-safe.

## Enum Types

Enums define a fixed set of allowed values. They are ideal for status fields, categories, or any column with a small, known set of options.

```sql
-- Create an enum type
CREATE TYPE order_status AS ENUM (
    'pending',
    'processing',
    'shipped',
    'delivered',
    'cancelled'
);

-- Use it in a table
CREATE TABLE orders (
    id serial PRIMARY KEY,
    customer_id integer,
    status order_status NOT NULL DEFAULT 'pending',
    created_at timestamptz DEFAULT now()
);

-- Insert with enum value
INSERT INTO orders (customer_id, status)
VALUES (1, 'pending');

-- Invalid values fail
INSERT INTO orders (customer_id, status)
VALUES (2, 'invalid');
-- ERROR: invalid input value for enum order_status: "invalid"
```

### Querying Enum Values

```sql
-- List all values in an enum
SELECT unnest(enum_range(NULL::order_status));

-- Compare enum values (order is preserved)
SELECT * FROM orders
WHERE status >= 'shipped';  -- shipped, delivered

-- Get enum position
SELECT enumsortorder
FROM pg_enum
WHERE enumtypid = 'order_status'::regtype;
```

### Modifying Enums

```sql
-- Add a new value (PostgreSQL 9.1+)
ALTER TYPE order_status ADD VALUE 'returned';

-- Add value at specific position
ALTER TYPE order_status ADD VALUE 'confirmed' AFTER 'pending';

-- Rename a value (PostgreSQL 10+)
ALTER TYPE order_status RENAME VALUE 'cancelled' TO 'canceled';
```

Note: You cannot remove enum values directly. You need to create a new type and migrate data.

## Composite Types

Composite types group related fields into a single value. Think of them as lightweight structs.

```sql
-- Define a composite type
CREATE TYPE address AS (
    street varchar(100),
    city varchar(50),
    state varchar(2),
    zip varchar(10),
    country varchar(50)
);

-- Use in a table
CREATE TABLE customers (
    id serial PRIMARY KEY,
    name varchar(100),
    shipping_address address,
    billing_address address
);

-- Insert with composite value
INSERT INTO customers (name, shipping_address, billing_address)
VALUES (
    'John Doe',
    ROW('123 Main St', 'Austin', 'TX', '78701', 'USA'),
    ROW('456 Oak Ave', 'Austin', 'TX', '78702', 'USA')
);

-- Query composite fields
SELECT
    name,
    (shipping_address).city AS shipping_city,
    (billing_address).city AS billing_city
FROM customers;
```

### Working with Composite Fields

```sql
-- Update a single field within composite
UPDATE customers
SET shipping_address.zip = '78703'
WHERE id = 1;

-- Compare composite values
SELECT * FROM customers
WHERE shipping_address = billing_address;

-- Expand composite into columns
SELECT
    name,
    (shipping_address).*
FROM customers;
```

## Domain Types

Domains add constraints to existing types. They are perfect for reusable validation logic.

```sql
-- Email domain with validation
CREATE DOMAIN email AS varchar(255)
CHECK (VALUE ~ '^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$');

-- Positive integer domain
CREATE DOMAIN positive_int AS integer
CHECK (VALUE > 0);

-- Money amount (non-negative with 2 decimals)
CREATE DOMAIN money_amount AS numeric(12,2)
CHECK (VALUE >= 0);

-- US phone number
CREATE DOMAIN us_phone AS varchar(14)
CHECK (VALUE ~ '^\+1-[0-9]{3}-[0-9]{3}-[0-9]{4}$');
```

Using domains in tables:

```sql
CREATE TABLE users (
    id serial PRIMARY KEY,
    email email NOT NULL UNIQUE,
    age positive_int,
    account_balance money_amount DEFAULT 0
);

-- Valid insert
INSERT INTO users (email, age, account_balance)
VALUES ('john@example.com', 25, 100.50);

-- Invalid email fails
INSERT INTO users (email, age, account_balance)
VALUES ('not-an-email', 25, 0);
-- ERROR: value for domain email violates check constraint

-- Negative age fails
INSERT INTO users (email, age, account_balance)
VALUES ('jane@example.com', -5, 0);
-- ERROR: value for domain positive_int violates check constraint
```

### Domain with NOT NULL

```sql
-- Domain that cannot be null
CREATE DOMAIN non_empty_text AS text
NOT NULL
CHECK (length(trim(VALUE)) > 0);

CREATE TABLE products (
    id serial PRIMARY KEY,
    name non_empty_text,
    description text
);

-- Empty string fails
INSERT INTO products (name) VALUES ('');
-- ERROR: value for domain non_empty_text violates check constraint
```

## Range Types

PostgreSQL has built-in range types (int4range, tsrange, etc.) and lets you create custom ones.

```sql
-- Create a custom range type
CREATE TYPE float_range AS RANGE (
    subtype = float8
);

-- Use range types
CREATE TABLE reservations (
    id serial PRIMARY KEY,
    room_id integer,
    time_range tstzrange,
    EXCLUDE USING gist (room_id WITH =, time_range WITH &&)
);

-- Insert a reservation
INSERT INTO reservations (room_id, time_range)
VALUES (1, '[2026-01-25 09:00, 2026-01-25 10:00)');

-- Overlapping reservation fails due to exclusion constraint
INSERT INTO reservations (room_id, time_range)
VALUES (1, '[2026-01-25 09:30, 2026-01-25 10:30)');
-- ERROR: conflicting key value violates exclusion constraint
```

### Range Operators

```sql
-- Contains a value
SELECT * FROM reservations
WHERE time_range @> '2026-01-25 09:30'::timestamptz;

-- Overlaps with range
SELECT * FROM reservations
WHERE time_range && '[2026-01-25 08:00, 2026-01-25 09:30)';

-- Adjacent ranges
SELECT * FROM reservations
WHERE time_range -|- '[2026-01-25 10:00, 2026-01-25 11:00)';
```

## Array of Custom Types

Custom types work with arrays:

```sql
-- Array of enums
CREATE TABLE notifications (
    id serial PRIMARY KEY,
    user_id integer,
    channels order_status[]  -- Reusing our enum
);

-- Array of composite types
CREATE TABLE companies (
    id serial PRIMARY KEY,
    name varchar(100),
    offices address[]
);

INSERT INTO companies (name, offices)
VALUES (
    'Acme Corp',
    ARRAY[
        ROW('100 Tech Blvd', 'San Francisco', 'CA', '94105', 'USA'),
        ROW('200 Innovation Way', 'Austin', 'TX', '78701', 'USA')
    ]::address[]
);

-- Query array elements
SELECT
    name,
    offices[1].city AS headquarters
FROM companies;
```

## Type Casting and Conversion

```sql
-- Cast between compatible types
SELECT '123'::positive_int;

-- Create cast function
CREATE FUNCTION text_to_email(text) RETURNS email AS $$
    SELECT $1::email;
$$ LANGUAGE SQL IMMUTABLE;

CREATE CAST (text AS email)
WITH FUNCTION text_to_email(text)
AS ASSIGNMENT;

-- Now implicit casting works
INSERT INTO users (email, age) VALUES ('auto@cast.com', 30);
```

## Documenting Custom Types

```sql
-- Add comments for documentation
COMMENT ON TYPE order_status IS 'Valid states for order lifecycle';
COMMENT ON DOMAIN email IS 'RFC 5322 compliant email address';
COMMENT ON TYPE address IS 'US mailing address with street, city, state, zip, country';

-- View comments
SELECT
    t.typname,
    d.description
FROM pg_type t
LEFT JOIN pg_description d ON t.oid = d.objoid
WHERE t.typname IN ('order_status', 'email', 'address');
```

## Listing Custom Types

```sql
-- List all custom types
SELECT
    n.nspname AS schema,
    t.typname AS type_name,
    CASE t.typtype
        WHEN 'e' THEN 'enum'
        WHEN 'c' THEN 'composite'
        WHEN 'd' THEN 'domain'
        WHEN 'r' THEN 'range'
    END AS type_kind
FROM pg_type t
JOIN pg_namespace n ON t.typnamespace = n.oid
WHERE n.nspname = 'public'
  AND t.typtype IN ('e', 'c', 'd', 'r');
```

## Practical Example: Product Catalog

Combining multiple custom types for a product catalog:

```sql
-- Define types
CREATE TYPE product_status AS ENUM ('draft', 'active', 'discontinued');
CREATE TYPE dimensions AS (length_cm numeric, width_cm numeric, height_cm numeric);
CREATE DOMAIN sku AS varchar(20) CHECK (VALUE ~ '^[A-Z]{3}-[0-9]{6}$');
CREATE DOMAIN price AS numeric(10,2) CHECK (VALUE >= 0);

-- Use in table
CREATE TABLE products (
    id serial PRIMARY KEY,
    sku sku UNIQUE NOT NULL,
    name varchar(200) NOT NULL,
    status product_status DEFAULT 'draft',
    base_price price NOT NULL,
    sale_price price,
    dimensions dimensions,
    tags varchar(50)[],
    created_at timestamptz DEFAULT now(),
    CHECK (sale_price IS NULL OR sale_price <= base_price)
);

-- Insert with all types
INSERT INTO products (sku, name, status, base_price, sale_price, dimensions, tags)
VALUES (
    'ABC-123456',
    'Premium Widget',
    'active',
    99.99,
    79.99,
    ROW(10.5, 5.2, 3.0),
    ARRAY['featured', 'sale']
);
```

---

Custom types move validation from application code into the database. Enums prevent invalid status values, domains enforce business rules, and composite types keep related fields together. Use them to make your schema express your domain clearly, catching errors before they corrupt your data.
