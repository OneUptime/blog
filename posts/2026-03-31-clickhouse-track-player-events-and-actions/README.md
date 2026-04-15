# How to Track Player Events and Actions in ClickHouse

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: ClickHouse, Player Event, Game Telemetry, Event Tracking, Gaming Analytics

Description: Learn how to design a schema and write queries to track player events and actions in ClickHouse for game telemetry analytics.

---

Every tap, kill, purchase, and level completion tells you something about the player experience. Collecting and querying player action events in ClickHouse enables game designers to balance content, detect bugs, and understand what keeps players engaged.

## Player Actions Schema

```sql
CREATE TABLE player_actions (
    event_time          DateTime64(3),
    player_id           UInt64,
    session_id          String,
    game_id             UInt32,
    action_type         LowCardinality(String),
    action_target       String,
    x_position          Float32,
    y_position          Float32,
    health_at_action    UInt8,
    level_id            UInt16,
    sequence_num        UInt32,
    date                Date DEFAULT toDate(event_time)
) ENGINE = MergeTree()
PARTITION BY date
ORDER BY (game_id, player_id, session_id, sequence_num);
```

## Most Common Player Actions

```sql
SELECT
    action_type,
    count() AS total,
    uniq(player_id) AS unique_players
FROM player_actions
WHERE date = today()
GROUP BY action_type
ORDER BY total DESC
LIMIT 20;
```

## Player Action Frequency Per Session

```sql
SELECT
    action_type,
    round(avg(actions_per_session), 2) AS avg_per_session
FROM (
    SELECT
        session_id,
        action_type,
        count() AS actions_per_session
    FROM player_actions
    WHERE date = today()
    GROUP BY session_id, action_type
)
GROUP BY action_type
ORDER BY avg_per_session DESC;
```

## Heatmap Data: Action Positions

Aggregate player action positions for spatial heatmap generation:

```sql
SELECT
    level_id,
    action_type,
    round(x_position / 10) * 10 AS x_bucket,
    round(y_position / 10) * 10 AS y_bucket,
    count() AS count
FROM player_actions
WHERE date >= today() - 7
  AND action_type = 'death'
GROUP BY level_id, action_type, x_bucket, y_bucket
ORDER BY count DESC
LIMIT 1000;
```

## Action Sequences Leading to Failure

Find which action sequences precede a player dying:

```sql
SELECT
    groupArray(action_type) AS action_sequence,
    count() AS occurrences
FROM (
    SELECT
        player_id,
        session_id,
        groupArray(action_type) AS action_sequence
    FROM (
        SELECT
            player_id,
            session_id,
            action_type,
            sequence_num
        FROM player_actions
        WHERE date = today()
          AND (player_id, session_id, sequence_num) IN (
              SELECT player_id, session_id, sequence_num - 1
              FROM player_actions
              WHERE action_type = 'death' AND date = today()
          )
        ORDER BY player_id, session_id, sequence_num
    )
    GROUP BY player_id, session_id
)
GROUP BY action_sequence
ORDER BY occurrences DESC
LIMIT 20;
```

## Actions Per Minute by Level

Understand engagement intensity across levels:

```sql
SELECT
    level_id,
    player_id,
    count() / dateDiff('minute', min(event_time), max(event_time)) AS actions_per_min
FROM player_actions
WHERE date = today()
GROUP BY level_id, player_id
HAVING dateDiff('minute', min(event_time), max(event_time)) > 0;
```

## Summary

ClickHouse's sequential ordering by player, session, and action sequence number enables efficient replay and analysis of in-game behavior. Spatial aggregation for heatmaps, action-sequence pattern mining, and per-level intensity metrics all run in seconds over days of raw event data.
