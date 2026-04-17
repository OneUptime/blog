# How to Analyze Game Telemetry Data with ClickHouse

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: ClickHouse, Game Analytics, Telemetry, Gaming, Player Analytics

Description: Ingest and analyze game telemetry events in ClickHouse including player sessions, match outcomes, economy transactions, and funnel analytics for live service games.

## Introduction

Live service games generate one of the richest event streams in any software domain: player position updates, combat interactions, economy transactions, session starts and ends, matchmaking results, tutorial completions, and in-app purchases. Game analytics teams use this data to measure engagement, balance game economies, track progression, and run live operations events.

ClickHouse is widely used in the games industry because its write throughput can absorb millions of events per second across a large player base, and its query latency is low enough for interactive dashboards that game designers and live ops teams use daily.

## Schema Design

### Player Sessions

```sql
CREATE TABLE player_sessions
(
    session_id      String,
    player_id       String,
    game_id         LowCardinality(String),
    platform        LowCardinality(String),  -- PC, PlayStation, Xbox, Mobile
    region          LowCardinality(String),
    started_at      DateTime64(3),
    ended_at        Nullable(DateTime64(3)),
    duration_sec    UInt32,
    client_version  LowCardinality(String),
    is_new_player   UInt8
)
ENGINE = MergeTree()
PARTITION BY toYYYYMM(started_at)
ORDER BY (game_id, player_id, started_at);
```

### Match Events

```sql
CREATE TABLE match_events
(
    match_id        String,
    player_id       String,
    game_id         LowCardinality(String),
    game_mode       LowCardinality(String),  -- ranked, casual, tournament
    started_at      DateTime,
    ended_at        DateTime,
    duration_sec    UInt32,
    result          LowCardinality(String),  -- win, loss, draw, abandoned
    kills           UInt16,
    deaths          UInt16,
    assists         UInt16,
    score           Int32,
    map_id          LowCardinality(String),
    rank_before     UInt16,
    rank_after      UInt16
)
ENGINE = MergeTree()
PARTITION BY toYYYYMM(started_at)
ORDER BY (game_id, game_mode, player_id, started_at);
```

### Economy Transactions

```sql
CREATE TABLE economy_transactions
(
    transaction_id  UUID DEFAULT generateUUIDv4(),
    occurred_at     DateTime64(3),
    player_id       String,
    game_id         LowCardinality(String),
    transaction_type LowCardinality(String), -- earn, spend, purchase, refund
    currency        LowCardinality(String),  -- gold, gems, credits, real_money
    amount          Int64,                   -- negative for spend
    item_id         LowCardinality(String),
    item_category   LowCardinality(String),  -- cosmetic, consumable, battle_pass
    source          LowCardinality(String),  -- quest, match_reward, store, event
    platform        LowCardinality(String)
)
ENGINE = MergeTree()
PARTITION BY toYYYYMM(occurred_at)
ORDER BY (game_id, player_id, occurred_at);
```

### Player Progression Events

```sql
CREATE TABLE player_progression
(
    event_id        UUID DEFAULT generateUUIDv4(),
    occurred_at     DateTime,
    player_id       String,
    game_id         LowCardinality(String),
    event_type      LowCardinality(String),  -- level_up, achievement, quest_complete, tutorial_step
    entity_type     LowCardinality(String),  -- player, character, weapon
    entity_id       LowCardinality(String),
    from_value      UInt32,
    to_value        UInt32,
    context         Map(String, String)
)
ENGINE = MergeTree()
PARTITION BY toYYYYMM(occurred_at)
ORDER BY (game_id, player_id, occurred_at);
```

## Daily Active Users and Session Metrics

```sql
SELECT
    toDate(started_at)     AS day,
    game_id,
    count(DISTINCT player_id) AS dau,
    count()                AS sessions,
    avg(duration_sec) / 60 AS avg_session_min,
    median(duration_sec) / 60 AS median_session_min,
    sum(duration_sec) / 3600  AS total_hours_played
FROM player_sessions
WHERE started_at >= now() - INTERVAL 30 DAY
GROUP BY day, game_id
ORDER BY day DESC, game_id;
```

## Player Retention (Day 1, 7, 30)

```sql
WITH new_players AS (
    SELECT player_id, min(toDate(started_at)) AS install_date
    FROM player_sessions
    WHERE game_id = 'game-alpha'
    GROUP BY player_id
    HAVING install_date >= today() - 30
)
SELECT
    n.install_date,
    uniq(n.player_id)                                                    AS installs,
    uniqIf(s.player_id, toDate(s.started_at) = n.install_date + 1)       AS d1_retained,
    uniqIf(s.player_id, toDate(s.started_at) = n.install_date + 7)       AS d7_retained,
    uniqIf(s.player_id, toDate(s.started_at) = n.install_date + 30)      AS d30_retained
FROM new_players AS n
LEFT JOIN player_sessions AS s ON n.player_id = s.player_id
GROUP BY n.install_date
ORDER BY n.install_date;
```

## Win Rate by Map and Game Mode

```sql
SELECT
    map_id,
    game_mode,
    count()                                 AS matches,
    countIf(result = 'win')                 AS wins,
    countIf(result = 'abandoned')           AS abandons,
    round(countIf(result = 'win') / countIf(result IN ('win','loss')) * 100, 2) AS win_rate_pct,
    avg(duration_sec) / 60                  AS avg_match_min
FROM match_events
WHERE started_at >= now() - INTERVAL 7 DAY
GROUP BY map_id, game_mode
ORDER BY game_mode, win_rate_pct DESC;
```

