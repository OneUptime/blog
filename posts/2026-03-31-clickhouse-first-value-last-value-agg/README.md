# How to Use first_value() and last_value() Aggregate Functions in ClickHouse

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: ClickHouse, Aggregate Function, FIRST_VALUE, LAST_VALUE, Window Function, Time Series

Description: Learn how first_value() and last_value() retrieve the first and last values from an ordered set, useful for opening prices, first events, and session boundaries.

---

When analyzing time-ordered data you frequently need the value at the start or end of a group: the opening price of a stock, the first URL in a user session, the last status before a deadline. ClickHouse provides `first_value()` and `last_value()` as both aggregate functions (for `GROUP BY` queries) and window functions (for `OVER` clauses). In the aggregate form they return the first or last value in the order rows happen to be stored, so you almost always pair them with `argMin`/`argMax` or use them inside a window function with an explicit `ORDER BY`. This post covers both usages with realistic examples.

## Syntax

As an aggregate function in a `GROUP BY` query:

```text
first_value(column)
last_value(column)
```

As a window function:

```text
first_value(column) OVER (PARTITION BY ... ORDER BY ... [ROWS BETWEEN ...])
last_value(column)  OVER (PARTITION BY ... ORDER BY ... [ROWS BETWEEN ...])
```

Without an `ORDER BY` in the window frame, both functions return an arbitrary value from the partition. Always specify `ORDER BY` when order matters.

## Setting Up Sample Data

Create a table of stock trades and a table of user session events to illustrate both financial and behavioral analytics use cases.

```sql
CREATE TABLE stock_trades
(
    symbol      String,
    trade_time  DateTime,
    price       Float64,
    volume      UInt32
)
ENGINE = MergeTree()
ORDER BY (symbol, trade_time);

INSERT INTO stock_trades VALUES
    ('AAPL', '2026-03-31 09:30:00', 172.50, 1000),
    ('AAPL', '2026-03-31 10:00:00', 173.20, 800),
    ('AAPL', '2026-03-31 12:30:00', 171.90, 600),
    ('AAPL', '2026-03-31 15:00:00', 174.60, 900),
    ('AAPL', '2026-03-31 15:59:00', 175.10, 2000),
    ('GOOG', '2026-03-31 09:30:00', 180.00, 300),
    ('GOOG', '2026-03-31 11:00:00', 182.50, 500),
    ('GOOG', '2026-03-31 14:00:00', 181.30, 400),
    ('GOOG', '2026-03-31 15:59:00', 179.80, 350);
```

```sql
CREATE TABLE session_events
(
    user_id     UInt32,
    session_id  String,
    page        String,
    event_type  String,
    event_time  DateTime
)
ENGINE = MergeTree()
ORDER BY (session_id, event_time);

INSERT INTO session_events VALUES
    (1, 'ses-a', '/home',     'pageview', '2026-03-31 09:00:00'),
    (1, 'ses-a', '/products', 'pageview', '2026-03-31 09:03:00'),
    (1, 'ses-a', '/cart',     'click',    '2026-03-31 09:08:00'),
    (1, 'ses-a', '/checkout', 'pageview', '2026-03-31 09:12:00'),
    (2, 'ses-b', '/home',     'pageview', '2026-03-31 10:00:00'),
    (2, 'ses-b', '/blog',     'pageview', '2026-03-31 10:05:00'),
    (2, 'ses-b', '/blog',     'scroll',   '2026-03-31 10:07:00'),
    (3, 'ses-c', '/pricing',  'pageview', '2026-03-31 11:00:00');
```

## first_value() and last_value() in GROUP BY Queries

Because `first_value()` and `last_value()` in aggregate context return values based on storage order, pair them with `argMin()`/`argMax()` or use them after sorting via a subquery. The more reliable pattern for ordered first/last is `argMin`/`argMax`. However, `first_value()`/`last_value()` are the canonical choice in window function context.

For GROUP BY, use `argMin` and `argMax` for reliable ordering:

```sql
-- Opening (first) and closing (last) price per symbol using argMin/argMax
SELECT
    symbol,
    argMin(price, trade_time)  AS open_price,
    argMax(price, trade_time)  AS close_price,
    min(price)                 AS low,
    max(price)                 AS high,
    sum(volume)                AS total_volume
FROM stock_trades
GROUP BY symbol
ORDER BY symbol;
```

```text
symbol  open_price  close_price  low    high   total_volume
AAPL    172.5       175.1        171.9  175.1  5300
GOOG    180         179.8        179.8  182.5  1550
```

## first_value() and last_value() as Window Functions

The true power of `first_value()` and `last_value()` is in window function context, where you can add them as columns to every row without collapsing the result set.

### Reference the Opening Price on Every Row

Add the opening price (first trade of the day) as a reference column on every trade row:

```sql
SELECT
    symbol,
    trade_time,
    price,
    first_value(price) OVER (
        PARTITION BY symbol
        ORDER BY trade_time
        ROWS BETWEEN UNBOUNDED PRECEDING AND UNBOUNDED FOLLOWING
    ) AS open_price,
    last_value(price) OVER (
        PARTITION BY symbol
        ORDER BY trade_time
        ROWS BETWEEN UNBOUNDED PRECEDING AND UNBOUNDED FOLLOWING
    ) AS close_price,
    -- Price change relative to open
    price - first_value(price) OVER (
        PARTITION BY symbol
        ORDER BY trade_time
        ROWS BETWEEN UNBOUNDED PRECEDING AND UNBOUNDED FOLLOWING
    ) AS change_from_open
FROM stock_trades
ORDER BY symbol, trade_time;
```

