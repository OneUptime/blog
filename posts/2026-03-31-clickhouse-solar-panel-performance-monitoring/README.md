# How to Build Solar Panel Performance Monitoring with ClickHouse

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: ClickHouse, Solar, Renewable Energy, Monitoring, IoT, Time Series

Description: Use ClickHouse to store and analyze solar panel telemetry, calculate performance ratios, and detect degrading or underperforming panels.

---

## Why ClickHouse for Solar Monitoring

A utility-scale solar farm with 10,000 panels reporting every minute generates over 5 billion rows per year. ClickHouse handles this with compressed columnar storage and fast aggregations, making it possible to identify underperforming strings, calculate performance ratios, and correlate output with irradiance - all in real time.

## Schema Design

```sql
CREATE TABLE solar_telemetry
(
    panel_id         UInt32,
    string_id        UInt16,
    inverter_id      UInt16,
    recorded_at      DateTime,
    dc_voltage_v     Float32,
    dc_current_a     Float32,
    dc_power_w       Float32,
    ac_power_w       Float32,
    irradiance_wm2   Float32,
    temperature_c    Float32,
    efficiency_pct   Float32
)
ENGINE = MergeTree()
PARTITION BY toYYYYMM(recorded_at)
ORDER BY (inverter_id, panel_id, recorded_at)
TTL recorded_at + INTERVAL 5 YEAR;
```

## Performance Ratio Calculation

Performance ratio (PR) compares actual output to theoretical maximum given the irradiance:

```sql
SELECT
    panel_id,
    toDate(recorded_at)                               AS day,
    sum(ac_power_w)                                   AS actual_wh,
    sum(irradiance_wm2 * 0.001 * 1)                   AS theoretical_wh,
    round(sum(ac_power_w) / nullIf(sum(irradiance_wm2 * 0.001 * 1), 0) * 100, 2) AS pr_pct
FROM solar_telemetry
WHERE recorded_at >= today() - INTERVAL 30 DAY
  AND irradiance_wm2 > 50
GROUP BY panel_id, day
ORDER BY pr_pct ASC
LIMIT 20;
```

## Underperforming Panel Detection

```sql
WITH panel_avg AS (
    SELECT
        panel_id,
        avg(efficiency_pct) AS avg_efficiency
    FROM solar_telemetry
    WHERE recorded_at >= today() - INTERVAL 7 DAY
      AND irradiance_wm2 > 200
    GROUP BY panel_id
),
farm_avg AS (
    SELECT avg(avg_efficiency) AS farm_efficiency
    FROM panel_avg
)
SELECT
    p.panel_id,
    round(p.avg_efficiency, 2) AS panel_efficiency,
    round(f.farm_efficiency, 2) AS farm_avg,
    round(f.farm_efficiency - p.avg_efficiency, 2) AS gap
FROM panel_avg p
CROSS JOIN farm_avg f
WHERE p.avg_efficiency < f.farm_efficiency * 0.85
ORDER BY gap DESC;
```

## Daily Energy Production by Inverter

```sql
SELECT
    inverter_id,
    toDate(recorded_at)              AS day,
    round(sum(ac_power_w) / 1000, 2) AS kwh_produced
FROM solar_telemetry
WHERE recorded_at >= today() - INTERVAL 90 DAY
GROUP BY inverter_id, day
ORDER BY inverter_id, day;
```

## Temperature vs Efficiency Correlation

Higher temperatures reduce efficiency. Quantify this relationship:

```sql
SELECT
    round(temperature_c / 5) * 5 AS temp_bucket,
    count()                       AS samples,
    round(avg(efficiency_pct), 2) AS avg_efficiency
FROM solar_telemetry
WHERE recorded_at >= today() - INTERVAL 90 DAY
  AND irradiance_wm2 > 300
GROUP BY temp_bucket
ORDER BY temp_bucket;
```

## Materialized View for String-Level Daily Summary

```sql
CREATE TABLE solar_string_daily
(
    string_id   UInt16,
    day         Date,
    kwh         SimpleAggregateFunction(sum, Float64),
    avg_pr      AggregateFunction(avg, Float32)
)
ENGINE = AggregatingMergeTree()
ORDER BY (string_id, day);

CREATE MATERIALIZED VIEW solar_string_daily_mv TO solar_string_daily AS
SELECT
    string_id,
    toDate(recorded_at) AS day,
    sum(ac_power_w) / 1000 AS kwh,
    avgState(efficiency_pct)    AS avg_pr
FROM solar_telemetry
GROUP BY string_id, day;
```

To query the materialized view, use `avgMerge` to finalize the average:

```sql
SELECT
    string_id,
    day,
    kwh,
    round(avgMerge(avg_pr), 2) AS avg_pr
FROM solar_string_daily
GROUP BY string_id, day, kwh
ORDER BY string_id, day;
```

## Summary

ClickHouse provides solar operators with an efficient foundation to store high-frequency panel telemetry, detect underperformers using statistical comparisons, correlate output with environmental conditions, and power real-time dashboards. Materialized views keep dashboard queries fast without re-scanning billions of raw rows.
