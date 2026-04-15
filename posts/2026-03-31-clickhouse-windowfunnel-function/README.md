# How to Use windowFunnel() Function in ClickHouse

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: ClickHouse, SQL, Aggregate Function, WindowFunnel, Funnel, Conversion

Description: Analyze conversion funnels in ClickHouse using windowFunnel(), which returns the maximum funnel step reached within a sliding time window per user.

---

Funnel analysis answers a deceptively simple question: of all the users who started a multi-step flow, how many completed each subsequent step? ClickHouse's `windowFunnel()` aggregate function solves this efficiently by scanning each user's event timeline and returning the maximum step reached within a configurable time window, with several modes to control how strict the step-matching rules are.

## Syntax

```sql
windowFunnel(window[, mode, ...])(timestamp, cond1, cond2, ...)
```

- `window` - length of the sliding time window. The unit depends on the `timestamp` column type: seconds for `DateTime`, days for `Date`, or the same unit as the column for unsigned integer types. All steps must be completed within this duration from the first matched step.
- `mode` (optional) - one or more of `'strict_order'`, `'strict_deduplication'`, `'strict_increase'`, `'strict_once'`, `'allow_reentry'`.
- `timestamp` - a `Date`, `DateTime`, or unsigned integer (`UInt8`, `UInt16`, `UInt32`, `UInt64`) ordering column.
- `cond1, cond2, ...` - Boolean conditions representing each funnel step, evaluated in order.

The function returns a `UInt8` indicating the last step number reached (1 through N, or 0 if step 1 was never reached).

## Setup

```sql
CREATE TABLE funnel_events
(
    user_id UInt32,
    event   String,
    ts      DateTime
)
ENGINE = MergeTree()
ORDER BY (user_id, ts);

INSERT INTO funnel_events VALUES
    (1, 'signup',   '2024-03-01 10:00:00'),
    (1, 'onboard',  '2024-03-01 10:10:00'),
    (1, 'purchase', '2024-03-01 10:20:00'),
    (2, 'signup',   '2024-03-01 11:00:00'),
    (2, 'onboard',  '2024-03-01 11:05:00'),
    (3, 'signup',   '2024-03-01 12:00:00'),
    (3, 'purchase', '2024-03-01 14:00:00'),
    (4, 'onboard',  '2024-03-01 09:00:00'),
    (4, 'purchase', '2024-03-01 09:30:00');
```

## Basic Funnel: Max Step Reached

```sql
SELECT
    user_id,
    windowFunnel(86400)(
        ts,
        event = 'signup',
        event = 'onboard',
        event = 'purchase'
    ) AS max_step
FROM funnel_events
GROUP BY user_id
ORDER BY user_id;
```

```text
user_id | max_step
--------|--------
1       | 3
2       | 2
3       | 1
4       | 0
```

User 4 never signed up (step 1) so they score 0. User 3 signed up but did not complete onboard before purchasing (steps must be in order), so they score 1.

## Aggregate Funnel Counts

Convert per-user max steps into population-level step counts:

```sql
SELECT
    countIf(max_step >= 1) AS step1_signup,
    countIf(max_step >= 2) AS step2_onboard,
    countIf(max_step >= 3) AS step3_purchase
FROM (
    SELECT
        user_id,
        windowFunnel(86400)(
            ts,
            event = 'signup',
            event = 'onboard',
            event = 'purchase'
        ) AS max_step
    FROM funnel_events
    GROUP BY user_id
);
```

```text
step1_signup | step2_onboard | step3_purchase
-------------|---------------|---------------
3            | 2             | 1
```

## Time Window Effects

Tighten the window to see how many users convert quickly:

```sql
-- Only count conversions within 30 minutes
SELECT
    countIf(max_step >= 3) AS fast_converters
FROM (
    SELECT
        user_id,
        windowFunnel(1800)(
            ts,
            event = 'signup',
            event = 'onboard',
            event = 'purchase'
        ) AS max_step
    FROM funnel_events
    GROUP BY user_id
);
```

## Strict Modes

### strict_order

Steps must occur strictly in the defined order with no other funnel-condition events in between:

```sql
SELECT
    user_id,
    windowFunnel(86400, 'strict_order')(
        ts,
        event = 'signup',
        event = 'onboard',
        event = 'purchase'
    ) AS max_step
FROM funnel_events
GROUP BY user_id;
```

### strict_deduplication

If the same step condition fires consecutively, the repeating event interrupts further chain processing. Useful when events can be duplicated due to retries or double-fires:

```sql
SELECT
    user_id,
    windowFunnel(86400, 'strict_deduplication')(
        ts,
        event = 'signup',
        event = 'onboard',
        event = 'purchase'
    ) AS max_step
FROM funnel_events
GROUP BY user_id;
```

### strict_increase

Timestamps must strictly increase between steps (ties are not allowed):

```sql
SELECT
    user_id,
    windowFunnel(86400, 'strict_increase')(
        ts,
        event = 'signup',
        event = 'onboard',
        event = 'purchase'
    ) AS max_step
FROM funnel_events
GROUP BY user_id;
```

## Funnel by Date Cohort

Segment funnel performance by signup date:

```sql
SELECT
    toDate(min_ts)                 AS cohort_date,
    countIf(max_step >= 1)         AS entered_funnel,
    countIf(max_step >= 2)         AS completed_onboard,
    countIf(max_step >= 3)         AS converted,
    round(countIf(max_step >= 3) * 100.0 / countIf(max_step >= 1), 1) AS conversion_pct
FROM (
    SELECT
        user_id,
        min(ts) AS min_ts,
        windowFunnel(86400)(
            ts,
            event = 'signup',
            event = 'onboard',
            event = 'purchase'
        ) AS max_step
    FROM funnel_events
    GROUP BY user_id
)
GROUP BY cohort_date
ORDER BY cohort_date;
```

## Summary

`windowFunnel(window)(timestamp, cond1, ...)` returns the maximum funnel step each user reached within a sliding time window, making it the go-to function for conversion analysis in ClickHouse. Wrap the per-user results in `countIf(max_step >= N)` to get population-level step counts, and use modes like `strict_order` or `strict_deduplication` to tighten the matching rules. Pairing `windowFunnel` with cohort grouping reveals how conversion rates evolve across different user segments over time.
