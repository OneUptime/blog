# How to Analyze Fleet Management Data in ClickHouse

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: ClickHouse, Fleet, Telematics, GPS, Analytics, Logistics

Description: Analyze fleet telematics data in ClickHouse - track vehicle utilization, fuel efficiency, driver behavior, and maintenance triggers across your fleet.

---

Fleet management systems generate continuous GPS pings, engine diagnostics, and event alerts. ClickHouse can ingest and analyze this high-volume telematics data to optimize fleet operations.

## Telematics Events Table

```sql
CREATE TABLE fleet_telemetry (
    vehicle_id   LowCardinality(String),
    driver_id    LowCardinality(String),
    fleet_id     LowCardinality(String),
    latitude     Float32,
    longitude    Float32,
    speed_kmh    Float32,
    heading      Float32,
    odometer_km  Float64,
    fuel_level   Float32,  -- percent
    engine_on    UInt8,
    event_type   LowCardinality(String),  -- gps_ping, harsh_brake, harsh_accel, idle, geofence_enter
    recorded_at  DateTime64(3)
) ENGINE = MergeTree()
PARTITION BY toYYYYMMDD(recorded_at)
ORDER BY (vehicle_id, recorded_at);
```

## Vehicle Utilization by Day

```sql
SELECT
    vehicle_id,
    toDate(recorded_at) AS day,
    sumIf(1, engine_on = 1) * 10 / 3600.0 AS engine_hours,  -- 10s ping interval
    max(odometer_km) - min(odometer_km) AS km_driven
FROM fleet_telemetry
WHERE recorded_at >= today() - 30
  AND event_type = 'gps_ping'
GROUP BY vehicle_id, day
ORDER BY vehicle_id, day;
```

## Speeding Events

Identify vehicles and drivers with excessive speeding:

```sql
SELECT
    vehicle_id,
    driver_id,
    count() AS speeding_events,
    avg(speed_kmh) AS avg_speed_when_speeding,
    max(speed_kmh) AS max_speed
FROM fleet_telemetry
WHERE speed_kmh > 120  -- km/h threshold
  AND recorded_at >= today() - 7
GROUP BY vehicle_id, driver_id
ORDER BY speeding_events DESC;
```

## Harsh Driving Events Per Driver

Score drivers on safety events:

```sql
SELECT
    driver_id,
    countIf(event_type = 'harsh_brake') AS harsh_brakes,
    countIf(event_type = 'harsh_accel') AS harsh_accelerations,
    countIf(event_type = 'harsh_brake') + countIf(event_type = 'harsh_accel') AS total_events,
    max(odometer_km) - min(odometer_km) AS km_driven,
    round((countIf(event_type = 'harsh_brake') + countIf(event_type = 'harsh_accel'))
        / nullIf(max(odometer_km) - min(odometer_km), 0) * 100, 3) AS events_per_100km
FROM fleet_telemetry
WHERE recorded_at >= today() - 30
GROUP BY driver_id
ORDER BY events_per_100km DESC;
```

## Idle Time Analysis

Excessive idling wastes fuel - identify problem vehicles:

```sql
SELECT
    vehicle_id,
    toDate(recorded_at) AS day,
    countIf(event_type = 'idle') * 10 / 60.0 AS idle_minutes,
    countIf(engine_on = 1) * 10 / 60.0 AS total_engine_minutes,
    round(idle_minutes / nullIf(total_engine_minutes, 0) * 100, 2) AS idle_pct
FROM fleet_telemetry
WHERE recorded_at >= today() - 7
GROUP BY vehicle_id, day
HAVING idle_pct > 20
ORDER BY idle_pct DESC;
```

## Maintenance Odometer Trigger

Flag vehicles due for service based on odometer intervals:

```sql
SELECT
    vehicle_id,
    max(odometer_km) AS current_odometer,
    floor(max(odometer_km) / 10000) * 10000 AS last_service_km,
    (floor(max(odometer_km) / 10000) + 1) * 10000 AS next_service_km,
    (floor(max(odometer_km) / 10000) + 1) * 10000 - max(odometer_km) AS km_to_service
FROM fleet_telemetry
WHERE recorded_at >= today() - 1
GROUP BY vehicle_id
HAVING km_to_service < 500
ORDER BY km_to_service;
```

## Summary

ClickHouse handles the continuous stream of fleet telematics data efficiently, enabling real-time analytics on vehicle utilization, driver safety scores, idle time, and maintenance schedules. Its high-ingestion throughput and fast aggregation capabilities make it ideal for fleets of any size.
