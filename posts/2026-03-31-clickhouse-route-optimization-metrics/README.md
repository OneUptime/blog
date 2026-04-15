# How to Track Route Optimization Metrics in ClickHouse

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: ClickHouse, Route Optimization, Logistics, Delivery, Analytics, Distance

Description: Track route optimization effectiveness in ClickHouse by comparing planned vs. actual routes, measuring adherence, and identifying inefficient delivery patterns.

---

Route optimization systems plan efficient delivery sequences, but reality often deviates from the plan. ClickHouse helps measure route adherence, identify inefficient patterns, and quantify the cost of deviations.

## Route Events Table

```sql
CREATE TABLE route_events (
    route_id     String,
    vehicle_id   LowCardinality(String),
    driver_id    LowCardinality(String),
    stop_seq     UInt16,
    stop_id      String,
    event_type   LowCardinality(String),  -- planned, arrived, departed, skipped
    planned_at   DateTime,
    actual_at    Nullable(DateTime),
    planned_km   Float32,
    actual_km    Nullable(Float32),
    stop_type    LowCardinality(String),  -- pickup, delivery, depot
    route_date   Date
) ENGINE = MergeTree()
PARTITION BY toYYYYMM(route_date)
ORDER BY (route_id, stop_seq, route_date);
```

## Route Completion Rate

```sql
SELECT
    route_date,
    driver_id,
    countIf(event_type = 'planned') AS planned_stops,
    countIf(event_type = 'departed') AS completed_stops,
    countIf(event_type = 'skipped') AS skipped_stops,
    round(countIf(event_type = 'departed') / countIf(event_type = 'planned') * 100, 2) AS completion_pct
FROM route_events
WHERE route_date >= today() - 30
GROUP BY route_date, driver_id
ORDER BY completion_pct;
```

## On-Time Stop Arrival Rate

```sql
SELECT
    driver_id,
    count() AS total_stops,
    countIf(actual_at <= planned_at) AS on_time_arrivals,
    countIf(actual_at > planned_at) AS late_arrivals,
    round(countIf(actual_at <= planned_at) / count() * 100, 2) AS on_time_pct,
    avg(dateDiff('minute', planned_at, actual_at)) AS avg_delay_minutes
FROM route_events
WHERE event_type = 'arrived'
  AND actual_at IS NOT NULL
  AND route_date >= today() - 30
GROUP BY driver_id
ORDER BY avg_delay_minutes DESC;
```

## Planned vs. Actual Distance

Measure how much further drivers actually travel vs. the optimized plan:

```sql
SELECT
    route_id,
    route_date,
    driver_id,
    sum(planned_km) AS total_planned_km,
    sum(actual_km) AS total_actual_km,
    sum(actual_km) - sum(planned_km) AS extra_km,
    round((sum(actual_km) - sum(planned_km)) / sum(planned_km) * 100, 2) AS deviation_pct
FROM route_events
WHERE actual_km IS NOT NULL
  AND route_date >= today() - 30
GROUP BY route_id, route_date, driver_id
HAVING deviation_pct > 10
ORDER BY extra_km DESC;
```

## Stop Time Variability

Identify stops that consistently take longer than planned:

```sql
SELECT
    stop_id,
    stop_type,
    count() AS visits,
    avg(dwell_minutes) AS avg_dwell_minutes
FROM (
    SELECT
        stop_id,
        stop_type,
        route_id,
        actual_at,
        dateDiff('minute', actual_at,
            leadInFrame(actual_at) OVER (
                PARTITION BY route_id
                ORDER BY stop_seq
                ROWS BETWEEN CURRENT ROW AND 1 FOLLOWING
            )
        ) AS dwell_minutes
    FROM route_events
    WHERE event_type = 'arrived'
      AND actual_at IS NOT NULL
      AND route_date >= today() - 30
)
WHERE dwell_minutes IS NOT NULL
GROUP BY stop_id, stop_type
ORDER BY avg_dwell_minutes DESC
LIMIT 50;
```

## Weekly Route Efficiency Trend

```sql
SELECT
    toStartOfWeek(route_date) AS week,
    round(avg(distance_ratio), 3) AS avg_distance_ratio,
    round(avg(completion_rate), 3) AS avg_completion_rate
FROM (
    SELECT
        route_id,
        route_date,
        sumIf(actual_km, actual_km IS NOT NULL) / nullIf(sumIf(planned_km, actual_km IS NOT NULL), 0) AS distance_ratio,
        countIf(event_type = 'departed') / nullIf(countIf(event_type = 'planned'), 0) AS completion_rate
    FROM route_events
    WHERE route_date >= today() - 90
    GROUP BY route_id, route_date
)
GROUP BY week
ORDER BY week;
```

## Summary

ClickHouse provides the analytics foundation for route optimization feedback loops - comparing planned vs. actual routes, measuring driver adherence, and identifying stops with high dwell times. These insights feed back into the routing engine to improve future plan quality.
