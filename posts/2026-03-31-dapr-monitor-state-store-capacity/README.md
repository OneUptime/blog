# How to Monitor Dapr State Store Capacity

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Dapr, State Store, Monitoring, Redis, Capacity, Observability

Description: Monitor Dapr state store capacity by tracking backend metrics, Dapr operation counts, error rates, and setting alerts before storage limits are reached.

---

## Why State Store Capacity Monitoring Matters

Dapr abstracts the underlying state store (Redis, Cosmos DB, PostgreSQL, etc.), but the backend still has capacity limits. Running out of memory in Redis or hitting quota limits in a cloud database causes state operations to fail, which cascades into application errors.

## Dapr State Operation Metrics

Dapr exposes metrics for state store operations via Prometheus:

```bash
# Total state operations
dapr_component_state_count

# Failed state operations
dapr_component_state_count{success="false"}

# Error rate
rate(dapr_component_state_count{success="false"}[5m])
```

Query the error rate to detect when the backend starts rejecting writes:

```bash
# State store error rate percentage
100 * rate(dapr_component_state_count{success="false"}[5m])
  / rate(dapr_component_state_count[5m])
```

## Monitoring Redis Backend Capacity

When using Redis as the Dapr state store, monitor Redis-specific metrics:

```bash
# Check Redis memory usage
redis-cli -h redis-master INFO memory | grep used_memory_human

# Check key count
redis-cli -h redis-master DBSIZE

# Check eviction policy
redis-cli -h redis-master CONFIG GET maxmemory-policy
```

For Redis deployed in Kubernetes, use redis-exporter metrics in Prometheus:

```bash
# Redis memory utilization
redis_memory_used_bytes / redis_memory_max_bytes * 100

# Evicted keys (indicates memory pressure)
rate(redis_evicted_keys_total[5m])
```

## Configuring Dapr State Store with TTL

Prevent unbounded growth by setting key TTL in your state operations:

```go
client.SaveState(ctx, "statestore", "session-123", data, map[string]string{
    "ttlInSeconds": "3600",
})
```

Or set a default TTL at the component level:

```yaml
apiVersion: dapr.io/v1alpha1
kind: Component
metadata:
  name: statestore
spec:
  type: state.redis
  version: v1
  metadata:
    - name: redisHost
      value: redis-master:6379
    - name: ttlInSeconds
      value: "86400"
```

## Setting Capacity Alerts

Create Grafana alerts for state store health:

```yaml
apiVersion: monitoring.coreos.com/v1
kind: PrometheusRule
metadata:
  name: dapr-state-store-alerts
spec:
  groups:
    - name: state-store
      rules:
        - alert: DaprStateStoreErrors
          expr: |
            rate(dapr_component_state_count{success="false"}[5m])
              / rate(dapr_component_state_count[5m]) > 0.1
          for: 3m
          labels:
            severity: critical
          annotations:
            summary: "Dapr state store error rate above 10%"
        - alert: RedisMemoryHigh
          expr: redis_memory_used_bytes / redis_memory_max_bytes > 0.85
          for: 5m
          labels:
            severity: warning
          annotations:
            summary: "Redis memory usage above 85%"
```

## Checking State Store Bulk Operations

Large bulk reads can exhaust connections. Limit bulk query size:

```go
resp, err := client.GetBulkState(ctx, "statestore", keys, nil, 10)
```

The last parameter is the parallelism limit. Reducing it prevents overwhelming the backend.

## Summary

Monitoring Dapr state store capacity requires tracking both Dapr-level metrics (operation counts and error rates) and backend-specific metrics (Redis memory, eviction counts). Setting TTL on state keys prevents unbounded growth, while PrometheusRule alerts ensure you are notified before capacity issues cause application failures.
