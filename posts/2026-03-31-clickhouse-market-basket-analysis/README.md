# How to Build Market Basket Analysis in ClickHouse

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: ClickHouse, Market Basket, Association Rule, Analytics, Recommendation

Description: Learn how to build market basket analysis in ClickHouse by computing support, confidence, and lift for product association rules using SQL.

---

Market basket analysis discovers which products are frequently purchased together, enabling cross-sell recommendations and store layout optimization. ClickHouse's columnar engine handles the large join-heavy queries efficiently.

## Setting Up the Data

```sql
CREATE TABLE order_items (
    order_id UInt64,
    product_id UInt32,
    product_name String
) ENGINE = MergeTree() ORDER BY (order_id, product_id);
```

## Computing Item Support

Support is the fraction of orders containing a given item:

```sql
WITH total_orders AS (SELECT uniq(order_id) AS n FROM order_items)
SELECT
    product_id,
    product_name,
    uniq(order_id) AS item_count,
    round(uniq(order_id) / (SELECT n FROM total_orders), 4) AS support
FROM order_items
GROUP BY product_id, product_name
ORDER BY support DESC
LIMIT 20;
```

## Finding Co-Occurring Pairs

Self-join to find all item pairs in the same order:

```sql
SELECT
    a.product_id AS item_a,
    b.product_id AS item_b,
    uniq(a.order_id) AS pair_count
FROM order_items a
JOIN order_items b ON a.order_id = b.order_id AND a.product_id < b.product_id
GROUP BY item_a, item_b
HAVING pair_count >= 50
ORDER BY pair_count DESC
LIMIT 100;
```

## Computing Confidence and Lift

```sql
WITH
    total AS (SELECT uniq(order_id) AS n FROM order_items),
    item_support AS (
        SELECT product_id, uniq(order_id) AS cnt
        FROM order_items GROUP BY product_id
    ),
    pairs AS (
        SELECT
            a.product_id AS item_a,
            b.product_id AS item_b,
            uniq(a.order_id) AS pair_cnt
        FROM order_items a
        JOIN order_items b ON a.order_id = b.order_id AND a.product_id < b.product_id
        GROUP BY item_a, item_b
        HAVING pair_cnt >= 50
    )
SELECT
    p.item_a,
    p.item_b,
    p.pair_cnt,
    round(p.pair_cnt / sa.cnt, 4) AS confidence_a_to_b,
    round(p.pair_cnt / sb.cnt, 4) AS confidence_b_to_a,
    round((p.pair_cnt / (SELECT n FROM total)) / ((sa.cnt / (SELECT n FROM total)) * (sb.cnt / (SELECT n FROM total))), 4) AS lift
FROM pairs p
JOIN item_support sa ON p.item_a = sa.product_id
JOIN item_support sb ON p.item_b = sb.product_id
ORDER BY lift DESC;
```

## Filtering High-Lift Pairs

Rules with lift greater than 1 indicate positive association. Save the previous query's results as a view to make filtering easier:

```sql
CREATE VIEW basket_rules AS
WITH
    total AS (SELECT uniq(order_id) AS n FROM order_items),
    item_support AS (
        SELECT product_id, uniq(order_id) AS cnt
        FROM order_items GROUP BY product_id
    ),
    pairs AS (
        SELECT
            a.product_id AS item_a,
            b.product_id AS item_b,
            uniq(a.order_id) AS pair_cnt
        FROM order_items a
        JOIN order_items b ON a.order_id = b.order_id AND a.product_id < b.product_id
        GROUP BY item_a, item_b
        HAVING pair_cnt >= 50
    )
SELECT
    p.item_a,
    p.item_b,
    p.pair_cnt,
    round(p.pair_cnt / sa.cnt, 4) AS confidence_a_to_b,
    round(p.pair_cnt / sb.cnt, 4) AS confidence_b_to_a,
    round((p.pair_cnt / (SELECT n FROM total)) / ((sa.cnt / (SELECT n FROM total)) * (sb.cnt / (SELECT n FROM total))), 4) AS lift
FROM pairs p
JOIN item_support sa ON p.item_a = sa.product_id
JOIN item_support sb ON p.item_b = sb.product_id;
```

Then filter for strong associations:

```sql
SELECT item_a, item_b, lift
FROM basket_rules
WHERE lift > 2.0 AND confidence_a_to_b > 0.3
ORDER BY lift DESC;
```

## Summary

ClickHouse supports full market basket analysis by self-joining order items to find pairs, then computing support, confidence, and lift. Use a minimum support threshold (e.g., 50 orders) to filter noise before computing association metrics.
