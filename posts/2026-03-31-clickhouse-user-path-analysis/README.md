# How to Implement User Path Analysis in ClickHouse

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: ClickHouse, Path Analysis, Funnel, User Journey, SequenceMatch

Description: Learn how to implement user path analysis in ClickHouse using sequenceMatch, groupArray, and funnel functions to understand user navigation patterns.

---

## User Path Analysis

User path analysis maps the most common sequences of actions users take between key pages or events. It answers: what do users do before purchasing, what paths lead to churn, and what flows are most common after sign-up. ClickHouse's sequence functions are purpose-built for this.

## Top Next Actions

Find the most common next event after viewing a product page:

```sql
SELECT
    next_event,
    occurrences,
    round(occurrences / sum(occurrences) OVER () * 100, 2) AS pct
FROM (
    SELECT
        next_event,
        count() AS occurrences
    FROM (
        SELECT
            event_type,
            lead(event_type) OVER (PARTITION BY user_id ORDER BY event_time) AS next_event
        FROM user_events
        WHERE event_time >= today() - 7
    )
    WHERE event_type = 'product_view'
      AND next_event IS NOT NULL
    GROUP BY next_event
)
ORDER BY occurrences DESC
LIMIT 10;
```

## Most Common Event Sequences

Extract N-grams of event sequences per session:

```sql
SELECT
    arrayStringConcat([event_type, next_event, next_next_event], ' -> ') AS path,
    count() AS frequency
FROM (
    SELECT
        user_id,
        session_id,
        event_type,
        lead(event_type, 1) OVER (PARTITION BY user_id, session_id ORDER BY event_time) AS next_event,
        lead(event_type, 2) OVER (PARTITION BY user_id, session_id ORDER BY event_time) AS next_next_event
    FROM session_events
    WHERE event_time >= today() - 7
)
WHERE next_event IS NOT NULL AND next_next_event IS NOT NULL
GROUP BY path
ORDER BY frequency DESC
LIMIT 20;
```

## sequenceMatch for Pattern Detection

Find users who viewed pricing then signed up within 30 minutes:

```sql
SELECT count(DISTINCT user_id) AS converted_users
FROM (
    SELECT user_id, sequenceMatch(
        '(?1)(?t<=1800)(?2)'
    )(event_time,
        event_type = 'pricing_view',
        event_type = 'signup'
    ) AS matched
    FROM user_events
    WHERE event_time >= today() - 30
    GROUP BY user_id
)
WHERE matched = 1;
```

## Funnel Analysis

Count users completing each step of a conversion funnel:

```sql
SELECT
    level,
    users,
    round(users / first_value(users) OVER (ORDER BY level) * 100, 2) AS pct_of_top
FROM (
    SELECT 1 AS level, uniq(user_id) AS users FROM user_events WHERE event_type = 'landing'
        AND event_time >= today() - 7
    UNION ALL
    SELECT 2, uniq(user_id) FROM user_events WHERE event_type = 'signup_start'
        AND event_time >= today() - 7
    UNION ALL
    SELECT 3, uniq(user_id) FROM user_events WHERE event_type = 'signup_complete'
        AND event_time >= today() - 7
    UNION ALL
    SELECT 4, uniq(user_id) FROM user_events WHERE event_type = 'first_purchase'
        AND event_time >= today() - 7
)
ORDER BY level;
```

## Path Compression with groupArray

Collect full session paths for qualitative analysis:

```sql
SELECT
    user_id,
    session_id,
    arrayStringConcat(groupArray(event_type), ' -> ') AS full_path
FROM session_events
WHERE event_time >= today() - 1
GROUP BY user_id, session_id
ORDER BY min(event_time) DESC
LIMIT 100;
```

## Summary

ClickHouse implements user path analysis with `lead()`/`lag()` for adjacent event pairs, `sequenceMatch` for temporal pattern detection, and `groupArray` for full-path compression. Funnel queries using `UNION ALL` quantify drop-off at each step. Together, these patterns map the routes users take through your product.
