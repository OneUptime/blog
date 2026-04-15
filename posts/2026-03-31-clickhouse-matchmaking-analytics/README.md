# How to Build Matchmaking Analytics with ClickHouse

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: ClickHouse, Matchmaking, Gaming Analytics, Queue Time, Skill Balancing

Description: Analyze matchmaking performance in ClickHouse to optimize queue times, skill balance, and match quality across game modes.

---

Matchmaking is one of the most player-visible systems in online games. Long queues or unbalanced matches drive players away. ClickHouse lets you analyze matchmaking data to identify queue bottlenecks, skill imbalance, and regional disparities.

## Matchmaking Events Table

```sql
CREATE TABLE matchmaking_events (
    event_time          DateTime64(3),
    player_id           UInt64,
    match_id            String,
    game_mode           LowCardinality(String),
    region              LowCardinality(String),
    queue_time_s        UInt32,
    skill_rating        UInt16,
    team_id             UInt8,
    match_outcome       LowCardinality(String),
    skill_delta_avg     Float32,
    date                Date DEFAULT toDate(event_time)
) ENGINE = MergeTree()
PARTITION BY date
ORDER BY (game_mode, region, event_time);
```

## Average Queue Time by Game Mode and Region

```sql
SELECT
    game_mode,
    region,
    round(avg(queue_time_s), 1) AS avg_queue_s,
    quantile(0.95)(queue_time_s) AS p95_queue_s,
    count() AS matches
FROM matchmaking_events
WHERE date = today()
GROUP BY game_mode, region
ORDER BY avg_queue_s DESC;
```

## Queue Time Trend

Track whether queue times are improving or degrading:

```sql
SELECT
    toStartOfHour(event_time) AS hour,
    game_mode,
    round(avg(queue_time_s), 1) AS avg_queue_s,
    count() AS matches
FROM matchmaking_events
WHERE date = today()
GROUP BY hour, game_mode
ORDER BY hour, game_mode;
```

## Skill Balance in Matches

Measure how evenly matched games are by looking at the average skill difference between teams:

```sql
SELECT
    game_mode,
    round(avg(abs(skill_delta_avg)), 2) AS avg_skill_diff,
    round(quantile(0.95)(abs(skill_delta_avg)), 2) AS p95_skill_diff
FROM matchmaking_events
WHERE date >= today() - 7
GROUP BY game_mode
ORDER BY avg_skill_diff DESC;
```

## Long Queue Detection

Alert on game modes with abnormally long queues:

```sql
SELECT
    game_mode,
    region,
    count() AS players_in_queue,
    round(avg(queue_time_s), 0) AS current_avg_wait_s
FROM matchmaking_events
WHERE event_time >= now() - INTERVAL 5 MINUTE
  AND match_outcome = 'pending'
GROUP BY game_mode, region
HAVING current_avg_wait_s > 120
ORDER BY current_avg_wait_s DESC;
```

## Match Outcome by Skill Bracket

```sql
SELECT
    multiIf(skill_rating < 1000, 'bronze', skill_rating < 1500, 'silver',
            skill_rating < 2000, 'gold', 'diamond') AS bracket,
    countIf(match_outcome = 'win') AS wins,
    countIf(match_outcome = 'loss') AS losses,
    round(countIf(match_outcome = 'win') / count() * 100, 2) AS win_rate_pct
FROM matchmaking_events
WHERE date >= today() - 7
GROUP BY bracket
ORDER BY min(skill_rating);
```

## Summary

ClickHouse matchmaking analytics helps identify queue bottlenecks, skill imbalances, and regional dead zones. With per-hour trend analysis and real-time wait time monitoring, game operations teams can tune matchmaking parameters and allocate server capacity to reduce player friction.
