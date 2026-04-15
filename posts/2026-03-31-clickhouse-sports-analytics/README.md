# How to Use ClickHouse for Sports Analytics

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: ClickHouse, Sports Analytics, Player Performance, Game Data, Metric

Description: Build sports analytics pipelines with ClickHouse to analyze player performance, game statistics, team trends, and fan engagement metrics at scale.

---

## Sports Analytics Data at Scale

Modern sports generate enormous volumes of data: player tracking (25 frames per second per player), play-by-play events, biometric data, and fan engagement metrics. ClickHouse's ability to ingest high-frequency time-series data and return aggregation results in milliseconds makes it the right engine for sports analytics.

## Event Data Schema

```sql
CREATE TABLE game_events
(
    event_time DateTime64(3),
    game_id UInt32,
    season UInt16,
    week UInt8,
    sport LowCardinality(String),
    league LowCardinality(String),
    home_team_id UInt32,
    away_team_id UInt32,
    player_id UInt64,
    team_id UInt32,
    event_type LowCardinality(String),
    position LowCardinality(String),
    x_coord Float32,
    y_coord Float32,
    success UInt8,
    value Float32
)
ENGINE = MergeTree
PARTITION BY (sport, season)
ORDER BY (league, team_id, player_id, event_time);
```

## Player Performance Summary

```sql
SELECT
    player_id,
    team_id,
    count() AS total_events,
    countIf(event_type = 'shot') AS shots,
    countIf(event_type = 'shot' AND success = 1) AS goals,
    round(countIf(event_type = 'shot' AND success = 1) /
          nullIf(countIf(event_type = 'shot'), 0) * 100, 1) AS shot_accuracy_pct,
    countIf(event_type = 'pass') AS passes,
    round(countIf(event_type = 'pass' AND success = 1) /
          nullIf(countIf(event_type = 'pass'), 0) * 100, 1) AS pass_accuracy_pct
FROM game_events
WHERE season = 2025
  AND sport = 'soccer'
GROUP BY player_id, team_id
ORDER BY goals DESC
LIMIT 20;
```

## Team Performance Trends

```sql
-- Rolling 5-game performance window
SELECT
    team_id,
    game_id,
    total_score,
    avg(total_score) OVER (
        PARTITION BY team_id
        ORDER BY game_id
        ROWS BETWEEN 4 PRECEDING AND CURRENT ROW
    ) AS rolling_5_game_avg
FROM
(
    SELECT
        team_id,
        game_id,
        sum(value) AS total_score
    FROM game_events
    WHERE event_type = 'score'
      AND season = 2025
    GROUP BY team_id, game_id
)
ORDER BY team_id, game_id;
```

## Heat Map Data - Shot Locations

```sql
-- Shot distribution across field zones
SELECT
    player_id,
    round(x_coord / 10) * 10 AS zone_x,
    round(y_coord / 10) * 10 AS zone_y,
    count() AS shots,
    sum(success) AS goals,
    round(sum(success) / count() * 100, 1) AS conversion_pct
FROM game_events
WHERE event_type = 'shot'
  AND season = 2025
  AND player_id = 12345
GROUP BY player_id, zone_x, zone_y
ORDER BY shots DESC;
```

## Fan Engagement Analytics

```sql
CREATE TABLE fan_engagement
(
    event_time DateTime,
    fan_id UInt64,
    team_id UInt32,
    game_id UInt32,
    channel LowCardinality(String),
    action LowCardinality(String),
    duration_sec UInt32
)
ENGINE = MergeTree
PARTITION BY toYYYYMM(event_time)
ORDER BY (team_id, game_id, fan_id, event_time);
```

```sql
-- Peak engagement moments during games
SELECT
    game_id,
    toStartOfMinute(event_time) AS game_minute,
    count() AS engagement_events,
    countDistinct(fan_id) AS unique_fans
FROM fan_engagement
WHERE game_id = 9876
GROUP BY game_id, game_minute
ORDER BY engagement_events DESC
LIMIT 10;
```

## Summary

ClickHouse handles sports analytics workloads from high-frequency player tracking to aggregated performance statistics. The MergeTree engine partitioned by sport and season with window functions for rolling averages delivers the real-time and historical reporting sports analytics teams need. Use ClickHouse for player performance dashboards, team trend analysis, spatial heat maps, and fan engagement tracking.
