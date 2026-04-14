# How to Monitor Dapr State Store Operation Metrics

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Dapr, State Store, Metric, Observability, Prometheus

Description: Track Dapr state store GET, SET, and DELETE operation rates, latency, and error counts to detect backend storage issues early.

---

Dapr abstracts state management through state store components backed by Redis, Cosmos DB, PostgreSQL, or other databases. Monitoring state store metrics lets you detect slow backends, error spikes, and unusual usage patterns that would otherwise surface only as application errors.

## State Store Metrics Reference

Dapr emits two metrics for state operations, using labels to distinguish operation types and outcomes:

- `dapr_component_state_count` - Counter for state operations (GET, SET, DELETE, etc.)
- `dapr_component_state_latencies` - Histogram for state operation latency in milliseconds

Key labels on these metrics:

- `app_id` - Application ID
- `component` - State store component name
- `namespace` - Kubernetes namespace
- `operation` - Operation type: `get`, `set`, `delete`, `bulk_get`, `bulk_delete`, `query`, `transaction`
- `success` - `"true"` or `"false"` indicating operation outcome

## Operation Rate Queries

```text
# GET rate per state store component
rate(dapr_component_state_count{app_id="order-service", operation="get"}[5m])

# SET rate
rate(dapr_component_state_count{app_id="order-service", operation="set"}[5m])

# DELETE rate
rate(dapr_component_state_count{app_id="order-service", operation="delete"}[5m])

# Total state operation rate
sum by (component) (
  rate(dapr_component_state_count[5m])
)
```

## Error Rate Queries

```text
# GET error rate per component
rate(dapr_component_state_count{operation="get", success="false"}[5m])

# SET error rate
rate(dapr_component_state_count{operation="set", success="false"}[5m])

# Overall error percentage
sum(rate(dapr_component_state_count{success="false"}[5m]))
/
sum(rate(dapr_component_state_count[5m])) * 100
```

## Latency Analysis

```text
# P99 GET latency
histogram_quantile(0.99,
  sum by (le, component) (
    rate(dapr_component_state_latencies_bucket{operation="get"}[5m])
  )
)

# P99 SET latency
histogram_quantile(0.99,
  sum by (le, component) (
    rate(dapr_component_state_latencies_bucket{operation="set"}[5m])
  )
)

# Average GET latency
sum by (component) (rate(dapr_component_state_latencies_sum{operation="get"}[5m]))
/
sum by (component) (rate(dapr_component_state_latencies_count{operation="get"}[5m]))
```

## Alert Rules

```yaml
groups:
- name: dapr-state-store
  rules:
  - alert: DaprStateStoreGetErrors
    expr: rate(dapr_component_state_count{operation="get", success="false"}[5m]) > 0
    for: 2m
    labels:
      severity: warning
    annotations:
      summary: "State store GET failures on {{ $labels.component }}"

  - alert: DaprStateStoreSetErrors
    expr: rate(dapr_component_state_count{operation="set", success="false"}[5m]) > 0
    for: 2m
    labels:
      severity: warning
    annotations:
      summary: "State store SET failures on {{ $labels.component }}"

  - alert: DaprStateStoreHighLatency
    expr: |
      histogram_quantile(0.99,
        sum by (le, component) (
          rate(dapr_component_state_latencies_bucket{operation="get"}[5m])
        )
      ) > 200
    for: 5m
    labels:
      severity: warning
    annotations:
      summary: "State store GET P99 latency above 200ms on {{ $labels.component }}"
```

## Correlating with Backend Health

When state store errors spike, check the backing store:

```bash
# Check Redis state store health (if using Redis)
kubectl exec -n default deploy/redis -- redis-cli ping

# Check Redis latency
kubectl exec -n default deploy/redis -- redis-cli --latency-history -i 1

# Check Dapr component initialization
kubectl logs deploy/order-service -c daprd | grep -i "statestore"
```

## Summary

Dapr state store metrics provide per-component visibility into GET, SET, and DELETE operation rates, error counts, and latency distributions. Monitor error rates closely as even a small number of state failures can cause data inconsistency in stateful workflows. High GET latency often indicates backend network or resource contention, while SET failures suggest capacity or connection limits on the backing store.
