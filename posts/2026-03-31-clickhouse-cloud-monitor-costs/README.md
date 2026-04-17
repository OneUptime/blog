# How to Monitor ClickHouse Cloud Service Costs

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: ClickHouse, ClickHouse Cloud, Cost Monitoring, Billing, FinOps, Optimization

Description: Learn how to monitor and control ClickHouse Cloud costs by understanding the billing model, using the usage API, and optimizing compute and storage spend.

---

ClickHouse Cloud bills on two dimensions: compute (based on memory-hours used) and storage (based on compressed data stored). Understanding and monitoring both lets you right-size your service and avoid surprise invoices.

## Understanding the Billing Model

- **Compute**: Charged per memory-GB-hour while the service is running
- **Storage**: Charged per GB-month of compressed data stored (separate from compute)
- **Data transfer**: Charged for egress beyond included limits

Development tier services that auto-pause stop accruing compute charges during idle periods.

## Viewing Usage in the Console

Navigate to your organization in ClickHouse Cloud console, then "Billing" - "Usage" to see:
- Compute usage by service
- Storage usage by service
- Daily and monthly breakdowns

## Querying Usage via the API

```bash
curl "https://api.clickhouse.cloud/v1/organizations/{orgId}/usageCost?from_date=2024-01-01&to_date=2024-01-31" \
  -H "Authorization: Bearer $CLICKHOUSE_API_KEY" \
  | jq '.result.costs[] | {service: .entityName, compute: .metrics.computeCHC, storage: .metrics.storageCHC}'
```

## Monitoring Storage Growth from Inside ClickHouse

```sql
SELECT
    database,
    table,
    formatReadableSize(sum(bytes_on_disk)) AS compressed_size,
    formatReadableSize(sum(data_uncompressed_bytes)) AS uncompressed_size
FROM system.parts
WHERE active = 1
GROUP BY database, table
ORDER BY sum(bytes_on_disk) DESC;
```

## Reducing Compute Costs

1. Enable auto-scaling with a low minimum: `minReplicaMemoryGb = 8`
2. Enable auto-pause for dev/staging services
3. Schedule batch workloads during off-peak hours

## Reducing Storage Costs

```sql
-- Check for large tables that can be pruned
SELECT
    table,
    formatReadableSize(sum(bytes_on_disk)) AS size
FROM system.parts
WHERE active = 1
GROUP BY table
ORDER BY sum(bytes_on_disk) DESC
LIMIT 10;

-- Set TTL to auto-expire old data
ALTER TABLE events
MODIFY TTL event_date + INTERVAL 180 DAY;
```

## Setting Budget Alerts

In the ClickHouse Cloud console under "Billing" - "Alerts", configure email notifications when spending exceeds a threshold. This prevents runaway costs from unexpected workload spikes.

## Summary

Monitor ClickHouse Cloud costs through the billing console and usage API. Control compute spend by enabling auto-scaling and auto-pause. Manage storage costs with TTL policies and regular data audits. Use budget alerts to catch unexpected cost increases early.
