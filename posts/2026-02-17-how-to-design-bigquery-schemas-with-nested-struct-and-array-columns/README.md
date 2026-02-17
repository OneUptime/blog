# How to Design BigQuery Schemas with Nested STRUCT and ARRAY Columns

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: GCP, BigQuery, Schema Design, STRUCT, ARRAY

Description: Learn how to design BigQuery table schemas using nested STRUCT and ARRAY columns for denormalized data models that improve query performance and reduce costs.

---

One of BigQuery's strengths is its native support for nested and repeated fields through STRUCT and ARRAY types. Instead of normalizing your data across multiple tables with JOINs, you can embed related data directly within a single table. This denormalized approach aligns with how BigQuery's columnar storage works and often results in faster queries and lower costs.

I have designed schemas for everything from e-commerce event tracking to IoT sensor data, and nested schemas consistently outperform normalized alternatives in BigQuery. Let me walk through the design principles and practical examples.

## Why Use Nested Schemas?

In traditional databases, normalization reduces data redundancy. You create separate tables for orders, order items, and customers, then JOIN them at query time. In BigQuery, this approach has drawbacks:

- JOINs on large tables are expensive (bytes scanned = cost)
- Shuffling data across slots for JOINs adds latency
- Multiple table scans multiply your costs

Nested schemas avoid JOINs by embedding related data within the parent record. BigQuery's columnar storage means it only reads the nested columns you actually reference, so storage overhead is minimal.

## STRUCT: Embedded Records

A STRUCT is a group of named fields. Think of it as a row embedded within a row.

```sql
-- Table with STRUCT columns for related data
CREATE TABLE `my_project.my_dataset.customers` (
  customer_id INT64 NOT NULL,
  -- Embed address as a STRUCT instead of a separate table
  address STRUCT<
    street STRING,
    city STRING,
    state STRING,
    zip_code STRING,
    country STRING
  >,
  -- Embed contact info as a STRUCT
  contact STRUCT<
    email STRING,
    phone STRING,
    preferred_channel STRING
  >,
  created_at TIMESTAMP,
  updated_at TIMESTAMP
);
```

Insert data with STRUCT values.

```sql
-- Insert data with nested STRUCTs
INSERT INTO `my_project.my_dataset.customers`
VALUES (
  1001,
  STRUCT('123 Main St', 'Portland', 'OR', '97201', 'US'),
  STRUCT('alice@example.com', '+1-555-0123', 'email'),
  CURRENT_TIMESTAMP(),
  CURRENT_TIMESTAMP()
);
```

Query STRUCT fields using dot notation.

```sql
-- Access STRUCT fields with dot notation
SELECT
  customer_id,
  address.city,
  address.state,
  contact.email
FROM `my_project.my_dataset.customers`
WHERE address.country = 'US'
  AND address.state = 'OR';
```

## ARRAY: Repeated Fields

An ARRAY holds multiple values of the same type. Use it for one-to-many relationships.

```sql
-- Table with ARRAY columns
CREATE TABLE `my_project.my_dataset.products` (
  product_id STRING NOT NULL,
  name STRING,
  price NUMERIC,
  -- Simple array of strings
  tags ARRAY<STRING>,
  -- Array of integers
  compatible_sizes ARRAY<INT64>
);
```

```sql
-- Insert data with arrays
INSERT INTO `my_project.my_dataset.products`
VALUES (
  'PROD-001',
  'Running Shoes',
  129.99,
  ['footwear', 'running', 'athletic', 'outdoor'],
  [7, 8, 9, 10, 11, 12]
);
```

## ARRAY of STRUCT: Nested Repeated Fields

The most powerful combination is an ARRAY of STRUCTs - a list of embedded records. This replaces child tables in a normalized schema.

