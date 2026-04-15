# How to Build Real-Time Leaderboards with ClickHouse

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: ClickHouse, Leaderboard, Real-Time, Gaming, Analytics

Description: Build real-time leaderboards with ClickHouse using aggregating materialized views and efficient top-N queries to rank millions of users by score with sub-second latency.

---

Leaderboards are a classic analytics challenge: you need to rank millions of users by score in real time, update ranks as scores change, and return top-N results in milliseconds. ClickHouse handles this exceptionally well using aggregating materialized views that precompute scores and efficient ORDER BY queries.

## Schema Design

Start with a raw events table that records score-generating actions:

```sql
CREATE TABLE score_events (
    event_time DateTime DEFAULT now(),
    user_id UInt64,
    event_type LowCardinality(String),
    score_delta Int32,
    game_id UInt32
) ENGINE = MergeTree
PARTITION BY toYYYYMM(event_time)
ORDER BY (event_time, user_id);
```

## Aggregating Materialized View for Scores

Precompute running totals using an AggregatingMergeTree:

```sql
CREATE TABLE user_scores_agg (
    game_id UInt32,
    user_id UInt64,
    total_score AggregateFunction(sum, Int32),
    event_count AggregateFunction(count)
) ENGINE = AggregatingMergeTree
ORDER BY (game_id, user_id);

CREATE MATERIALIZED VIEW user_scores_mv
TO user_scores_agg
AS
SELECT
    game_id,
    user_id,
    sumState(score_delta) AS total_score,
    countState() AS event_count
FROM score_events
GROUP BY game_id, user_id;
```

## Querying the Leaderboard

```sql
SELECT
    user_id,
    sumMerge(total_score) AS score,
    countMerge(event_count) AS actions,
    rank() OVER (ORDER BY sumMerge(total_score) DESC) AS rank
FROM user_scores_agg
WHERE game_id = 1001
GROUP BY game_id, user_id
ORDER BY score DESC
LIMIT 100;
```

## Time-Windowed Leaderboard

For weekly or daily leaderboards, use a time-partitioned approach:

```sql
CREATE TABLE weekly_scores (
    week_start Date,
    game_id UInt32,
    user_id UInt64,
    weekly_score AggregateFunction(sum, Int32)
) ENGINE = AggregatingMergeTree
ORDER BY (week_start, game_id, user_id);

CREATE MATERIALIZED VIEW weekly_scores_mv
TO weekly_scores
AS
SELECT
    toMonday(event_time) AS week_start,
    game_id,
    user_id,
    sumState(score_delta) AS weekly_score
FROM score_events
GROUP BY week_start, game_id, user_id;

-- Query top 10 this week
SELECT
    user_id,
    sumMerge(weekly_score) AS score
FROM weekly_scores
WHERE game_id = 1001
    AND week_start = toMonday(today())
GROUP BY user_id
ORDER BY score DESC
LIMIT 10;
```

## Finding a User's Rank

Get a specific user's position on the leaderboard:

```sql
SELECT
    rank
FROM (
    SELECT
        user_id,
        sumMerge(total_score) AS score,
        rank() OVER (ORDER BY score DESC) AS rank
    FROM user_scores_agg
    WHERE game_id = 1001
    GROUP BY user_id
)
WHERE user_id = 42;
```

## Around-the-User Leaderboard

Show 5 players above and below a given user:

```sql
WITH ranked AS (
    SELECT
        user_id,
        sumMerge(total_score) AS score,
        rank() OVER (ORDER BY sumMerge(total_score) DESC) AS rank
    FROM user_scores_agg
    WHERE game_id = 1001
    GROUP BY user_id
),
my_rank AS (
    SELECT rank FROM ranked WHERE user_id = 42
)
SELECT r.user_id, r.score, r.rank
FROM ranked r, my_rank m
WHERE r.rank BETWEEN m.rank - 5 AND m.rank + 5
ORDER BY r.rank;
```

## API Layer Caching

For game leaderboards updated every second, cache the top-100 result in Redis with a 1-second TTL:

```python
import redis
import json

cache = redis.Redis(host='redis.internal')

def get_leaderboard(game_id: int) -> list:
    key = f'leaderboard:{game_id}'
    cached = cache.get(key)
    if cached:
        return json.loads(cached)

    rows = ch.query(f'''
        SELECT user_id, sumMerge(total_score) AS score
        FROM user_scores_agg
        WHERE game_id = {game_id}
        GROUP BY user_id
        ORDER BY score DESC
        LIMIT 100
    ''').named_results()

    cache.setex(key, 1, json.dumps(rows))
    return rows
```

## Summary

ClickHouse real-time leaderboards use AggregatingMergeTree to precompute running totals as events arrive, enabling sub-second top-N queries over millions of users. Use time-partitioned materialized views for windowed leaderboards, window functions for rank calculations, and a Redis cache layer to absorb burst read traffic while ClickHouse handles the heavy aggregation.
