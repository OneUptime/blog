# How to Implement PostgreSQL Custom Types

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: PostgreSQL, Database, SQL, Data Types

Description: Create custom data types in PostgreSQL including composite types, enums, domains, and range types for stronger data modeling and validation.

---

PostgreSQL ships with a rich set of built-in data types, but sometimes you need something more specific to your domain. Custom types let you define exactly what kind of data your columns can hold, enforce business rules at the database level, and make your schema self-documenting.

This guide covers the four main categories of custom types in PostgreSQL: composite types, enumerated types, domains, and range types. Each serves a different purpose, and knowing when to use which will make your database design cleaner and more robust.

## Why Use Custom Types?

Before diving into implementation, let's look at what custom types bring to the table.

| Benefit | Description |
|---------|-------------|
| Data Integrity | Constraints are enforced at the type level, not just the column level |
| Self-Documenting Schema | Type names convey meaning about the data they hold |
| Reusability | Define once, use across multiple tables and functions |
| Cleaner Code | Reduce repetitive constraint definitions |
| Type Safety | Prevent accidental mixing of semantically different data |

## Composite Types

Composite types let you group multiple fields into a single type. Think of them as structs or records that you can use as column types, function parameters, or return values.

### Creating a Basic Composite Type

The following example creates an address type that bundles street, city, state, and postal code into one unit.

```sql
CREATE TYPE address AS (
    street      VARCHAR(100),
    city        VARCHAR(50),
    state       VARCHAR(50),
    postal_code VARCHAR(20),
    country     VARCHAR(50)
);
```

### Using Composite Types in Tables

Once defined, you can use the composite type as a column type in any table.

```sql
-- Create a customers table that uses the address composite type
CREATE TABLE customers (
    id              SERIAL PRIMARY KEY,
    name            VARCHAR(100) NOT NULL,
    billing_address address,
    shipping_address address,
    created_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

### Inserting Data with Composite Types

There are two ways to insert composite type values: using row constructor syntax or explicit type casting.

```sql
-- Method 1: Row constructor syntax
INSERT INTO customers (name, billing_address, shipping_address)
VALUES (
    'John Smith',
    ROW('123 Main St', 'Springfield', 'Illinois', '62701', 'USA'),
    ROW('456 Oak Ave', 'Chicago', 'Illinois', '60601', 'USA')
);

-- Method 2: Explicit casting with parentheses
INSERT INTO customers (name, billing_address, shipping_address)
VALUES (
    'Jane Doe',
    ('789 Pine Rd', 'Austin', 'Texas', '78701', 'USA')::address,
    ('789 Pine Rd', 'Austin', 'Texas', '78701', 'USA')::address
);
```

### Accessing Composite Type Fields

Use dot notation inside parentheses to access individual fields of a composite type.

```sql
-- Select specific fields from the composite type
SELECT
    name,
    (billing_address).city AS billing_city,
    (billing_address).state AS billing_state,
    (shipping_address).city AS shipping_city
FROM customers;

-- Filter by a field within the composite type
SELECT name, billing_address
FROM customers
WHERE (billing_address).state = 'Illinois';
```

### Updating Composite Type Fields

You can update the entire composite value or individual fields within it.

```sql
-- Update the entire composite value
UPDATE customers
SET billing_address = ROW('999 New St', 'Denver', 'Colorado', '80201', 'USA')
WHERE id = 1;

-- Update a single field within the composite type
UPDATE customers
SET billing_address.city = 'Boulder'
WHERE id = 1;
```

### Nested Composite Types

Composite types can contain other composite types, enabling complex data structures.

```sql
-- Create a phone number type
CREATE TYPE phone_number AS (
    country_code VARCHAR(5),
    area_code    VARCHAR(10),
    number       VARCHAR(20),
    extension    VARCHAR(10)
);

-- Create a contact info type that includes address and phone
CREATE TYPE contact_info AS (
    primary_address   address,
    secondary_address address,
    primary_phone     phone_number,
    mobile_phone      phone_number,
    email             VARCHAR(255)
);

