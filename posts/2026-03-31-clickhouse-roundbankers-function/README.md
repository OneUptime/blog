# How to Use roundBankers() Function in ClickHouse

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: ClickHouse, Math Function, Rounding, Finance

Description: Learn how roundBankers() applies banker's rounding in ClickHouse to reduce cumulative bias, with examples for financial calculations and accounting use cases.

---

`roundBankers()` implements banker's rounding (also called round-half-to-even or statistician's rounding). When a value falls exactly halfway between two representable values, it rounds to the nearest even number rather than always rounding up. In ClickHouse, `round()` behavior depends on the input type: for `Float*` inputs it already uses banker's rounding, but for `Decimal*` and integer inputs it rounds away from zero (always rounding 0.5 up in magnitude). `roundBankers()` guarantees round-half-to-even behavior regardless of the input type. This eliminates the systematic bias introduced by round-away-from-zero rounding when applied repeatedly over large datasets. In financial applications where `Decimal` types are typical and aggregated rounding errors matter, `roundBankers()` is the preferred choice over `round()`.

## Function Signature

```text
roundBankers(x [, N])
```

Rounds `x` to `N` decimal places using banker's rounding. `N` defaults to 0. Positive N rounds to decimal places; negative N rounds to tens, hundreds, etc.

## Key Difference from round()

The critical difference is behavior on exact halfway values with `Decimal` or integer inputs. When the digit being rounded is exactly 5 with nothing after it, `round()` rounds away from zero while `roundBankers()` rounds to the nearest even digit. (For `Float*` inputs, `round()` already uses banker's rounding, so the two functions behave identically.)

```sql
SELECT
    number,
    round(number, 0)        AS standard_round,
    roundBankers(number, 0) AS bankers_round
FROM (
    SELECT toDecimal64(arrayJoin([0.5, 1.5, 2.5, 3.5, 4.5, 5.5, 6.5, 7.5]), 1) AS number
);
```

With Decimal input, `round()` rounds away from zero: 1, 2, 3, 4, 5, 6, 7, 8. Banker's rounding produces: 0, 2, 2, 4, 4, 6, 6, 8 (rounds to even). Over many values, these differences cancel each other out.

## Demonstrating Bias Reduction

Show that standard rounding introduces cumulative upward bias while banker's rounding does not.

```sql
WITH values AS (
    SELECT toDecimal64(arrayJoin([0.5, 1.5, 2.5, 3.5, 4.5, 5.5, 6.5, 7.5, 8.5, 9.5]), 1) AS v
)
SELECT
    sum(v)                           AS true_sum,
    sum(round(v, 0))                 AS standard_rounded_sum,
    sum(roundBankers(v, 0))          AS bankers_rounded_sum,
    sum(round(v, 0)) - sum(v)        AS standard_bias,
    sum(roundBankers(v, 0)) - sum(v) AS bankers_bias
FROM values;
```

The standard rounded sum will be 5 higher than the true sum (systematic upward bias). The banker's rounded sum will match exactly because the rounding errors cancel.

## Setting Up Financial Transaction Data

Create a table of financial transactions with values that frequently hit the 0.5 boundary.

```sql
CREATE TABLE financial_line_items
(
    invoice_id  UInt64,
    item_name   String,
    unit_price  Decimal64(3),
    quantity    UInt32,
    tax_rate    Decimal64(2)
)
ENGINE = MergeTree
ORDER BY (invoice_id, item_name);

INSERT INTO financial_line_items VALUES
(1001, 'Widget A', 10.005, 100, 0.10),
(1001, 'Widget B',  5.005,  50, 0.10),
(1001, 'Widget C', 15.005,  20, 0.10),
(1002, 'Gadget X',  7.505,  40, 0.08),
(1002, 'Gadget Y', 12.505,  60, 0.08),
(1003, 'Service Z', 99.995,  1, 0.05);
```

## Rounding Line Item Totals

Apply `roundBankers()` to line item totals to minimize cumulative rounding error across an invoice.

```sql
SELECT
    invoice_id,
    item_name,
    unit_price,
    quantity,
    unit_price * quantity                                   AS exact_subtotal,
    round(unit_price * quantity, 2)                        AS standard_subtotal,
    roundBankers(unit_price * quantity, 2)                 AS bankers_subtotal
FROM financial_line_items
ORDER BY invoice_id, item_name;
```

## Invoice Total Comparison

Sum up totals using both rounding approaches to see the cumulative difference.

```sql
SELECT
    invoice_id,
    round(sum(unit_price * quantity), 2)         AS standard_total,
    roundBankers(sum(unit_price * quantity), 2)  AS bankers_total,
    sum(unit_price * quantity)                   AS exact_total
FROM financial_line_items
GROUP BY invoice_id
ORDER BY invoice_id;
```

## Applying Banker's Rounding with Negative Precision

Round to the nearest ten or hundred using negative N values with banker's rounding.

```sql
SELECT
    value,
    roundBankers(value, -1)  AS nearest_ten_bankers,
    round(value, -1)         AS nearest_ten_standard
FROM (
    SELECT arrayJoin([15, 25, 35, 45, 55, 65, 75, 85]) AS value
);
```

For values ending in exactly 5 (at the ten-rounding level), banker's rounding will round to the nearest even ten.

## Summary

`roundBankers()` applies round-half-to-even logic consistently across all data types, eliminating the systematic bias introduced by `round()` on `Decimal` and integer types when accumulated over many values. Use it in financial calculations, accounting aggregations, and any analytical domain where the sum of rounded values should closely approximate the sum of exact values. The difference from `round()` only manifests for exact halfway values on `Decimal` and integer inputs (for `Float*` inputs, `round()` already uses banker's rounding). For datasets with many half-cent or other exact midpoint values stored as `Decimal`, `roundBankers()` produces more accurate aggregate totals.
