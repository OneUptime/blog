# How to Validate Data Types Before Inserting into ClickHouse

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: ClickHouse, Data Validation, Insert, Type Checking, Schema, Data Quality

Description: Validate data types before inserting into ClickHouse to prevent silent truncation, type coercion errors, and data corruption using input functions and constraints.

---

## Why Validation Matters

ClickHouse is permissive with type coercion. A string like "abc" inserted into a UInt32 column silently becomes 0. Dates outside the valid range get clamped to boundary values. These silent failures corrupt your data without raising errors during insert.

## Default ClickHouse Behavior

```sql
CREATE TABLE test (
    id   UInt32,
    val  Float64,
    ts   DateTime
) ENGINE = MergeTree() ORDER BY id;

-- "abc" for id becomes 0 silently
INSERT INTO test FORMAT JSONEachRow
{"id":"abc","val":1.5,"ts":"2026-01-01 00:00:00"}
```

ClickHouse inserts the row with `id = 0` instead of failing.

## Enabling Strict Type Checking

Use `input_format_null_as_default = 0` to fail on nulls instead of substituting defaults:

```sql
SET input_format_null_as_default = 0;
```

Use `input_format_parallel_parsing = 0` to get better error messages:

```sql
SET input_format_parallel_parsing = 0;
```

## Adding Table Constraints

Constraints are validated at insert time:

```sql
CREATE TABLE orders (
    order_id   UInt64,
    amount     Float64,
    status     LowCardinality(String),
    created_at DateTime,
    CONSTRAINT amount_positive CHECK amount > 0,
    CONSTRAINT status_valid CHECK status IN ('pending', 'paid', 'cancelled')
) ENGINE = MergeTree()
ORDER BY (created_at, order_id);
```

Inserting invalid data now fails:

```sql
-- This raises an error
INSERT INTO orders VALUES (1, -100.0, 'pending', now());
-- Constraint `amount_positive` for table `orders` is violated
```

## Using Input Functions for Pre-Validation

The `input()` table function lets you validate before inserting:

```sql
INSERT INTO orders
SELECT *
FROM input('order_id UInt64, amount Float64, status String, created_at DateTime')
WHERE amount > 0
  AND status IN ('pending', 'paid', 'cancelled')
FORMAT CSV;
```

Rows failing the WHERE clause are silently dropped. Log dropped counts separately.

## Validating in Application Code

Before sending to ClickHouse, validate in your application layer:

```python
def validate_event(row):
    assert isinstance(row["user_id"], int), "user_id must be int"
    assert row["amount"] >= 0, "amount must be non-negative"
    assert row["status"] in ("ok", "error"), "invalid status"
    return row
```

Send only validated rows to minimize coercion risk.

## Checking for Data Type Issues Post-Insert

```sql
SELECT
    count() AS total,
    countIf(order_id = 0) AS zero_ids,
    countIf(amount < 0) AS negative_amounts
FROM orders
WHERE created_at >= today();
```

Use monitoring queries to detect data quality regressions after deploy.

## Summary

Validate data types before inserting into ClickHouse by enabling strict null handling, adding table constraints for business rules, using input() functions to filter bad rows, and validating in application code before sending batches. Monitor for silent coercions with post-insert quality queries to catch issues before they compound.