```sql
-- Order table with nested line items
-- No need for a separate order_items table
CREATE TABLE `my_project.my_dataset.orders` (
  order_id STRING NOT NULL,
  customer_id INT64,
  order_date DATE,
  status STRING,
  -- Nested array of line items
  items ARRAY<STRUCT<
    product_id STRING,
    product_name STRING,
    quantity INT64,
    unit_price NUMERIC,
    discount_pct FLOAT64
  >>,
  -- Nested shipping information
  shipping STRUCT<
    method STRING,
    carrier STRING,
    tracking_number STRING,
    estimated_delivery DATE,
    address STRUCT<
      street STRING,
      city STRING,
      state STRING,
      zip_code STRING,
      country STRING
    >
  >,
  -- Payment information
  payment STRUCT<
    method STRING,
    card_last_four STRING,
    amount NUMERIC,
    currency STRING
  >
)
PARTITION BY order_date
CLUSTER BY customer_id;
```

## When to Use STRUCT vs ARRAY

Use this decision framework:

**STRUCT (single)**: One-to-one relationships. Each order has one shipping address, one payment method.

**ARRAY of scalar**: One-to-many simple values. A product has multiple tags, a user has multiple roles.

**ARRAY of STRUCT**: One-to-many complex records. An order has multiple line items, a user has multiple addresses.

## Designing a Real-World Schema

Here is a complete schema for an e-commerce analytics table.

```sql
-- Comprehensive e-commerce event schema with nested fields
CREATE TABLE `my_project.my_dataset.ecommerce_events` (
  -- Event metadata
  event_id STRING NOT NULL,
  event_type STRING NOT NULL,
  event_timestamp TIMESTAMP NOT NULL,
  event_date DATE NOT NULL,

  -- User information (STRUCT - one user per event)
  user STRUCT<
    user_id INT64,
    anonymous_id STRING,
    email STRING,
    segment STRING,
    lifetime_value NUMERIC
  >,

  -- Session context (STRUCT)
  session STRUCT<
    session_id STRING,
    is_new_session BOOL,
    landing_page STRING,
    referrer STRING,
    utm_source STRING,
    utm_medium STRING,
    utm_campaign STRING
  >,

  -- Device information (STRUCT)
  device STRUCT<
    category STRING,
    browser STRING,
    os STRING,
    screen_resolution STRING,
    language STRING
  >,

  -- Geographic context (STRUCT)
  geo STRUCT<
    country STRING,
    region STRING,
    city STRING,
    latitude FLOAT64,
    longitude FLOAT64
  >,

  -- Products involved in this event (ARRAY of STRUCT)
  products ARRAY<STRUCT<
    product_id STRING,
    name STRING,
    category STRING,
    brand STRING,
    price NUMERIC,
    quantity INT64,
    variant STRING
  >>,

  -- Promotion codes applied (ARRAY of simple strings)
  promo_codes ARRAY<STRING>,

  -- Transaction details for purchase events (STRUCT)
  transaction STRUCT<
    transaction_id STRING,
    revenue NUMERIC,
    tax NUMERIC,
    shipping NUMERIC,
    currency STRING
  >
)
PARTITION BY event_date
CLUSTER BY event_type, user.user_id;
```

## Querying Nested Schemas Efficiently

BigQuery only reads the columns you reference. With nested schemas, you can access just the fields you need.

```sql
-- Only reads the event_type, user.user_id, and transaction.revenue columns
-- The rest of the nested data is not scanned
SELECT
  event_type,
  user.user_id,
  transaction.revenue
FROM `my_project.my_dataset.ecommerce_events`
WHERE event_date = '2026-02-17'
  AND event_type = 'purchase'
  AND transaction.revenue > 100;
```

To work with the repeated fields, use UNNEST.

```sql
-- Analyze product-level metrics from the nested schema
SELECT
  p.category AS product_category,
  p.brand,
  COUNT(*) AS times_viewed,
  COUNT(DISTINCT e.user.user_id) AS unique_viewers,
  AVG(p.price) AS avg_price
FROM `my_project.my_dataset.ecommerce_events` e,
UNNEST(e.products) AS p
WHERE e.event_date BETWEEN '2026-02-01' AND '2026-02-17'
  AND e.event_type = 'product_view'
GROUP BY p.category, p.brand
ORDER BY times_viewed DESC;
```

## Schema Design Patterns

**Pattern 1: Event with context**

