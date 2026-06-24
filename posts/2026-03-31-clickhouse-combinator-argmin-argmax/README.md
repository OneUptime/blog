# How to Use -ArgMin and -ArgMax Combinators in ClickHouse

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: ClickHouse, Aggregate Function, Combinator, argMin, argMax, Performance

Description: Learn how argMin and argMax return the value of one column at the row where another column reaches its minimum or maximum - with practical analytics examples.

---

A very common analytics pattern is "give me the value of column X at the row where column Y is the smallest (or largest)". In standard SQL this typically requires a window function or a correlated subquery. ClickHouse provides `argMin(x, y)` and `argMax(x, y)` as first-class aggregate functions that do exactly this in a single pass: they return the value of `x` at the row where `y` is minimized or maximized. This post covers these two functions in depth, including their behavior with ties, how to use them with GROUP BY, and practical patterns for finding first/last events, opening/closing prices, and per-group extremes.

## Syntax

```text
argMin(value_column, key_column)  -- returns value where key is minimum
argMax(value_column, key_column)  -- returns value where key is maximum
```

Both functions scan all rows in the group, track the row where `key_column` is smallest (or largest), and return `value_column` from that row. If multiple rows share the same minimum or maximum key, which `value_column` is returned is not deterministic - the winning row depends on processing order and can vary between runs with parallel execution.

## Basic Example: First and Last Event per User

Find the first and last action each user performed, along with the timestamps.

```sql
CREATE TABLE user_actions
(
    user_id     UInt32,
    action      String,
    page        String,
    event_time  DateTime,
    session_id  String
)
ENGINE = MergeTree()
ORDER BY (user_id, event_time);

INSERT INTO user_actions VALUES
    (1, 'pageview', '/home',    '2026-03-31 09:00:00', 's1'),
    (1, 'click',    '/home',    '2026-03-31 09:02:00', 's1'),
    (1, 'pageview', '/pricing', '2026-03-31 09:05:00', 's1'),
    (1, 'signup',   '/signup',  '2026-03-31 09:10:00', 's1'),
    (2, 'pageview', '/home',    '2026-03-31 10:00:00', 's2'),
    (2, 'pageview', '/blog',    '2026-03-31 10:03:00', 's2'),
    (2, 'click',    '/blog',    '2026-03-31 10:04:00', 's2'),
    (3, 'pageview', '/pricing', '2026-03-31 11:00:00', 's3');
```

Use `argMin` to find the first action (minimum timestamp) and `argMax` for the last:

```sql
SELECT
    user_id,
    argMin(action, event_time)   AS first_action,
    argMin(page, event_time)     AS first_page,
    argMin(event_time, event_time) AS first_seen,
    argMax(action, event_time)   AS last_action,
    argMax(page, event_time)     AS last_page,
    argMax(event_time, event_time) AS last_seen
FROM user_actions
GROUP BY user_id
ORDER BY user_id;
```

```text
user_id  first_action  first_page  first_seen           last_action  last_page  last_seen
1        pageview      /home       2026-03-31 09:00:00  signup       /signup    2026-03-31 09:10:00
2        pageview      /home       2026-03-31 10:00:00  click        /blog      2026-03-31 10:04:00
3        pageview      /pricing    2026-03-31 11:00:00  pageview     /pricing   2026-03-31 11:00:00
```

Notice you can call `argMin` multiple times with the same key column to retrieve different value columns from the same row, all in one pass.

## Financial Data: Opening and Closing Prices

`argMin` and `argMax` are natural fits for OHLC (open/high/low/close) style queries.

```sql
CREATE TABLE trades
(
    symbol      String,
    trade_time  DateTime,
    price       Float64,
    volume      UInt32
)
ENGINE = MergeTree()
ORDER BY (symbol, trade_time);

INSERT INTO trades VALUES
    ('AAPL', '2026-03-31 09:30:00', 172.50, 1000),
    ('AAPL', '2026-03-31 10:15:00', 174.20, 500),
    ('AAPL', '2026-03-31 11:45:00', 171.80, 800),
    ('AAPL', '2026-03-31 14:30:00', 173.60, 1200),
    ('AAPL', '2026-03-31 15:59:00', 175.10, 2000),
    ('GOOG', '2026-03-31 09:30:00', 180.00, 300),
    ('GOOG', '2026-03-31 12:00:00', 182.50, 600),
    ('GOOG', '2026-03-31 15:59:00', 179.80, 400);
```

Compute opening price (first trade), closing price (last trade), high, and low for each symbol:

```sql
SELECT
    symbol,
    argMin(price, trade_time)  AS open_price,
    argMax(price, trade_time)  AS close_price,
    max(price)                 AS high_price,
    min(price)                 AS low_price,
    sum(volume)                AS total_volume
FROM trades
GROUP BY symbol
ORDER BY symbol;
```

