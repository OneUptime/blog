# How to Use Dapr Metrics for Capacity Planning

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Dapr, Capacity Planning, Metric, Prometheus, Scalability

Description: Use Dapr's Prometheus metrics to project resource needs, identify bottlenecks, and plan infrastructure scaling before hitting limits.

---

Capacity planning transforms reactive firefighting into proactive infrastructure management. Dapr's rich Prometheus metrics give you the data needed to forecast resource requirements, identify saturation points, and right-size your cluster before traffic growth becomes a problem. This guide covers using Dapr metrics for systematic capacity planning.

## The Four Golden Signals for Capacity Planning

For Dapr services, focus on these signals:

1. Latency - degradation precedes failure
2. Traffic - request rate drives resource consumption
3. Errors - spike before full saturation
4. Saturation - CPU/memory limits approaching

## Baseline Measurement

Establish baselines during normal operation using Prometheus range queries:

```bash
# Average request rate per service over past week
curl 'http://prometheus:9090/api/v1/query_range' \
  --data-urlencode 'query=sum(rate(dapr_http_server_request_count[5m])) by (app_id)' \
  --data-urlencode "start=$(date -d '7 days ago' +%s)" \
  --data-urlencode "end=$(date +%s)" \
  --data-urlencode 'step=1h'
```

Key baseline queries for capacity planning:

```promql
# Peak request rate (use for capacity headroom calculations)
max_over_time(
  sum(rate(dapr_http_server_request_count[5m])) by (app_id)[7d:5m]
)

# Average sidecar memory consumption
avg_over_time(
  container_memory_working_set_bytes{container="daprd"}[7d]
)

# State store operations per second
sum(rate(dapr_component_state_count{operation="get"}[5m]) + rate(dapr_component_state_count{operation="set"}[5m])) by (component)
```

## Projecting Growth Requirements

Model future resource needs based on traffic growth trends:

```promql
# Linear regression of request rate growth (predict next 30 days)
predict_linear(
  sum(rate(dapr_http_server_request_count[5m]))[7d:1h],
  30 * 24 * 3600
)

# Sidecar memory growth prediction
predict_linear(
  avg(container_memory_working_set_bytes{container="daprd"})[7d:1h],
  30 * 24 * 3600
)
```

## State Store Capacity Planning

Track state store growth to plan storage capacity:

```promql
# State write rate - project backend storage growth
sum(rate(dapr_component_state_count{operation="set",success="true"}[5m])) by (component)

# State read-to-write ratio (plan caching strategy)
sum(rate(dapr_component_state_count{operation="get"}[5m])) by (component)
/
sum(rate(dapr_component_state_count{operation="set"}[5m])) by (component)
```

## Pub/Sub Throughput Planning

```promql
# Peak pub/sub throughput for broker sizing
max_over_time(
  sum(rate(dapr_component_pubsub_egress_count[5m]))[24h:5m]
)

# Consumer processing capacity vs publish rate
sum(rate(dapr_component_pubsub_ingress_count[5m])) by (topic)
/
sum(rate(dapr_component_pubsub_egress_count[5m])) by (topic)
```

## Creating a Capacity Planning Report

Automate a weekly capacity planning report:

```bash
#!/bin/bash
# capacity-report.sh
PROMETHEUS="http://prometheus:9090"

echo "=== Dapr Capacity Planning Report $(date) ==="

echo "--- Top Services by Request Rate (req/s) ---"
curl -s "$PROMETHEUS/api/v1/query" \
  --data-urlencode 'query=topk(10, sum(rate(dapr_http_server_request_count[5m])) by (app_id))' \
  | jq -r '.data.result[] | "\(.metric.app_id): \(.value[1])"'

echo "--- Sidecar Memory Usage (MB) ---"
curl -s "$PROMETHEUS/api/v1/query" \
  --data-urlencode 'query=sort_desc(avg(container_memory_working_set_bytes{container="daprd"}) by (pod) / 1024 / 1024)' \
  | jq -r '.data.result[] | "\(.metric.pod): \(.value[1] | tonumber | floor)MB"'

echo "--- 30-Day Traffic Projection ---"
curl -s "$PROMETHEUS/api/v1/query" \
  --data-urlencode 'query=predict_linear(sum(rate(dapr_http_server_request_count[5m]))[7d:1h], 2592000)' \
  | jq -r '.data.result[0].value[1]'
```

## Summary

Dapr metrics enable data-driven capacity planning by providing baseline request rates, resource consumption trends, and growth predictions via Prometheus. Using `predict_linear` and `max_over_time` functions on Dapr's golden signals allows teams to provision infrastructure before traffic growth causes degradation.