```text
symbol  trade_time           price   open_price  close_price  change_from_open
AAPL    2026-03-31 09:30:00  172.5   172.5       175.1        0
AAPL    2026-03-31 10:00:00  173.2   172.5       175.1        0.7
AAPL    2026-03-31 12:30:00  171.9   172.5       175.1        -0.6
AAPL    2026-03-31 15:00:00  174.6   172.5       175.1        2.1
AAPL    2026-03-31 15:59:00  175.1   172.5       175.1        2.6
GOOG    2026-03-31 09:30:00  180     180         179.8        0
GOOG    2026-03-31 11:00:00  182.5   180         179.8        2.5
GOOG    2026-03-31 14:00:00  181.3   180         179.8        1.3
GOOG    2026-03-31 15:59:00  179.8   180         179.8        -0.2
```

The `ROWS BETWEEN UNBOUNDED PRECEDING AND UNBOUNDED FOLLOWING` frame makes the window span the entire partition, so both `first_value` and `last_value` see all rows.

### Entry and Exit Pages for Each Session

For each event in a session, show the entry page (first page in the session) and exit page (last page):

```sql
SELECT
    user_id,
    session_id,
    event_time,
    page,
    event_type,
    first_value(page) OVER (
        PARTITION BY session_id
        ORDER BY event_time
        ROWS BETWEEN UNBOUNDED PRECEDING AND UNBOUNDED FOLLOWING
    ) AS entry_page,
    last_value(page) OVER (
        PARTITION BY session_id
        ORDER BY event_time
        ROWS BETWEEN UNBOUNDED PRECEDING AND UNBOUNDED FOLLOWING
    ) AS exit_page
FROM session_events
ORDER BY session_id, event_time;
```

```text
user_id  session_id  event_time           page        event_type  entry_page  exit_page
1        ses-a       2026-03-31 09:00:00  /home       pageview    /home       /checkout
1        ses-a       2026-03-31 09:03:00  /products   pageview    /home       /checkout
1        ses-a       2026-03-31 09:08:00  /cart       click       /home       /checkout
1        ses-a       2026-03-31 09:12:00  /checkout   pageview    /home       /checkout
2        ses-b       2026-03-31 10:00:00  /home       pageview    /home       /blog
2        ses-b       2026-03-31 10:05:00  /blog       pageview    /home       /blog
2        ses-b       2026-03-31 10:07:00  /blog       scroll      /home       /blog
3        ses-c       2026-03-31 11:00:00  /pricing    pageview    /pricing    /pricing
```

Every row now carries the session's entry and exit page for easy filtering, grouping, or joining.

### Running First Value: Carry-Forward Pattern

Omit `UNBOUNDED FOLLOWING` to get a running first value - the first value seen so far up to the current row:

```sql
SELECT
    symbol,
    trade_time,
    price,
    -- Cumulative minimum price seen so far (running low)
    min(price) OVER (
        PARTITION BY symbol
        ORDER BY trade_time
        ROWS BETWEEN UNBOUNDED PRECEDING AND CURRENT ROW
    ) AS running_low,
    -- First value in the partition up to current row (running open)
    first_value(price) OVER (
        PARTITION BY symbol
        ORDER BY trade_time
        ROWS BETWEEN UNBOUNDED PRECEDING AND CURRENT ROW
    ) AS running_open
FROM stock_trades
ORDER BY symbol, trade_time;
```

```text
symbol  trade_time           price   running_low  running_open
AAPL    2026-03-31 09:30:00  172.5   172.5        172.5
AAPL    2026-03-31 10:00:00  173.2   172.5        172.5
AAPL    2026-03-31 12:30:00  171.9   171.9        172.5
AAPL    2026-03-31 15:00:00  174.6   171.9        172.5
AAPL    2026-03-31 15:59:00  175.1   171.9        172.5
```

`first_value` with a running frame always returns the first row's value (172.5 = open), while `min` tracks the running minimum.

## Aggregating first_value() Results

After computing per-row first/last values via a window function, you can aggregate them in an outer query for session-level analysis:

```sql
SELECT
    session_id,
    any(entry_page) AS entry_page,
    any(exit_page)  AS exit_page,
    count()         AS event_count
FROM (
    SELECT
        session_id,
        first_value(page) OVER (
            PARTITION BY session_id
            ORDER BY event_time
            ROWS BETWEEN UNBOUNDED PRECEDING AND UNBOUNDED FOLLOWING
        ) AS entry_page,
        last_value(page) OVER (
            PARTITION BY session_id
            ORDER BY event_time
            ROWS BETWEEN UNBOUNDED PRECEDING AND UNBOUNDED FOLLOWING
        ) AS exit_page
    FROM session_events
)
GROUP BY session_id
ORDER BY session_id;
```

```text
session_id  entry_page  exit_page   event_count
ses-a       /home       /checkout   4
ses-b       /home       /blog       3
ses-c       /pricing    /pricing    1
```

## Summary

`first_value()` and `last_value()` are most powerful as window functions with an explicit `ORDER BY` and a frame clause. Use `ROWS BETWEEN UNBOUNDED PRECEDING AND UNBOUNDED FOLLOWING` to reference the first or last value of the entire partition on every row - the most common pattern for carrying open/close prices or session entry/exit pages alongside each event. For GROUP BY aggregation where you want the value at the time extreme, `argMin(value, time)` and `argMax(value, time)` are more reliable because they explicitly sort by the key column. Combine window function results with an outer `GROUP BY` to produce clean session-level summaries without losing per-row context.