-- Use the nested type in a table
CREATE TABLE vendors (
    id           SERIAL PRIMARY KEY,
    company_name VARCHAR(100) NOT NULL,
    contact      contact_info,
    active       BOOLEAN DEFAULT true
);
```

## Enumerated Types (ENUM)

Enumerated types define a static, ordered set of values. They are perfect for columns that should only contain one of a predefined list of options.

### Creating an ENUM Type

The order in which you list the values matters, as it determines the sort order.

```sql
-- Create an enum for order status
CREATE TYPE order_status AS ENUM (
    'pending',
    'processing',
    'shipped',
    'delivered',
    'cancelled',
    'refunded'
);

-- Create an enum for priority levels
CREATE TYPE priority_level AS ENUM (
    'low',
    'medium',
    'high',
    'critical'
);
```

### Using ENUM Types in Tables

ENUM types work like any other column type, but only accept the predefined values.

```sql
CREATE TABLE orders (
    id           SERIAL PRIMARY KEY,
    customer_id  INTEGER NOT NULL,
    status       order_status NOT NULL DEFAULT 'pending',
    priority     priority_level DEFAULT 'medium',
    total_amount DECIMAL(10, 2),
    created_at   TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at   TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Insert data using enum values
INSERT INTO orders (customer_id, status, priority, total_amount)
VALUES
    (1, 'pending', 'high', 299.99),
    (2, 'processing', 'medium', 149.50),
    (3, 'shipped', 'low', 79.99);
```

### ENUM Ordering and Comparisons

ENUM values are ordered based on their position in the type definition, not alphabetically.

```sql
-- This works because 'shipped' comes after 'pending' in the enum definition
SELECT * FROM orders
WHERE status > 'pending';

-- Find all high-priority or critical orders
SELECT * FROM orders
WHERE priority >= 'high';

-- Order by status (follows enum definition order)
SELECT id, status, priority
FROM orders
ORDER BY status, priority DESC;
```

### Adding Values to an ENUM

You can add new values to an existing enum, but with some restrictions.

```sql
-- Add a new value at the end of the enum
ALTER TYPE order_status ADD VALUE 'on_hold';

-- Add a new value before an existing value
ALTER TYPE order_status ADD VALUE 'confirmed' BEFORE 'processing';

-- Add a new value after an existing value
ALTER TYPE order_status ADD VALUE 'out_for_delivery' AFTER 'shipped';
```

Note: You cannot remove values from an enum or reorder existing values without dropping and recreating the type.

### Listing ENUM Values

Query the system catalogs to see all values in an enum type.

```sql
-- List all values for a specific enum type
SELECT enumlabel AS value
FROM pg_enum
WHERE enumtypid = 'order_status'::regtype
ORDER BY enumsortorder;

-- Alternative using unnest
SELECT unnest(enum_range(NULL::order_status)) AS status_values;
```

## Domain Types

Domains are custom types based on existing types but with added constraints. They let you define validation rules that apply everywhere the domain is used.

### Creating a Basic Domain

The following example creates a domain for email addresses with a basic format check.

```sql
-- Create a domain for email addresses
CREATE DOMAIN email_address AS VARCHAR(255)
CHECK (
    VALUE ~ '^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$'
);

-- Create a domain for positive integers
CREATE DOMAIN positive_int AS INTEGER
CHECK (VALUE > 0);

-- Create a domain for percentage values (0-100)
CREATE DOMAIN percentage AS DECIMAL(5, 2)
CHECK (VALUE >= 0 AND VALUE <= 100);
```

### Domains with NOT NULL Constraints

Domains can include NOT NULL constraints, making the type non-nullable by default.

```sql
-- Create a non-nullable positive money amount
CREATE DOMAIN money_amount AS DECIMAL(12, 2)
NOT NULL
CHECK (VALUE >= 0);

-- Create a non-nullable, non-empty string
CREATE DOMAIN non_empty_string AS VARCHAR(255)
NOT NULL
CHECK (LENGTH(TRIM(VALUE)) > 0);
```

### Using Domains in Tables

Domains work just like regular types but enforce their constraints automatically.

```sql
CREATE TABLE users (
    id         SERIAL PRIMARY KEY,
    username   non_empty_string,
    email      email_address NOT NULL,
    age        positive_int,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- This insert succeeds
INSERT INTO users (username, email, age)
VALUES ('johndoe', 'john@example.com', 25);

-- This insert fails due to invalid email format
INSERT INTO users (username, email, age)
VALUES ('janedoe', 'invalid-email', 30);
-- ERROR: value for domain email_address violates check constraint

-- This insert fails due to negative age
INSERT INTO users (username, email, age)
VALUES ('bobsmith', 'bob@example.com', -5);
-- ERROR: value for domain positive_int violates check constraint
```

### Domains with Default Values

You can specify default values for domain types.

```sql
-- Create a domain with a default value
CREATE DOMAIN user_status AS VARCHAR(20)
DEFAULT 'active'
CHECK (VALUE IN ('active', 'inactive', 'suspended', 'deleted'));

-- Create a table using the domain
CREATE TABLE accounts (
    id     SERIAL PRIMARY KEY,
    name   VARCHAR(100) NOT NULL,
    status user_status  -- Will default to 'active'
);

-- Insert without specifying status
INSERT INTO accounts (name) VALUES ('Test Account');
-- status will be 'active'
```

### Altering Domains

You can modify domain constraints after creation.

```sql
-- Add a new constraint to an existing domain
ALTER DOMAIN percentage ADD CONSTRAINT max_discount CHECK (VALUE <= 50);

-- Drop a constraint from a domain
ALTER DOMAIN percentage DROP CONSTRAINT max_discount;

-- Rename a domain
ALTER DOMAIN positive_int RENAME TO positive_integer;

-- Change the default value
ALTER DOMAIN user_status SET DEFAULT 'inactive';

-- Remove the default value
ALTER DOMAIN user_status DROP DEFAULT;

-- Set or drop NOT NULL
ALTER DOMAIN money_amount DROP NOT NULL;
ALTER DOMAIN money_amount SET NOT NULL;
```

### Validating Existing Data Against New Constraints

When adding constraints, you can validate existing data or skip validation.

```sql
-- Add constraint and validate all existing data (default behavior)
ALTER DOMAIN percentage ADD CONSTRAINT reasonable_percentage
CHECK (VALUE <= 100);

-- Add constraint without validating existing data
ALTER DOMAIN percentage ADD CONSTRAINT reasonable_percentage
CHECK (VALUE <= 100) NOT VALID;

-- Later, validate the constraint against existing data
ALTER DOMAIN percentage VALIDATE CONSTRAINT reasonable_percentage;
```

## Range Types

Range types represent a range of values. PostgreSQL includes several built-in range types and lets you create custom ones.

### Built-in Range Types

PostgreSQL provides these range types out of the box.

| Type | Description | Example |
|------|-------------|---------|
| int4range | Range of integers | [1, 10) |
| int8range | Range of bigints | [1, 1000000) |
| numrange | Range of numerics | [1.5, 9.9) |
| tsrange | Range of timestamps (no timezone) | [2024-01-01, 2024-12-31) |
| tstzrange | Range of timestamps (with timezone) | [2024-01-01 00:00:00+00, 2024-12-31 23:59:59+00) |
| daterange | Range of dates | [2024-01-01, 2024-12-31) |

### Range Notation

Ranges use brackets to indicate inclusive or exclusive bounds.

```sql
-- [ = inclusive, ) = exclusive
-- [1, 10) means 1 <= x < 10

-- Examples of range notation
SELECT
    '[1, 10)'::int4range AS exclusive_upper,    -- includes 1, excludes 10
    '[1, 10]'::int4range AS inclusive_both,     -- includes 1 and 10
    '(1, 10)'::int4range AS exclusive_both,     -- excludes 1 and 10
    '(1, 10]'::int4range AS exclusive_lower;    -- excludes 1, includes 10
```

### Using Range Types in Tables

Range types are useful for scheduling, reservations, and time-based data.

```sql
CREATE TABLE room_reservations (
    id           SERIAL PRIMARY KEY,
    room_id      INTEGER NOT NULL,
    reserved_by  VARCHAR(100) NOT NULL,
    reserved_for tstzrange NOT NULL,
    created_at   TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Insert some reservations
INSERT INTO room_reservations (room_id, reserved_by, reserved_for)
VALUES
    (1, 'Alice', '[2024-03-15 09:00:00+00, 2024-03-15 11:00:00+00)'),
    (1, 'Bob', '[2024-03-15 14:00:00+00, 2024-03-15 16:00:00+00)'),
    (2, 'Charlie', '[2024-03-15 09:00:00+00, 2024-03-15 17:00:00+00)');
```

### Range Operators

PostgreSQL provides operators for working with ranges.

```sql
-- Contains operator: @>
SELECT * FROM room_reservations
WHERE reserved_for @> '2024-03-15 10:00:00+00'::timestamptz;

-- Overlap operator: &&
SELECT * FROM room_reservations
WHERE reserved_for && '[2024-03-15 10:00:00+00, 2024-03-15 12:00:00+00)';

-- Adjacent operator: -|-
SELECT
    '[1, 5)'::int4range -|- '[5, 10)'::int4range AS adjacent,      -- true
    '[1, 5)'::int4range -|- '[6, 10)'::int4range AS not_adjacent;  -- false

-- Strictly left of: <<
-- Strictly right of: >>
SELECT
    '[1, 5)'::int4range << '[10, 20)'::int4range AS left_of,
    '[10, 20)'::int4range >> '[1, 5)'::int4range AS right_of;
```

### Range Functions

PostgreSQL includes functions for extracting and manipulating range bounds.

```sql
SELECT
    lower('[2024-01-01, 2024-12-31)'::daterange) AS start_date,
    upper('[2024-01-01, 2024-12-31)'::daterange) AS end_date,
    lower_inc('[2024-01-01, 2024-12-31)'::daterange) AS start_inclusive,
    upper_inc('[2024-01-01, 2024-12-31)'::daterange) AS end_inclusive,
    isempty('empty'::int4range) AS is_empty,
    range_merge('[1, 5)'::int4range, '[8, 12)'::int4range) AS merged;
```

### Creating Custom Range Types

You can define range types for your own base types.

```sql
-- First, create a composite type for version numbers
CREATE TYPE version_number AS (
    major INTEGER,
    minor INTEGER,
    patch INTEGER
);

-- Create a function to compare version numbers
CREATE FUNCTION version_cmp(a version_number, b version_number)
RETURNS INTEGER AS $$
BEGIN
    IF a.major != b.major THEN
        RETURN a.major - b.major;
    ELSIF a.minor != b.minor THEN
        RETURN a.minor - b.minor;
    ELSE
        RETURN a.patch - b.patch;
    END IF;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Create comparison operators (simplified example)
-- In practice, you need to create all comparison operators

-- For a simpler example, create a range type for an existing type
CREATE TYPE float_range AS RANGE (
    subtype = float8,
    subtype_diff = float8mi
);

-- Use the custom range type
CREATE TABLE sensor_readings (
    id              SERIAL PRIMARY KEY,
    sensor_id       INTEGER NOT NULL,
    valid_range     float_range,
    reading         FLOAT8,
    recorded_at     TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

INSERT INTO sensor_readings (sensor_id, valid_range, reading)
VALUES (1, '[0.0, 100.0]', 45.5);
```

### Preventing Overlapping Ranges with Exclusion Constraints

Use exclusion constraints to prevent overlapping reservations.

```sql
-- Enable the btree_gist extension (required for exclusion constraints with multiple columns)
CREATE EXTENSION IF NOT EXISTS btree_gist;

-- Create a table with an exclusion constraint
CREATE TABLE meeting_rooms (
    id           SERIAL PRIMARY KEY,
    room_id      INTEGER NOT NULL,
    booked_by    VARCHAR(100) NOT NULL,
    booking_time tstzrange NOT NULL,
    EXCLUDE USING gist (room_id WITH =, booking_time WITH &&)
);

-- This insert succeeds
INSERT INTO meeting_rooms (room_id, booked_by, booking_time)
VALUES (1, 'Alice', '[2024-03-15 09:00:00+00, 2024-03-15 10:00:00+00)');

-- This insert fails because it overlaps with Alice's booking
INSERT INTO meeting_rooms (room_id, booked_by, booking_time)
VALUES (1, 'Bob', '[2024-03-15 09:30:00+00, 2024-03-15 10:30:00+00)');
-- ERROR: conflicting key value violates exclusion constraint

-- This insert succeeds because it's a different room
INSERT INTO meeting_rooms (room_id, booked_by, booking_time)
VALUES (2, 'Bob', '[2024-03-15 09:30:00+00, 2024-03-15 10:30:00+00)');
```

## Type Casting

PostgreSQL provides several ways to cast between types.

### Explicit Casting Syntax

There are three equivalent syntaxes for casting.

```sql
-- PostgreSQL-style cast
SELECT '123'::INTEGER;

-- SQL-standard cast
SELECT CAST('123' AS INTEGER);

-- Function-style cast
SELECT INTEGER('123');
```

### Creating Custom Cast Functions

You can define how to convert between your custom types and other types.

```sql
-- Create a function to convert address to a single-line string
CREATE FUNCTION address_to_text(addr address)
RETURNS TEXT AS $$
BEGIN
    RETURN CONCAT_WS(', ',
        addr.street,
        addr.city,
        addr.state,
        addr.postal_code,
        addr.country
    );
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Create a cast from address to text
CREATE CAST (address AS TEXT)
WITH FUNCTION address_to_text(address)
AS ASSIGNMENT;

-- Now you can cast addresses to text
SELECT billing_address::TEXT FROM customers;
```

### Implicit vs Explicit Casts

Casts can be defined as explicit-only, assignment, or implicit.

```sql
-- AS IMPLICIT: Cast happens automatically in any context
-- AS ASSIGNMENT: Cast happens automatically in assignment contexts
-- (no keyword): Cast must be explicit

-- Example: Create an implicit cast (use with caution)
CREATE CAST (email_address AS VARCHAR)
WITHOUT FUNCTION
AS IMPLICIT;
```

## Altering and Dropping Types

### Altering Types

Different type categories have different alteration capabilities.

```sql
-- Rename a composite type
ALTER TYPE address RENAME TO mailing_address;

-- Rename an attribute of a composite type
ALTER TYPE mailing_address RENAME ATTRIBUTE postal_code TO zip_code;

-- Add an attribute to a composite type
ALTER TYPE mailing_address ADD ATTRIBUTE apartment VARCHAR(20);

-- Drop an attribute from a composite type
ALTER TYPE mailing_address DROP ATTRIBUTE apartment;

-- Change the data type of an attribute
ALTER TYPE mailing_address ALTER ATTRIBUTE zip_code TYPE VARCHAR(15);

-- Change the owner of a type
ALTER TYPE mailing_address OWNER TO new_owner;

-- Move type to a different schema
ALTER TYPE mailing_address SET SCHEMA other_schema;
```

### Dropping Types

Use DROP TYPE to remove custom types.

```sql
-- Drop a type (fails if any objects depend on it)
DROP TYPE address;

-- Drop a type and all dependent objects (use with caution)
DROP TYPE address CASCADE;

-- Drop only if it exists (no error if type doesn't exist)
DROP TYPE IF EXISTS address;

-- Drop multiple types at once
DROP TYPE phone_number, contact_info;
```

### Handling Type Dependencies

Check what depends on a type before dropping it.

```sql
-- Find all columns using a specific type
SELECT
    c.table_schema,
    c.table_name,
    c.column_name,
    c.data_type,
    c.udt_name
FROM information_schema.columns c
WHERE c.udt_name = 'address';

-- Find all functions using a specific type
SELECT
    p.proname AS function_name,
    pg_get_function_arguments(p.oid) AS arguments,
    pg_get_function_result(p.oid) AS return_type
FROM pg_proc p
JOIN pg_type t ON t.oid = ANY(p.proargtypes) OR t.oid = p.prorettype
WHERE t.typname = 'address';
```

## Best Practices

### When to Use Each Type

| Type | Best Used For | Avoid When |
|------|--------------|------------|
| Composite | Grouping related fields, function parameters | Data needs to be queried frequently on individual fields |
| ENUM | Fixed set of values, status fields | Values change frequently, list is very long |
| Domain | Reusable constraints, semantic typing | Constraint is only used once |
| Range | Time periods, numeric intervals, scheduling | You don't need overlap detection |

### Performance Considerations

Some tips for working with custom types efficiently.

```sql
-- Index composite type fields if you query them frequently
CREATE INDEX idx_customers_billing_city
ON customers ((billing_address).city);

-- For ENUM types, consider using integers with a lookup table
-- if you need to frequently add/remove values

-- Use GiST indexes for range type queries
CREATE INDEX idx_reservations_time
ON room_reservations USING gist (reserved_for);
```

### Schema Organization

Keep your custom types organized and documented.

```sql
-- Create a dedicated schema for custom types
CREATE SCHEMA types;

-- Create types in the dedicated schema
CREATE TYPE types.address AS (
    street      VARCHAR(100),
    city        VARCHAR(50),
    state       VARCHAR(50),
    postal_code VARCHAR(20),
    country     VARCHAR(50)
);

-- Add comments to document your types
COMMENT ON TYPE types.address IS 'Standard mailing address format for customer records';

-- List all custom types in a schema
SELECT
    typname AS type_name,
    typtype AS type_category,
    obj_description(oid, 'pg_type') AS description
FROM pg_type
WHERE typnamespace = 'types'::regnamespace
  AND typtype IN ('c', 'e', 'd', 'r');
```

## Putting It All Together

Here's a complete example combining multiple custom types in a realistic schema.

```sql
-- Create custom types for an e-commerce system

-- Order status enum
CREATE TYPE ecommerce.order_status AS ENUM (
    'pending', 'confirmed', 'processing',
    'shipped', 'delivered', 'cancelled', 'refunded'
);

-- Payment status enum
CREATE TYPE ecommerce.payment_status AS ENUM (
    'pending', 'authorized', 'captured',
    'failed', 'refunded', 'disputed'
);

-- Address composite type
CREATE TYPE ecommerce.address AS (
    line1       VARCHAR(100),
    line2       VARCHAR(100),
    city        VARCHAR(50),
    state       VARCHAR(50),
    postal_code VARCHAR(20),
    country     CHAR(2)
);

-- Money domain with currency validation
CREATE DOMAIN ecommerce.money_usd AS DECIMAL(12, 2)
CHECK (VALUE >= 0);

-- SKU domain with format validation
CREATE DOMAIN ecommerce.sku AS VARCHAR(20)
CHECK (VALUE ~ '^[A-Z]{2,4}-[0-9]{4,8}$');

-- Discount percentage domain
CREATE DOMAIN ecommerce.discount_pct AS DECIMAL(5, 2)
CHECK (VALUE >= 0 AND VALUE <= 100);

-- Orders table using all custom types
CREATE TABLE ecommerce.orders (
    id               SERIAL PRIMARY KEY,
    customer_id      INTEGER NOT NULL,
    status           ecommerce.order_status NOT NULL DEFAULT 'pending',
    payment_status   ecommerce.payment_status NOT NULL DEFAULT 'pending',
    shipping_address ecommerce.address NOT NULL,
    billing_address  ecommerce.address NOT NULL,
    subtotal         ecommerce.money_usd NOT NULL,
    discount         ecommerce.discount_pct DEFAULT 0,
    shipping_cost    ecommerce.money_usd NOT NULL DEFAULT 0,
    tax              ecommerce.money_usd NOT NULL DEFAULT 0,
    total            ecommerce.money_usd NOT NULL,
    valid_period     tstzrange,
    created_at       TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at       TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Order items table
CREATE TABLE ecommerce.order_items (
    id         SERIAL PRIMARY KEY,
    order_id   INTEGER NOT NULL REFERENCES ecommerce.orders(id),
    sku        ecommerce.sku NOT NULL,
    quantity   INTEGER NOT NULL CHECK (quantity > 0),
    unit_price ecommerce.money_usd NOT NULL,
    discount   ecommerce.discount_pct DEFAULT 0
);

-- Example insert
INSERT INTO ecommerce.orders (
    customer_id,
    shipping_address,
    billing_address,
    subtotal,
    discount,
    shipping_cost,
    tax,
    total,
    valid_period
) VALUES (
    1,
    ROW('123 Main St', 'Apt 4B', 'New York', 'NY', '10001', 'US'),
    ROW('123 Main St', 'Apt 4B', 'New York', 'NY', '10001', 'US'),
    99.99,
    10.00,
    5.99,
    8.50,
    103.49,
    '[2024-03-15, 2024-04-15)'
);
```

## Conclusion

Custom types in PostgreSQL give you powerful tools for data modeling. Composite types bundle related fields together. ENUM types constrain columns to specific values. Domains add reusable constraints to existing types. Range types handle intervals and enable overlap detection.

Start with the simplest type that meets your needs. Use ENUMs for stable value lists, domains for reusable validation, composite types for structured data, and ranges for temporal or numeric intervals. Your schema will be cleaner, your constraints will be consistent, and your data will be more reliable.
