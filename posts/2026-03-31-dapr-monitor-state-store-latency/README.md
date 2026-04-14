# How to Monitor Dapr State Store Latency

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Dapr, State Store, Latency, Monitoring, Redis

Description: Track read and write latency for Dapr state stores to detect backend degradation and maintain performance SLOs.

---

State store latency directly impacts application responsiveness. When Redis, Cassandra, or another Dapr state backend slows down, every service making state calls becomes slow. Monitoring state store latency with Prometheus lets you catch backend degradation early and correlate it with application-level performance regressions.

## Dapr State Store Latency Metrics

Dapr instruments all state operations with a single duration histogram that uses an `operation` label to distinguish operation types:

- `dapr_component_state_latencies{operation="get"}` - read operation latency
- `dapr_component_state_latencies{operation="set"}` - write operation latency
- `dapr_component_state_latencies{operation="delete"}` - delete operation latency
- `dapr_component_state_latencies{operation="query"}` - query operation latency

The metric also includes `app_id`, `component`, `namespace`, and `success` labels for filtering.

## Querying State Store Latency

Calculate p50, p95, and p99 latencies for state reads:

```promql
# p99 read latency by store
histogram_quantile(0.99,
  sum(rate(dapr_component_state_latencies_bucket{operation="get"}[5m]))
  by (component, le)
)

# p95 write latency
histogram_quantile(0.95,
  sum(rate(dapr_component_state_latencies_bucket{operation="set"}[5m]))
  by (component, le)
)

# Average read latency
rate(dapr_component_state_latencies_sum{operation="get"}[5m])
/
rate(dapr_component_state_latencies_count{operation="get"}[5m])
```

## Setting Up Latency Alerting Rules

```yaml
apiVersion: monitoring.coreos.com/v1
kind: PrometheusRule
metadata:
  name: dapr-state-store-latency-alerts
  namespace: monitoring
spec:
  groups:
    - name: dapr.state.latency
      interval: 30s
      rules:
        - alert: DaprStateReadHighLatency
          expr: |
            histogram_quantile(0.99,
              sum(rate(dapr_component_state_latencies_bucket{operation="get"}[5m]))
              by (component, le)
            ) > 100
          for: 3m
          labels:
            severity: warning
          annotations:
            summary: "Dapr state store read p99 latency high"
            description: "State store {{ $labels.component }} read p99 is {{ $value }}ms, exceeding 100ms SLO."

        - alert: DaprStateWriteHighLatency
          expr: |
            histogram_quantile(0.99,
              sum(rate(dapr_component_state_latencies_bucket{operation="set"}[5m]))
              by (component, le)
            ) > 150
          for: 3m
          labels:
            severity: warning
          annotations:
            summary: "Dapr state store write p99 latency high"
            description: "State store {{ $labels.component }} write p99 is {{ $value }}ms."

        - alert: DaprStateStoreCriticalLatency
          expr: |
            histogram_quantile(0.99,
              sum(rate(dapr_component_state_latencies_bucket{operation="get"}[5m]))
              by (component, le)
            ) > 1000
          for: 1m
          labels:
            severity: critical
          annotations:
            summary: "Dapr state store critically slow"
            description: "State store {{ $labels.component }} p99 read latency is {{ $value }}ms - backend may be down."
```

## Redis-Specific State Store Monitoring

When using Redis as a Dapr state store, add Redis-specific monitoring:

```bash
# Check Redis latency directly
redis-cli -h redis-service latency history command

# Monitor Redis from Kubernetes
kubectl exec -it redis-0 -- redis-cli slowlog get 10
```

Deploy the Redis Exporter for Prometheus integration:

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: redis-exporter
spec:
  template:
    spec:
      containers:
        - name: redis-exporter
          image: oliver006/redis_exporter:latest
          env:
            - name: REDIS_ADDR
              value: "redis-service:6379"
```

Alert on Redis latency directly:

```yaml
        - alert: RedisStateBackendHighLatency
          expr: rate(redis_commands_duration_seconds_total[5m]) / rate(redis_commands_total[5m]) > 0.01
          for: 5m
          labels:
            severity: warning
          annotations:
            summary: "Redis backend latency affecting Dapr state store"
```

## Correlating State Latency with Application Latency

Use Grafana to create a correlation dashboard:

```promql
# State store contribution to overall latency
histogram_quantile(0.99,
  sum(rate(dapr_component_state_latencies_bucket{operation="get"}[5m]))
  by (le)
)
/
histogram_quantile(0.99,
  sum(rate(dapr_http_server_latency_bucket[5m]))
  by (le)
)
```

## Summary

Monitoring Dapr state store latency requires tracking operation-level histograms for reads, writes, and deletes, supplemented by backend-specific metrics from Redis or other stores. Setting tiered latency thresholds enables early warning of backend degradation before it cascades to application-level SLO breaches.
