# How to Use sequenceMatch() and sequenceCount() in ClickHouse

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: ClickHouse, SQL, Aggregate Function, Sequence, Funnel, Event Analytics

Description: Detect ordered event patterns and count occurrences across user sessions using sequenceMatch() and sequenceCount() aggregate functions in ClickHouse.

---

Behavioral analytics often comes down to one question: did a user perform a specific sequence of actions? ClickHouse answers this with `sequenceMatch()` and `sequenceCount()` - two aggregate functions that scan a time-ordered list of events per user and match them against a regular-expression-like pattern. Unlike `windowFunnel`, these functions give you full pattern matching power including time constraints and arbitrary gaps between steps.

## Syntax

```sql
sequenceMatch('pattern')(timestamp, cond1, cond2, ...)
sequenceCount('pattern')(timestamp, cond1, cond2, ...)
```

- `pattern` - a string pattern using special tokens (see below).
- `timestamp` - a `Date`, `DateTime`, or any supported `UInt` column used to order events within each group.
- `cond1, cond2, ...` - Boolean expressions mapped to `(?1)`, `(?2)`, ... in the pattern.

`sequenceMatch` returns `UInt8` (1 if the pattern matched, 0 otherwise).
`sequenceCount` returns `UInt64` (number of non-overlapping pattern occurrences).

## Pattern Syntax

| Token | Meaning |
|---|---|
| `(?N)` | Event matching condition N (1 through 32) |
| `(?t<N)` | Time gap less than N seconds between adjacent events |
| `(?t>N)` | Time gap greater than N seconds |
| `(?t<=N)` | Time gap less than or equal to N seconds |
| `(?t>=N)` | Time gap greater than or equal to N seconds |
| `(?t==N)` | Time gap exactly equal to N seconds |
| `.*` | Any number of any events (zero or more) |

## Setup

```sql
CREATE TABLE user_events
(
    user_id    UInt32,
    event      String,
    ts         DateTime
)
ENGINE = MergeTree()
ORDER BY (user_id, ts);

INSERT INTO user_events VALUES
    (1, 'view',     '2024-01-01 10:00:00'),
    (1, 'add_cart', '2024-01-01 10:05:00'),
    (1, 'purchase', '2024-01-01 10:15:00'),
    (2, 'view',     '2024-01-01 11:00:00'),
    (2, 'add_cart', '2024-01-01 11:02:00'),
    (2, 'view',     '2024-01-01 11:10:00'),
    (3, 'view',     '2024-01-01 12:00:00'),
    (3, 'purchase', '2024-01-01 12:30:00');
```

## Basic Pattern Match: Did User Reach Purchase After View?

```sql
SELECT
    user_id,
    sequenceMatch('(?1).*(?3)')(
        ts,
        event = 'view',
        event = 'add_cart',
        event = 'purchase'
    ) AS reached_purchase
FROM user_events
GROUP BY user_id
ORDER BY user_id;
```

```text
user_id | reached_purchase
--------|----------------
1       | 1
2       | 0
3       | 1
```

User 2 viewed and added to cart but never purchased. User 3 went directly from view to purchase (skipping add_cart), which still matches `(?1).*(?3)`.

## Requiring the Full Funnel in Order

```sql
SELECT
    user_id,
    sequenceMatch('(?1).*(?2).*(?3)')(
        ts,
        event = 'view',
        event = 'add_cart',
        event = 'purchase'
    ) AS completed_full_funnel
FROM user_events
GROUP BY user_id;
```

User 3 skipped `add_cart`, so `completed_full_funnel = 0` for them.

## Counting Occurrences with sequenceCount

```sql
SELECT
    user_id,
    sequenceCount('(?1).*(?2)')(
        ts,
        event = 'view',
        event = 'add_cart'
    ) AS view_then_cart_count
FROM user_events
GROUP BY user_id
ORDER BY user_id;
```

`sequenceCount` finds how many non-overlapping times a pattern appears - useful for repeat behaviors like re-engagement cycles.

## Time-Constrained Patterns

Require that steps happen within 10 minutes of each other:

```sql
SELECT
    user_id,
    sequenceMatch('(?1)(?t<600)(?2)(?t<600)(?3)')(
        ts,
        event = 'view',
        event = 'add_cart',
        event = 'purchase'
    ) AS fast_conversion
FROM user_events
GROUP BY user_id;
```

`(?t<600)` means the gap between the preceding and following events must be less than 600 seconds.

## Aggregate Funnel Rates

Compute per-user flags first, then aggregate:

```sql
SELECT
    countIf(step1 = 1)  AS reached_step1,
    countIf(step2 = 1)  AS reached_step2
FROM (
    SELECT
        user_id,
        sequenceMatch('(?1).*(?2)')(ts, event = 'view', event = 'add_cart')     AS step1,
        sequenceMatch('(?1).*(?2).*(?3)')(ts, event = 'view', event = 'add_cart', event = 'purchase') AS step2
    FROM user_events
    GROUP BY user_id
);
```

## Summary

`sequenceMatch` and `sequenceCount` bring regex-style pattern matching to ordered event streams, enabling precise funnel analysis, repeat-behavior counting, and time-gap enforcement - all in a single SQL aggregation. Use `sequenceMatch` when you need a per-user boolean flag and `sequenceCount` when you want to count how many times a pattern recurs. Combine them with `countIf` or `sumIf` in an outer query to compute population-level conversion rates.
