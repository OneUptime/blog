# How to Analyze Player Retention and Churn in ClickHouse

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: ClickHouse, Player Retention, Churn Analysis, Gaming Analytics, Cohort

Description: Analyze player retention and churn in ClickHouse using cohort queries to understand D1, D7, and D30 retention for your game.

---

Retention is the most important metric in gaming. Day 1 (D1), Day 7 (D7), and Day 30 (D30) retention rates determine whether a game has a sustainable player base. ClickHouse cohort queries make retention analysis efficient over millions of players.

## Player Sessions Table

```sql
CREATE TABLE player_sessions (
    session_start   DateTime,
    player_id       UInt64,
    game_id         UInt32,
    platform        LowCardinality(String),
    country         LowCardinality(String),
    date            Date DEFAULT toDate(session_start)
) ENGINE = MergeTree()
PARTITION BY date
ORDER BY (game_id, player_id, session_start);
```

## Cohort Retention Table

Pre-compute the first session date per player for cohort anchoring:

```sql
CREATE TABLE player_first_session AS
SELECT
    player_id,
    game_id,
    min(date) AS install_date
FROM player_sessions
GROUP BY player_id, game_id;
```

## D1, D7, D30 Retention by Cohort

```sql
SELECT
    install_date,
    count(DISTINCT p.player_id) AS cohort_size,
    round(countDistinctIf(s.player_id, dateDiff('day', p.install_date, s.date) = 1) /
          count(DISTINCT p.player_id) * 100, 2) AS d1_retention,
    round(countDistinctIf(s.player_id, dateDiff('day', p.install_date, s.date) = 7) /
          count(DISTINCT p.player_id) * 100, 2) AS d7_retention,
    round(countDistinctIf(s.player_id, dateDiff('day', p.install_date, s.date) = 30) /
          count(DISTINCT p.player_id) * 100, 2) AS d30_retention
FROM player_first_session AS p
LEFT JOIN player_sessions AS s ON p.player_id = s.player_id AND p.game_id = s.game_id
WHERE p.install_date >= today() - 60
GROUP BY install_date
ORDER BY install_date;
```

## Churn Risk Identification

Flag players who were active 7-14 days ago but not in the last 7 days:

```sql
SELECT
    player_id,
    max(date) AS last_seen
FROM player_sessions
WHERE game_id = 1
GROUP BY player_id
HAVING last_seen BETWEEN today() - 14 AND today() - 7;
```

## Retention Curve

Build a full retention curve from day 0 to day 30:

```sql
SELECT
    days_since_install,
    round(retained_players / cohort_size * 100, 2) AS retention_pct
FROM (
    SELECT
        d.days_since_install,
        count(DISTINCT p.player_id) AS cohort_size,
        countDistinctIf(s.player_id, dateDiff('day', p.install_date, s.date) = d.days_since_install) AS retained_players
    FROM player_first_session AS p
    CROSS JOIN (SELECT number AS days_since_install FROM numbers(31)) AS d
    LEFT JOIN player_sessions AS s ON p.player_id = s.player_id AND p.game_id = s.game_id
    WHERE p.install_date >= today() - 90 AND p.install_date <= today() - 30
    GROUP BY d.days_since_install
)
ORDER BY days_since_install;
```

## Retention by Platform

```sql
SELECT
    install_session.platform AS platform,
    install_date,
    count(DISTINCT p.player_id) AS cohort_size,
    round(countDistinctIf(s.player_id, dateDiff('day', p.install_date, s.date) = 7) /
          count(DISTINCT p.player_id) * 100, 2) AS d7_retention
FROM player_first_session AS p
JOIN player_sessions AS install_session ON p.player_id = install_session.player_id
  AND p.game_id = install_session.game_id
  AND install_session.date = p.install_date
LEFT JOIN player_sessions AS s ON p.player_id = s.player_id AND p.game_id = s.game_id
WHERE p.install_date >= today() - 60
GROUP BY install_session.platform, install_date
ORDER BY install_session.platform, install_date;
```

## Summary

ClickHouse cohort retention analysis uses the player's first session date as an anchor, then measures return visits at specific intervals. By combining `countDistinctIf` with `dateDiff`, you can compute the full retention curve across cohorts, platforms, and time periods in a single query.