Embed all contextual data (user, device, session) as STRUCTs. This avoids JOINs with dimension tables.

```sql
-- Event with embedded context - no JOINs needed
SELECT
  event_type,
  device.browser,
  geo.country,
  COUNT(*) AS event_count
FROM `my_project.my_dataset.ecommerce_events`
WHERE event_date = '2026-02-17'
GROUP BY event_type, device.browser, geo.country;
```

**Pattern 2: Parent with child records**

Embed child records as ARRAY of STRUCT. Orders with items, invoices with line items.

```sql
-- Calculate order totals without JOINs
SELECT
  order_id,
  order_date,
  (SELECT SUM(item.quantity * item.unit_price * (1 - item.discount_pct / 100))
   FROM UNNEST(items) AS item) AS order_total,
  ARRAY_LENGTH(items) AS item_count
FROM `my_project.my_dataset.orders`
WHERE order_date = '2026-02-17';
```

**Pattern 3: Time series with metadata**

Keep the time series flat but embed metadata as STRUCTs.

```sql
-- Sensor readings with embedded device metadata
CREATE TABLE `my_project.my_dataset.sensor_readings` (
  reading_id STRING,
  reading_timestamp TIMESTAMP,
  reading_date DATE,
  value FLOAT64,
  unit STRING,
  -- Embedded device metadata
  device STRUCT<
    device_id STRING,
    device_type STRING,
    firmware_version STRING,
    location STRUCT<
      building STRING,
      floor INT64,
      room STRING
    >
  >
)
PARTITION BY reading_date
CLUSTER BY device.device_id;
```

## Limitations and Considerations

**Maximum nesting depth**: BigQuery supports up to 15 levels of nesting. In practice, you rarely need more than 3-4 levels.

**Maximum ARRAY size**: There is no hard limit on array length, but very large arrays (thousands of elements) can impact query performance.

**Cannot cluster on nested fields directly**: You can cluster on `user.user_id` (a STRUCT field) but not on fields inside ARRAYs.

**Schema changes**: Adding fields to a STRUCT is easy. Changing the type of a STRUCT field requires table recreation.

```sql
-- Add a new field to an existing STRUCT
ALTER TABLE `my_project.my_dataset.customers`
ADD COLUMN address.latitude FLOAT64;

ALTER TABLE `my_project.my_dataset.customers`
ADD COLUMN address.longitude FLOAT64;
```

## Denormalization Strategy

When migrating from a normalized schema, follow these steps:

1. Identify the main entity table (orders, events, users)
2. Identify related tables that are always accessed together
3. Embed one-to-one related data as STRUCTs
4. Embed one-to-many related data as ARRAY of STRUCT
5. Keep truly independent entities as separate tables

```sql
-- Migrate from normalized to nested schema
CREATE TABLE `my_project.my_dataset.orders_denormalized`
PARTITION BY order_date
AS
SELECT
  o.order_id,
  o.order_date,
  o.status,
  -- Embed customer data as STRUCT
  STRUCT(
    c.customer_name,
    c.email,
    c.segment
  ) AS customer,
  -- Embed line items as ARRAY of STRUCT
  ARRAY_AGG(
    STRUCT(
      i.product_id,
      i.product_name,
      i.quantity,
      i.unit_price
    )
  ) AS items
FROM `my_project.my_dataset.orders_normalized` o
JOIN `my_project.my_dataset.customers_normalized` c ON o.customer_id = c.customer_id
JOIN `my_project.my_dataset.order_items_normalized` i ON o.order_id = i.order_id
GROUP BY o.order_id, o.order_date, o.status, c.customer_name, c.email, c.segment;
```

## Wrapping Up

Nested schemas with STRUCT and ARRAY columns are a fundamental BigQuery design pattern. They replace JOINs with embedded data, which is faster and cheaper in BigQuery's columnar storage engine. Design your schemas around your access patterns - embed data that is always queried together, and keep truly independent entities separate. The result is simpler queries, lower costs, and better performance.

For monitoring your BigQuery data models and query patterns, [OneUptime](https://oneuptime.com) provides tools to track performance and cost across your data warehouse.
