# How to Scale ClickHouse Cloud Services

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: ClickHouse, ClickHouse Cloud, Scaling, Vertical Scaling, Horizontal Scaling, Performance

Description: Learn how to scale ClickHouse Cloud services vertically by adjusting memory and compute, and understand the scaling model for production workloads.

---

ClickHouse Cloud uses an architecture with compute and storage separated (object-store backed). Scaling is primarily vertical - you adjust the memory allocated per replica, which in turn determines CPU and concurrency capacity.

## Understanding the Scaling Model

ClickHouse Cloud services are defined by memory per replica (in GiB). Memory per replica directly controls:
- CPU cores per replica (proportional to memory, typically a 1:4 CPU:memory ratio)
- Query concurrency capacity
- Working-set size for joins, aggregations, and sorts

For Scale tier, the minimum is 8 GiB per replica with 3 replicas by default (24 GiB total).

## Scaling via the Console

1. Open your service in the ClickHouse Cloud console
2. Go to "Settings" - "Compute"
3. Adjust the memory slider
4. Click "Save changes"

The change is applied with no downtime on Scale and Enterprise tiers using a make-before-break approach (new replicas are brought up before old ones are removed).

## Scaling via the API

```bash
curl -X PATCH https://api.clickhouse.cloud/v1/organizations/{orgId}/services/{serviceId}/replicaScaling \
  -H "Authorization: Bearer $CLICKHOUSE_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "minReplicaMemoryGb": 16,
    "maxReplicaMemoryGb": 64
  }'
```

Setting `minReplicaMemoryGb` and `maxReplicaMemoryGb` to the same value disables vertical auto-scaling and pins each replica at a fixed size. (The older `/scaling` endpoint with `minTotalMemoryGb`/`maxTotalMemoryGb` is deprecated.)

## Checking Current Service Size

```bash
curl https://api.clickhouse.cloud/v1/organizations/{orgId}/services/{serviceId} \
  -H "Authorization: Bearer $CLICKHOUSE_API_KEY" \
  | jq '{minMemory: .result.minReplicaMemoryGb, maxMemory: .result.maxReplicaMemoryGb, numReplicas: .result.numReplicas}'
```

## When to Scale Up

Monitor these signals to know when to increase capacity:

```sql
-- Check for memory-limited queries
SELECT count()
FROM system.query_log
WHERE event_time > now() - INTERVAL 1 HOUR
  AND exception LIKE '%Memory limit%';

-- Check average query concurrency
SELECT
    toStartOfMinute(event_time) AS minute,
    count() AS queries
FROM system.query_log
WHERE event_time > now() - INTERVAL 1 HOUR
  AND type = 'QueryStart'
GROUP BY minute
ORDER BY minute;
```

## Horizontal Scaling with Additional Replicas

For heavier workloads, ClickHouse Cloud Scale and Enterprise tiers support adjusting the number of replicas (between 3 and 20). This is configured through the console or by setting `numReplicas` on the `/replicaScaling` endpoint.

## Summary

Scaling ClickHouse Cloud means adjusting memory per replica, which proportionally increases CPU and concurrency. Use the API or console for on-demand scaling, set different min/max values to enable vertical auto-scaling, and monitor query log for memory errors as signals to scale up.