```text
symbol  open_price  close_price  high_price  low_price  total_volume
AAPL    172.5       175.1        175.1       171.8      5500
GOOG    180         179.8        182.5       179.8      1300
```

`argMin(price, trade_time)` finds the price at the earliest trade - the open. `argMax(price, trade_time)` finds the price at the latest trade - the close.

## argMax with Non-Timestamp Keys

The key column does not have to be a timestamp. You can use any orderable value. Here, find the user who placed the largest order per region:

```sql
CREATE TABLE region_orders
(
    region   String,
    user_id  UInt32,
    amount   Float64
)
ENGINE = MergeTree()
ORDER BY region;

INSERT INTO region_orders VALUES
    ('us-east', 101, 500.0),
    ('us-east', 102, 1200.0),
    ('us-east', 103, 800.0),
    ('eu-west', 201, 650.0),
    ('eu-west', 202, 430.0),
    ('eu-west', 203, 920.0);

SELECT
    region,
    argMax(user_id, amount)  AS top_buyer,
    max(amount)              AS max_order
FROM region_orders
GROUP BY region
ORDER BY region;
```

```text
region   top_buyer  max_order
eu-west  203        920
us-east  102        1200
```

## Finding the Full Row at the Extreme

To retrieve multiple columns from the row with the maximum value, call `argMax` once per column you need, all using the same key:

```sql
SELECT
    symbol,
    argMax(trade_time, price)  AS time_of_high,
    argMax(price, price)       AS high_price,
    argMax(volume, price)      AS volume_at_high
FROM trades
GROUP BY symbol
ORDER BY symbol;
```

```text
symbol  time_of_high         high_price  volume_at_high
AAPL    2026-03-31 15:59:00  175.1       2000
GOOG    2026-03-31 12:00:00  182.5       600
```

All three `argMax` calls use `price` as the key, so they all refer to the same row - the row with the highest price.

## argMin on String Keys

Strings are compared lexicographically. This can be used to find the alphabetically first or last value in a category:

```sql
SELECT
    argMin(user_id, action) AS user_at_first_alphabetical_action,
    argMax(user_id, action) AS user_at_last_alphabetical_action
FROM user_actions;
```

```text
user_at_first_alphabetical_action  user_at_last_alphabetical_action
1                                  1
```

"click" < "pageview" < "signup", so the minimum is the user who performed "click" and the maximum is the user who performed "signup".

## Using argMin/argMax in a Materialized View

Pre-compute per-symbol first and last trade price in a materialized view for fast dashboard queries. A materialized view runs its `SELECT` on each insert batch, so the target table needs to be able to merge partial results across batches. Use `AggregatingMergeTree` with the `-State` forms of each aggregate so that intermediate states are stored and combined during background merges:

```sql
CREATE TABLE daily_ohlc
(
    symbol      String,
    trade_date  Date,
    open_price  AggregateFunction(argMin, Float64, DateTime),
    close_price AggregateFunction(argMax, Float64, DateTime),
    high_price  AggregateFunction(max,    Float64),
    low_price   AggregateFunction(min,    Float64),
    volume      AggregateFunction(sum,    UInt32)
)
ENGINE = AggregatingMergeTree()
ORDER BY (symbol, trade_date);

CREATE MATERIALIZED VIEW daily_ohlc_mv
TO daily_ohlc
AS
SELECT
    symbol,
    toDate(trade_time)              AS trade_date,
    argMinState(price, trade_time)  AS open_price,
    argMaxState(price, trade_time)  AS close_price,
    maxState(price)                 AS high_price,
    minState(price)                 AS low_price,
    sumState(volume)                AS volume
FROM trades
GROUP BY symbol, trade_date;
```

Query the stored states with the matching `-Merge` functions to finalize results across all batches:

```sql
SELECT
    symbol,
    trade_date,
    argMinMerge(open_price)   AS open_price,
    argMaxMerge(close_price)  AS close_price,
    maxMerge(high_price)      AS high_price,
    minMerge(low_price)       AS low_price,
    sumMerge(volume)          AS volume
FROM daily_ohlc
GROUP BY symbol, trade_date
ORDER BY symbol, trade_date;
```

## Summary

`argMin(value, key)` and `argMax(value, key)` return the value of one column at the row where another column is minimized or maximized. They are efficient single-pass aggregate functions ideal for finding first/last events by timestamp, opening/closing prices in financial data, and per-group extreme row lookups. To retrieve multiple attributes from the same extreme row, call `argMin`/`argMax` multiple times with the same key column. When ties exist on the key column, which row's value is returned is not deterministic - so for predictable tie-breaking, combine with a secondary sort key encoded into the key column (for example, a tuple `(event_time, row_id)`).
