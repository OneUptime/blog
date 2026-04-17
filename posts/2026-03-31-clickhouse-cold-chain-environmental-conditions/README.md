# How to Track Environmental Conditions in Cold Chain with ClickHouse

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: ClickHouse, Cold Chain, Logistics, IoT, Temperature Monitoring

Description: Monitor cold chain temperature, humidity, and excursion events in ClickHouse to protect product integrity and demonstrate regulatory compliance.

---

Cold chain logistics requires continuous monitoring of temperature and humidity from manufacturing through final delivery. A single temperature excursion can compromise an entire shipment of vaccines, pharmaceuticals, or perishables. ClickHouse provides the time-series query capabilities needed to detect excursions in real time and reconstruct condition history for compliance audits.

## Environmental Sensor Table

```sql
CREATE TABLE cold_chain_sensors (
    reading_id      UUID,
    device_id       UInt32,
    shipment_id     UInt64,
    asset_type      LowCardinality(String),  -- 'container', 'truck', 'warehouse_zone'
    product_class   LowCardinality(String),  -- 'frozen', 'refrigerated', 'ambient'
    recorded_at     DateTime,
    temp_c          Float32,
    humidity_pct    Float32,
    co2_ppm         Float32,
    door_open       UInt8,
    battery_pct     Float32,
    signal_strength Float32
) ENGINE = MergeTree()
ORDER BY (device_id, recorded_at)
PARTITION BY toYYYYMM(recorded_at)
TTL recorded_at + INTERVAL 7 YEAR;
```

A 7-year TTL supports pharmaceutical regulatory retention requirements.

## Temperature Excursion Detection

```sql
SELECT
    device_id,
    shipment_id,
    recorded_at,
    temp_c,
    product_class
FROM cold_chain_sensors
WHERE recorded_at >= now() - INTERVAL 24 HOUR
  AND (
    (product_class = 'frozen'       AND temp_c > -15) OR
    (product_class = 'refrigerated' AND (temp_c > 8 OR temp_c < 2)) OR
    (product_class = 'ambient'      AND (temp_c > 25 OR temp_c < 15))
  )
ORDER BY recorded_at DESC
LIMIT 50;
```

## Excursion Duration per Shipment

```sql
SELECT
    shipment_id,
    product_class,
    countIf(
        (product_class = 'refrigerated' AND (temp_c > 8 OR temp_c < 2))
    ) AS excursion_readings,
    min(recorded_at) AS trip_start,
    max(recorded_at) AS trip_end
FROM cold_chain_sensors
WHERE shipment_id = 98765
GROUP BY shipment_id, product_class;
```

## Mean Kinetic Temperature Calculation

MKT is the regulatory standard for assessing cumulative thermal stress.

```sql
SELECT
    shipment_id,
    round(
        (-83144.0 / ln(
            avg(exp(-83144.0 / (8.314 * (temp_c + 273.15))))
        )) - 273.15,
        2
    ) AS mkt_celsius
FROM cold_chain_sensors
WHERE shipment_id = 98765
GROUP BY shipment_id;
```

## Humidity Excursion Summary

```sql
SELECT
    device_id,
    toDate(recorded_at)  AS day,
    countIf(humidity_pct > 75 OR humidity_pct < 30) AS humidity_excursions,
    round(avg(humidity_pct), 1)                      AS avg_humidity
FROM cold_chain_sensors
WHERE recorded_at >= today() - 7
GROUP BY device_id, day
HAVING humidity_excursions > 0
ORDER BY humidity_excursions DESC;
```

## Battery and Connectivity Alerts

```sql
SELECT
    device_id,
    battery_pct,
    signal_strength,
    recorded_at
FROM cold_chain_sensors
WHERE recorded_at >= now() - INTERVAL 1 HOUR
  AND (battery_pct < 15 OR signal_strength < -90)
ORDER BY battery_pct ASC
LIMIT 20;
```

## Compliance Report - Shipment Temperature Summary

```sql
SELECT
    shipment_id,
    min(temp_c)                               AS min_temp,
    max(temp_c)                               AS max_temp,
    round(avg(temp_c), 2)                     AS avg_temp,
    countIf(temp_c > 8 OR temp_c < 2)         AS excursion_count,
    count()                                   AS total_readings
FROM cold_chain_sensors
WHERE product_class = 'refrigerated'
  AND recorded_at >= today() - 30
GROUP BY shipment_id
ORDER BY excursion_count DESC
LIMIT 20;
```

## Summary

ClickHouse is an excellent time-series store for cold chain monitoring data. Long TTL retention supports pharmaceutical compliance requirements, the excursion detection queries run in real time over high-frequency sensor data, and the Mean Kinetic Temperature calculation enables regulatory-compliant quality assessments directly in SQL - without exporting data to specialized tools.