## Kill/Death Ratio Distribution

```sql
SELECT
    multiIf(
        kills / nullIf(deaths, 0) < 0.5,  'Below 0.5',
        kills / nullIf(deaths, 0) < 1.0,  '0.5 - 1.0',
        kills / nullIf(deaths, 0) < 1.5,  '1.0 - 1.5',
        kills / nullIf(deaths, 0) < 2.0,  '1.5 - 2.0',
        kills / nullIf(deaths, 0) < 3.0,  '2.0 - 3.0',
        '3.0+'
    ) AS kd_bucket,
    count()  AS player_count
FROM match_events
WHERE started_at >= now() - INTERVAL 7 DAY
  AND game_mode = 'ranked'
GROUP BY kd_bucket
ORDER BY kd_bucket;
```

## Economy Sink vs Source Balance

Track whether your in-game economy is balanced. More spending than earning can indicate a healthy economy but too much earning with too little spending causes inflation:

```sql
SELECT
    currency,
    toDate(occurred_at)                        AS day,
    sumIf(amount, amount > 0)                  AS earned,
    sumIf(abs(amount), amount < 0)             AS spent,
    sum(amount)                                AS net_flow,
    sumIf(amount, transaction_type = 'purchase') AS real_money_in
FROM economy_transactions
WHERE occurred_at >= now() - INTERVAL 30 DAY
GROUP BY currency, day
ORDER BY currency, day;
```

## Top Spenders and Spending Categories

```sql
SELECT
    player_id,
    currency,
    abs(sum(amount))             AS total_spent,
    count()                      AS transactions,
    topK(3)(item_category)       AS top_categories
FROM economy_transactions
WHERE transaction_type = 'spend'
  AND occurred_at >= toStartOfMonth(now())
GROUP BY player_id, currency
ORDER BY total_spent DESC
LIMIT 50;
```

## Tutorial Funnel Drop-off

```sql
WITH tutorial_steps AS (
    SELECT player_id, entity_id AS step, min(occurred_at) AS completed_at
    FROM player_progression
    WHERE event_type = 'tutorial_step'
      AND game_id = 'game-alpha'
    GROUP BY player_id, step
)
SELECT
    step,
    players_reached,
    players_reached / max(players_reached) OVER () * 100 AS retention_pct
FROM (
    SELECT step, uniq(player_id) AS players_reached
    FROM tutorial_steps
    GROUP BY step
)
ORDER BY step;
```

## Level Distribution Across Player Base

```sql
SELECT
    multiIf(
        to_value BETWEEN 1 AND 9,   '1-9',
        to_value BETWEEN 10 AND 29, '10-29',
        to_value BETWEEN 30 AND 49, '30-49',
        to_value BETWEEN 50 AND 74, '50-74',
        to_value >= 75,             '75+'
    ) AS level_range,
    count(DISTINCT player_id) AS players
FROM (
    SELECT player_id, max(to_value) AS to_value
    FROM player_progression
    WHERE event_type = 'level_up'
      AND entity_type = 'player'
      AND game_id = 'game-alpha'
    GROUP BY player_id
)
GROUP BY level_range
ORDER BY level_range;
```

## Live Event Participation Funnel

```sql
SELECT
    context['event_id']                         AS live_event,
    countIf(event_type = 'event_start')         AS started,
    countIf(event_type = 'event_checkpoint')    AS reached_checkpoint,
    countIf(event_type = 'event_complete')      AS completed,
    round(countIf(event_type = 'event_complete') /
        countIf(event_type = 'event_start') * 100, 2) AS completion_rate_pct
FROM player_progression
WHERE occurred_at >= now() - INTERVAL 7 DAY
  AND context['event_id'] != ''
GROUP BY live_event
ORDER BY started DESC;
```

## Materialized View for Hourly DAU

```sql
CREATE MATERIALIZED VIEW hourly_dau_mv
ENGINE = AggregatingMergeTree()
PARTITION BY toYYYYMM(hour)
ORDER BY (game_id, platform, hour)
AS
SELECT
    game_id,
    platform,
    toStartOfHour(started_at)     AS hour,
    uniqState(player_id)          AS dau_state,
    countState()                  AS sessions_state,
    sumState(duration_sec)        AS total_duration_state
FROM player_sessions
GROUP BY game_id, platform, hour;
```

Query it for live operations dashboards:

```sql
SELECT
    hour,
    platform,
    uniqMerge(dau_state)            AS active_players,
    countMerge(sessions_state)      AS sessions,
    sumMerge(total_duration_state) / 3600 AS hours_played
FROM hourly_dau_mv
WHERE game_id = 'game-alpha'
  AND hour >= now() - INTERVAL 24 HOUR
GROUP BY hour, platform
ORDER BY hour;
```

## Conclusion

ClickHouse handles game telemetry at the scale that live service titles require. Its high ingest throughput absorbs event bursts during peak play hours, while its query performance enables game designers and analysts to iterate quickly on balance changes, live event design, and monetization analysis. Materialized views keep dashboards fast without re-scanning billions of raw events on every page load.

**Related Reading:**

- [How to Detect Anomalies in Time-Series Data with ClickHouse](https://oneuptime.com/blog/post/2026-03-31-clickhouse-anomaly-detection-time-series/view)
- [What Is ClickHouse MergeTree and How It Works](https://oneuptime.com/blog/post/2026-03-31-clickhouse-mergetree-explained/view)
- [What Is TTL in ClickHouse and How Data Lifecycle Works](https://oneuptime.com/blog/post/2026-03-31-clickhouse-ttl-data-lifecycle/view)
