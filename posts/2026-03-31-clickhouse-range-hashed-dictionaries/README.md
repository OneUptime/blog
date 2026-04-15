# How to Create Range Hashed Dictionaries in ClickHouse

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: ClickHouse, Dictionary, Range Hashed, Lookup, Time Range

Description: Learn how to create range hashed dictionaries in ClickHouse for time-range-based lookups such as pricing tiers, exchange rates, and promotional discounts.

---

## What is a Range Hashed Dictionary

A `range_hashed` dictionary maps a primary key plus a time range to a value. This is useful for data that changes over time - you can look up the value that was valid at a specific point in time.

## Use Case: Historical Exchange Rates

Store daily exchange rates and look up the rate that was valid on any given date:

```sql
-- Source table
CREATE TABLE exchange_rates_data (
    currency_code String,
    rate Float64,
    valid_from Date,
    valid_to Date
) ENGINE = MergeTree() ORDER BY (currency_code, valid_from);

INSERT INTO exchange_rates_data VALUES
('USD', 1.0, '2025-01-01', '2025-12-31'),
('EUR', 1.08, '2025-01-01', '2025-06-30'),
('EUR', 1.11, '2025-07-01', '2025-12-31'),
('GBP', 1.27, '2025-01-01', '2025-12-31');
```

## Create the Range Hashed Dictionary

```sql
CREATE DICTIONARY exchange_rates_dict (
    currency_code String,
    valid_from Date,
    valid_to Date,
    rate Float64 DEFAULT 1.0
)
PRIMARY KEY currency_code
SOURCE(CLICKHOUSE(TABLE 'exchange_rates_data'))
LAYOUT(RANGE_HASHED())
RANGE(MIN valid_from MAX valid_to)
LIFETIME(3600);
```

## Querying with dictGetOrDefault

Look up the exchange rate that was valid on a specific date:

```sql
SELECT
    order_id,
    currency,
    amount,
    dictGetOrDefault(
        'exchange_rates_dict',
        'rate',
        currency,
        toDate(order_date),
        toFloat64(1.0)
    ) AS exchange_rate,
    amount * dictGetOrDefault(
        'exchange_rates_dict',
        'rate',
        currency,
        toDate(order_date),
        toFloat64(1.0)
    ) AS amount_usd
FROM orders
LIMIT 20;
```

## Use Case: Pricing Tiers

```sql
CREATE TABLE pricing_tiers_data (
    product_id UInt64,
    price Float64,
    tier_start DateTime,
    tier_end DateTime
) ENGINE = MergeTree() ORDER BY (product_id, tier_start);

CREATE DICTIONARY pricing_tiers_dict (
    product_id UInt64,
    tier_start DateTime,
    tier_end DateTime,
    price Float64 DEFAULT 0.0
)
PRIMARY KEY product_id
SOURCE(CLICKHOUSE(TABLE 'pricing_tiers_data'))
LAYOUT(RANGE_HASHED())
RANGE(MIN tier_start MAX tier_end)
LIFETIME(300);
```

## Query Historical Price

```sql
SELECT
    order_id,
    product_id,
    order_time,
    dictGetOrDefault(
        'pricing_tiers_dict', 'price',
        product_id,
        order_time,
        toFloat64(0.0)
    ) AS historical_price
FROM orders
WHERE order_time >= '2025-01-01';
```

## Handle Overlapping Ranges

Range hashed dictionaries do not guarantee behavior when ranges overlap. Ensure your source data has non-overlapping ranges per key:

```sql
-- Validate no overlapping ranges in source
SELECT currency_code, count() AS range_count
FROM exchange_rates_data e1
JOIN exchange_rates_data e2 USING (currency_code)
WHERE e1.valid_from < e2.valid_to
  AND e1.valid_to > e2.valid_from
  AND e1.valid_from != e2.valid_from
GROUP BY currency_code
HAVING range_count > 0;
```

## Summary

Range hashed dictionaries solve the temporal lookup problem - finding the value that was valid at a specific point in time. They are ideal for exchange rates, pricing history, promotional discounts, and any data with time-bounded validity periods.
