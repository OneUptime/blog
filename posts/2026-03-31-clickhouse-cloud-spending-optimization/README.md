# How to Optimize ClickHouse Cloud Spending

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: ClickHouse, Cloud Cost, Cost Optimization, ClickHouse Cloud, Performance

Description: Practical techniques to reduce ClickHouse Cloud bills by optimizing compute usage, storage, data retention, and query efficiency.

---

## Understanding ClickHouse Cloud Billing

ClickHouse Cloud charges for compute (active service time), storage (compressed data), and data transfer. The biggest levers for cost reduction are compute idle time, query efficiency, and storage volume.

## Enable Auto-Scaling and Auto-Suspension

ClickHouse Cloud services can suspend automatically when idle. Enable this in the console or via API:

```bash
curl -X PATCH \
  "https://api.clickhouse.cloud/v1/organizations/{org_id}/services/{service_id}/replicaScaling" \
  -H "Authorization: Bearer $API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "idleScaling": true,
    "idleTimeoutMinutes": 5,
    "minReplicaMemoryGb": 24,
    "maxReplicaMemoryGb": 120
  }'
```

For dev/staging services, a 5-minute idle timeout alone can cut compute costs by 60-70% overnight and on weekends.

## Reduce Storage with Better Compression

Poor column type choices inflate storage. Audit with:

```sql
SELECT
    column,
    type,
    formatReadableSize(data_compressed_bytes) AS compressed,
    formatReadableSize(data_uncompressed_bytes) AS uncompressed,
    round(data_compressed_bytes / data_uncompressed_bytes, 3) AS ratio
FROM system.columns
WHERE table = 'events'
ORDER BY data_compressed_bytes DESC;
```

Switch String columns to LowCardinality(String) for fields with fewer than 10,000 unique values. This alone can reduce storage 40-60% for those columns.

```sql
ALTER TABLE events MODIFY COLUMN status LowCardinality(String);
```

## Delete Unnecessary Data

Set TTL to automatically remove data you no longer need:

```sql
ALTER TABLE events MODIFY TTL event_time + INTERVAL 90 DAY;
```

For ClickHouse Cloud, reducing stored data directly reduces monthly storage charges.

## Optimize Expensive Queries

Find the most costly queries by bytes read:

```sql
SELECT
    normalized_query_hash,
    any(query) AS sample_query,
    count() AS executions,
    sum(read_bytes) AS total_bytes_read,
    avg(query_duration_ms) AS avg_ms
FROM clusterAllReplicas(default, system.query_log)
WHERE type = 'QueryFinish'
  AND event_time >= now() - INTERVAL 7 DAY
GROUP BY normalized_query_hash
ORDER BY total_bytes_read DESC
LIMIT 10;
```

For each expensive query, check if the ORDER BY key is being used effectively. Misaligned sorts force full scans.

## Rely on Managed Object Storage for Archival Data

ClickHouse Cloud stores all data on object storage by default, so there is no separate hot/cold disk tier to configure. Archival is handled by the platform: rarely accessed parts stay on object storage and are fetched only when queried. To keep costs down, combine a longer retention window with a DELETE TTL that clears data beyond your required horizon:

```sql
ALTER TABLE events MODIFY TTL event_time + INTERVAL 365 DAY DELETE;
```

## Schedule Heavy Jobs Outside Peak Hours

For ETL pipelines and large backfills, schedule during off-peak hours when possible. ClickHouse Cloud auto-scaling adds capacity on demand, which costs more during peaks.

```bash
# Schedule a heavy materialized view refresh at 2 AM
echo "0 2 * * * clickhouse-client -q 'OPTIMIZE TABLE mv_daily_summary FINAL'" | crontab -
```

## Summary

ClickHouse Cloud spending can be cut significantly by enabling auto-suspension for idle services, using appropriate data types for better compression, applying TTL to remove stale data, and optimizing high-cost queries to reduce bytes scanned. Regular audits using system tables reveal the biggest opportunities for savings.
