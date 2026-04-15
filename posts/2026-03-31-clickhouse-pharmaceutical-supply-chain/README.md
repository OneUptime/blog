# How to Track Pharmaceutical Supply Chain Metrics in ClickHouse

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: ClickHouse, Pharmaceutical, Supply Chain, Healthcare, Serialization

Description: Track drug serialization events, lot traceability, and distribution metrics in ClickHouse to ensure pharmaceutical supply chain integrity and compliance.

---

Pharmaceutical supply chain systems must track every drug unit from manufacturing through dispensing. Serialization regulations like DSCSA and FMD require end-to-end traceability. ClickHouse provides the analytical layer needed to query billions of serialization events quickly.

## Serialization Event Table

```sql
CREATE TABLE pharma_serialization (
    event_id        UUID,
    gtin            FixedString(14),   -- Global Trade Item Number
    serial_number   String,
    lot_number      LowCardinality(String),
    expiry_date     Date,
    event_type      LowCardinality(String),  -- 'commission', 'ship', 'receive', 'dispense', 'return', 'destroy'
    occurred_at     DateTime,
    location_id     UInt32,
    location_type   LowCardinality(String),  -- 'manufacturer', 'distributor', 'pharmacy', 'hospital'
    trading_partner UInt32,
    quantity        UInt32,
    is_suspect      UInt8
) ENGINE = MergeTree()
ORDER BY (gtin, serial_number, occurred_at)
PARTITION BY toYYYYMM(occurred_at);
```

## Units in Distribution by Drug

```sql
SELECT
    gtin,
    countIf(event_type = 'commission') - countIf(event_type = 'dispense') - countIf(event_type = 'destroy') AS units_in_distribution
FROM pharma_serialization
WHERE occurred_at >= today() - 365
GROUP BY gtin
ORDER BY units_in_distribution DESC
LIMIT 20;
```

## Expiring Stock Alert

```sql
SELECT
    gtin,
    lot_number,
    expiry_date,
    count() AS units
FROM (
    SELECT gtin, serial_number, lot_number, expiry_date, argMax(event_type, occurred_at) AS last_event
    FROM pharma_serialization
    GROUP BY gtin, serial_number, lot_number, expiry_date
)
WHERE last_event NOT IN ('dispense', 'destroy')
  AND expiry_date BETWEEN today() AND today() + 90
GROUP BY gtin, lot_number, expiry_date
ORDER BY expiry_date, gtin;
```

## Lot Traceability - Track a Lot Through the Chain

```sql
SELECT
    event_type,
    location_type,
    location_id,
    occurred_at,
    quantity
FROM pharma_serialization
WHERE lot_number = 'LOT-20250115-XY'
  AND gtin = '00850026130018'
ORDER BY occurred_at;
```

## Suspect Product Detection

```sql
SELECT
    gtin,
    serial_number,
    lot_number,
    min(occurred_at) AS first_flagged,
    count()          AS flag_count
FROM pharma_serialization
WHERE is_suspect = 1
  AND occurred_at >= today() - 30
GROUP BY gtin, serial_number, lot_number
ORDER BY flag_count DESC
LIMIT 30;
```

## Distribution Velocity by Location Type

```sql
SELECT
    location_type,
    toDate(occurred_at) AS day,
    sum(quantity)       AS units_shipped
FROM pharma_serialization
WHERE event_type = 'ship'
  AND occurred_at >= today() - 30
GROUP BY location_type, day
ORDER BY day, location_type;
```

## Recall Impact Analysis

Estimate how many units of a recalled lot have already been dispensed.

```sql
SELECT
    countIf(event_type = 'dispense')     AS dispensed_units,
    countIf(event_type = 'commission') - countIf(event_type IN ('dispense', 'destroy')) AS recoverable_units
FROM pharma_serialization
WHERE lot_number = 'LOT-RECALLED-001';
```

## Summary

ClickHouse is well-suited for pharmaceutical serialization analytics because it efficiently stores billions of serialization events while providing fast lot traceability, expiry monitoring, and recall impact queries. The combination of columnar compression, partition-based pruning, and `argMax` for finding current state makes it a practical analytical layer for DSCSA and FMD compliance systems.
