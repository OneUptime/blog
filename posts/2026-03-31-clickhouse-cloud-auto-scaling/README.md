# How to Configure Auto-Scaling in ClickHouse Cloud

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: ClickHouse, ClickHouse Cloud, Auto-Scaling, Cloud, Cost Optimization, Performance

Description: Learn how to configure auto-scaling in ClickHouse Cloud by setting minimum and maximum memory bounds to handle variable workloads cost-efficiently.

---

ClickHouse Cloud supports automatic scaling of compute resources based on workload demand. Auto-scaling adjusts the total memory (and therefore CPU) allocated to your service within bounds you define, helping balance performance and cost.

## How Auto-Scaling Works

ClickHouse Cloud monitors CPU utilization and memory pressure on your service. When usage consistently exceeds thresholds, it scales up. When the service is underutilized, it scales back down - but not below your configured minimum.

Auto-scaling is enabled by setting different `minReplicaMemoryGb` and `maxReplicaMemoryGb` values.

## Enabling Auto-Scaling via the Console

1. Navigate to your service settings
2. Under "Compute", set different values for "Min memory" and "Max memory"
3. Save changes

The service will now scale between those bounds automatically.

## Configuring Auto-Scaling via the API

```bash
curl -X PATCH https://api.clickhouse.cloud/v1/organizations/{orgId}/services/{serviceId}/replicaScaling \
  -H "Authorization: Bearer $CLICKHOUSE_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "minReplicaMemoryGb": 24,
    "maxReplicaMemoryGb": 192
  }'
```

This allows each replica to scale from 24 GB (baseline) up to 192 GB during peak load.

## Disabling Auto-Scaling (Fixed Size)

Set min and max to the same value to pin the service at a specific size:

```bash
curl -X PATCH https://api.clickhouse.cloud/v1/organizations/{orgId}/services/{serviceId}/replicaScaling \
  -H "Authorization: Bearer $CLICKHOUSE_API_KEY" \
  -d '{
    "minReplicaMemoryGb": 48,
    "maxReplicaMemoryGb": 48
  }'
```

## Monitoring Scale Events

Check the service activity log in the ClickHouse Cloud console to see when scale-up or scale-down events occurred. This helps you understand your workload patterns and tune your min/max bounds.

## Auto-Pause on Idle

Scale and Enterprise tier services can auto-pause after a configurable idle period:

```bash
curl -X PATCH https://api.clickhouse.cloud/v1/organizations/{orgId}/services/{serviceId}/replicaScaling \
  -H "Authorization: Bearer $CLICKHOUSE_API_KEY" \
  -d '{
    "idleScaling": true,
    "idleTimeoutMinutes": 15
  }'
```

This completely stops compute billing when no queries are running.

## Recommended Bounds by Use Case

| Use Case | Min Memory | Max Memory |
|---|---|---|
| Dev / staging | 8 GB | 24 GB |
| Dashboards | 24 GB | 96 GB |
| Batch analytics | 24 GB | 384 GB |
| Real-time ingest | 48 GB | 192 GB |

## Summary

ClickHouse Cloud auto-scaling is configured by defining min and max memory bounds. The service scales within those bounds based on CPU and memory demand. Use wide bounds for variable workloads and set min equal to max for predictable, fixed-cost environments.
