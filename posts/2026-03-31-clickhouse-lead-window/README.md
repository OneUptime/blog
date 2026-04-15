# How to Use LEAD() Window Function in ClickHouse

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: ClickHouse, Window Function, SQL, Time Series, Analytics

Description: Learn how LEAD() accesses values from subsequent rows within a partition in ClickHouse, with examples for look-ahead comparisons and computing time-to-next-event.

---

`LEAD()` is the forward-looking counterpart to `LAG()`. While `LAG()` looks back at previous rows, `LEAD()` looks ahead at subsequent rows within the same window partition. This makes it the natural tool for computing "time to next event," detecting what happens after a current state, and building look-ahead comparisons in time series data. ClickHouse supports `LEAD()` natively as part of its window function implementation.

## Syntax

```text
LEAD(expr [, offset [, default_value]])
OVER (
    [PARTITION BY partition_expr [, ...]]
    ORDER BY sort_expr [ASC | DESC] [, ...]
)
```

- `expr` - the column or expression whose future value you want to retrieve.
- `offset` - how many rows ahead to look (default is 1, meaning the immediately following row).
- `default_value` - the value to return when the offset goes beyond the partition boundary (default is `NULL`).

## Basic Usage: Accessing the Next Row

The most straightforward use fetches the next row's value. This query shows each event alongside the next event time for the same user:

```sql
SELECT
    user_id,
    event_time,
    event_type,
    LEAD(event_time) OVER (
        PARTITION BY user_id
        ORDER BY event_time ASC
    ) AS next_event_time
FROM user_events
ORDER BY user_id, event_time;
```

The last event for each user has no subsequent row, so `next_event_time` is `NULL` for those rows.

## Computing Time to Next Event

Subtract the current event time from the next event time to find how long before the next event occurs. This is useful for computing dwell time on a page, time between steps in a funnel, or inter-arrival times:

```sql
SELECT
    user_id,
    event_time,
    event_type,
    LEAD(event_time) OVER (
        PARTITION BY user_id
        ORDER BY event_time ASC
    ) AS next_event_time,
    dateDiff(
        'second',
        event_time,
        LEAD(event_time) OVER (
            PARTITION BY user_id
            ORDER BY event_time ASC
        )
    ) AS seconds_to_next_event
FROM user_events
WHERE event_date = today() - 1
ORDER BY user_id, event_time;
```

Rows with `NULL` for `next_event_time` represent terminal events - the last action in a session.

## Using a Default Value at Partition Boundaries

When the last row of a partition needs a non-NULL value, provide a default. In this example, the sentinel timestamp `'2099-12-31 00:00:00'` marks the end of an open interval:

```sql
SELECT
    subscription_id,
    change_date,
    plan_name,
    LEAD(change_date, 1, toDateTime('2099-12-31 00:00:00')) OVER (
        PARTITION BY subscription_id
        ORDER BY change_date ASC
    ) AS valid_until
FROM subscription_changes
ORDER BY subscription_id, change_date;
```

This creates a valid-from / valid-until interval for each subscription plan record, which is the foundation of slowly changing dimension (SCD Type 2) modeling.

## Look-Ahead Offset Greater Than 1

Set the offset to skip ahead multiple rows. This query compares each day's revenue to the revenue two days in the future:

```sql
SELECT
    sale_date,
    revenue,
    LEAD(revenue, 2) OVER (ORDER BY sale_date ASC) AS revenue_2d_ahead,
    LEAD(revenue, 2) OVER (ORDER BY sale_date ASC) - revenue AS future_delta
FROM daily_sales
ORDER BY sale_date;
```

## Detecting the Next State Transition

Use `LEAD()` on a status column to see what state a record transitions to next. This is useful for funnel analysis:

```sql
SELECT
    order_id,
    status,
    status_time,
    LEAD(status) OVER (
        PARTITION BY order_id
        ORDER BY status_time ASC
    ) AS next_status,
    LEAD(status_time) OVER (
        PARTITION BY order_id
        ORDER BY status_time ASC
    ) AS next_status_time,
    dateDiff(
        'minute',
        status_time,
        LEAD(status_time) OVER (
            PARTITION BY order_id
            ORDER BY status_time ASC
        )
    ) AS minutes_in_status
FROM order_status_history
ORDER BY order_id, status_time;
```

This shows how long each order spent in each status before transitioning to the next one.

## Identifying the Last Event Before a Conversion

Combine `LEAD()` with filtering to find which events precede a conversion. This query checks whether the next event for each action was a purchase:

```sql
SELECT
    user_id,
    event_time,
    event_type,
    LEAD(event_type) OVER (
        PARTITION BY user_id
        ORDER BY event_time ASC
    ) AS next_event_type,
    CASE
        WHEN LEAD(event_type) OVER (
            PARTITION BY user_id
            ORDER BY event_time ASC
        ) = 'purchase' THEN 1
        ELSE 0
    END AS leads_to_purchase
FROM user_events
ORDER BY user_id, event_time;
```

Aggregate on `leads_to_purchase` to compute the conversion rate of each event type - which page views or interactions most often lead directly to a purchase.

## Combining LEAD() and LAG() in One Query

Real analytics often need both directions simultaneously. This query shows the previous, current, and next daily active user count to understand trend direction:

```sql
SELECT
    metric_date,
    dau,
    LAG(dau, 1)  OVER (ORDER BY metric_date ASC) AS dau_yesterday,
    LEAD(dau, 1) OVER (ORDER BY metric_date ASC) AS dau_tomorrow,
    CASE
        WHEN dau > LAG(dau, 1) OVER (ORDER BY metric_date ASC)
         AND dau > LEAD(dau, 1) OVER (ORDER BY metric_date ASC)
        THEN 'local_peak'
        WHEN dau < LAG(dau, 1) OVER (ORDER BY metric_date ASC)
         AND dau < LEAD(dau, 1) OVER (ORDER BY metric_date ASC)
        THEN 'local_trough'
        ELSE 'neither'
    END AS trend_signal
FROM daily_active_users
ORDER BY metric_date;
```

## Session End Detection

Mark the end of a session by checking whether the time gap to the next event exceeds a threshold:

```sql
SELECT
    user_id,
    event_time,
    event_type,
    CASE
        WHEN LEAD(event_time) OVER (
            PARTITION BY user_id
            ORDER BY event_time ASC
        ) IS NULL THEN 1
        WHEN dateDiff(
            'minute',
            event_time,
            LEAD(event_time) OVER (
                PARTITION BY user_id
                ORDER BY event_time ASC
            )
        ) > 30 THEN 1
        ELSE 0
    END AS is_session_end
FROM user_events
WHERE event_date = today() - 1
ORDER BY user_id, event_time;
```

Rows where `is_session_end = 1` are the last events in their respective sessions, either because no further event exists or because the next event is more than 30 minutes away.

## Summary

`LEAD()` complements `LAG()` by providing forward visibility into subsequent rows within a window partition. Its three-argument signature mirrors `LAG()` exactly, making the two functions easy to use together. Key applications include computing time-to-next-event, modeling valid-time intervals for slowly changing dimensions, detecting the next state in a sequence, and identifying which actions precede conversions. In ClickHouse, `LEAD()` is most efficient when the table's physical sort order aligns with the window's `PARTITION BY` and `ORDER BY` columns.
