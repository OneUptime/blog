# How to Use mapFromArrays() in ClickHouse

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: ClickHouse, Map Function, Array, Data Transformation

Description: Learn how mapFromArrays() builds a Map from two parallel arrays in ClickHouse, with examples for converting GROUP BY results and building lookup tables dynamically.

---

`mapFromArrays()` constructs a Map from two parallel arrays - one containing keys and one containing values. It is the inverse operation of using `mapKeys()` and `mapValues()` together. This function is particularly useful when you have aggregated data in array form (for example, from `groupArray()`) and want to convert it into a Map for structured access or storage. It bridges the gap between ClickHouse's powerful array processing capabilities and the structured access patterns that Maps provide.

## Function Signature

```text
mapFromArrays(keys_array, values_array)
```

Both arrays must have the same length. The first array provides the keys and the second provides the corresponding values. The resulting Map type is inferred from the element types of the two arrays.

## Basic Usage

Build a map from two explicit array literals.

```sql
SELECT mapFromArrays(['cpu', 'mem', 'disk'], [72.5, 88.1, 45.0]) AS metrics_map;
```

The result is `{'cpu': 72.5, 'mem': 88.1, 'disk': 45.0}`.

Verify that `mapFromArrays` is the inverse of `mapKeys` and `mapValues`.

```sql
SELECT
    m,
    mapFromArrays(mapKeys(m), mapValues(m)) AS reconstructed
FROM (
    SELECT map('a', 1, 'b', 2, 'c', 3) AS m
);
```

Both columns should contain identical maps.

## Setting Up Sample Data

Create a table of sales transactions that will be aggregated to build lookup maps.

```sql
CREATE TABLE daily_sales
(
    sale_date    Date,
    product_sku  String,
    revenue      Float64
)
ENGINE = MergeTree
ORDER BY (sale_date, product_sku);

INSERT INTO daily_sales VALUES
('2024-05-01', 'SKU-001', 1200.00),
('2024-05-01', 'SKU-002', 450.50),
('2024-05-01', 'SKU-003', 890.75),
('2024-05-02', 'SKU-001', 1350.00),
('2024-05-02', 'SKU-002', 510.00),
('2024-05-02', 'SKU-004', 230.25),
('2024-05-03', 'SKU-001', 980.00),
('2024-05-03', 'SKU-003', 760.00),
('2024-05-03', 'SKU-004', 415.50);
```

## Building a Per-Date Revenue Map

Use `groupArray()` to collect SKUs and revenues into arrays, then combine them into a Map per date using `mapFromArrays()`.

```sql
SELECT
    sale_date,
    mapFromArrays(
        groupArray(product_sku),
        groupArray(round(revenue, 2))
    ) AS revenue_by_sku
FROM daily_sales
GROUP BY sale_date
ORDER BY sale_date;
```

Each row now contains a Map(String, Float64) keyed by SKU for that day, making it easy to access revenue for a specific product.

## Creating a Lookup Table from Aggregated Data

Build an in-query lookup by aggregating data into a map first, then joining it back.

```sql
WITH sku_totals AS (
    SELECT product_sku, round(sum(revenue), 2) AS total_rev
    FROM daily_sales
    GROUP BY product_sku
),
sku_revenue_map AS (
    SELECT mapFromArrays(
        groupArray(product_sku),
        groupArray(total_rev)
    ) AS rev_map
    FROM sku_totals
)
SELECT
    d.product_sku,
    d.sale_date,
    d.revenue,
    m.rev_map[d.product_sku] AS total_revenue_for_sku
FROM daily_sales d, sku_revenue_map m
ORDER BY d.product_sku, d.sale_date;
```

## Converting Parallel Columns to a Map

When data arrives as separate key and value columns (a common pattern with pivoted or normalized data), `mapFromArrays()` combined with `groupArray()` reconstructs the map structure.

```sql
CREATE TABLE kv_store
(
    entity_id   UInt64,
    attr_key    String,
    attr_value  String
)
ENGINE = MergeTree
ORDER BY (entity_id, attr_key);

INSERT INTO kv_store VALUES
(1, 'name', 'Alice'), (1, 'role', 'admin'), (1, 'tier', 'gold'),
(2, 'name', 'Bob'),   (2, 'role', 'user'),  (2, 'tier', 'silver'),
(3, 'name', 'Carol'), (3, 'role', 'user');
```

Reconstruct one Map per entity from the normalized key-value rows.

```sql
SELECT
    entity_id,
    mapFromArrays(groupArray(attr_key), groupArray(attr_value)) AS attributes
FROM kv_store
GROUP BY entity_id
ORDER BY entity_id;
```

## Using mapFromArrays with arrayMap

Combine `arrayMap()` to transform keys or values before constructing the map.

```sql
SELECT
    sale_date,
    mapFromArrays(
        arrayMap(s -> concat('sku_', s), groupArray(product_sku)),
        groupArray(round(revenue, 2))
    ) AS prefixed_revenue_map
FROM daily_sales
GROUP BY sale_date
ORDER BY sale_date;
```

## Summary

`mapFromArrays()` is the standard way to construct Maps from two parallel arrays in ClickHouse. It pairs naturally with `groupArray()` for converting aggregated results into map form, with `arrayMap()` for transforming keys or values before map construction, and with `mapKeys()`/`mapValues()` for round-trip conversions. Use it any time you have data in parallel array form and need Map-style keyed access, structured storage, or map function compatibility.
