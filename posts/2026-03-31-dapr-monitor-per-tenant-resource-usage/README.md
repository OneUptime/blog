# How to Monitor Per-Tenant Resource Usage in Dapr

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Dapr, Monitoring, Multi-Tenancy, Prometheus, Observability

Description: Monitor per-tenant Dapr resource usage by leveraging namespace-scoped Prometheus metrics, app ID labels, and Grafana dashboards to track and chargeback tenant consumption.

---

## Why Monitor Per-Tenant Resource Usage

In a multi-tenant Dapr deployment, you need visibility into how much each tenant is consuming in terms of API calls, state operations, pub/sub messages, and CPU/memory. This data drives capacity planning, SLA enforcement, and cost chargeback.

## Dapr Metrics Labels for Tenant Attribution

Dapr exposes Prometheus metrics with `app_id` and `namespace` labels, making it straightforward to slice metrics by tenant:

```text
dapr_http_server_request_count{app_id="orders-api", namespace="tenant-a", method="POST", path="/orders", status="200"}
dapr_component_state_count{app_id="orders-api", namespace="tenant-a", component="statestore", operation="get"}
dapr_component_pubsub_egress_count{app_id="orders-api", namespace="tenant-a", component="pubsub", topic="orders"}
```

## Querying Per-Tenant Request Rates

In Prometheus or Grafana, query per-tenant request rates:

```text
# Requests per second by tenant (namespace)
sum by (namespace) (
  rate(dapr_http_server_request_count[5m])
)
```

```text
# State operations per tenant per component
sum by (namespace, component, operation) (
  rate(dapr_component_state_count{operation=~"get|set"}[5m])
)
```

## Setting Up a Grafana Dashboard

Create a dashboard variable for tenant (namespace) selection:

```json
{
  "name": "tenant",
  "type": "query",
  "query": "label_values(dapr_http_server_request_count, namespace)",
  "current": "tenant-a"
}
```

Then use the variable in panels:

```text
sum(rate(dapr_http_server_request_count{namespace="$tenant"}[5m]))
```

## Monitoring Sidecar Resource Usage per Tenant

Track CPU and memory by namespace using Kubernetes resource metrics:

```text
# Average sidecar CPU by tenant namespace
avg by (namespace) (
  rate(container_cpu_usage_seconds_total{container="daprd"}[5m])
)
```

```text
# Total sidecar memory by tenant
sum by (namespace) (
  container_memory_working_set_bytes{container="daprd"}
)
```

## Setting Tenant-Level Alerts

Alert when a tenant exceeds its allotted request rate:

```yaml
- alert: TenantRequestRateHigh
  expr: |
    sum by (namespace) (
      rate(dapr_http_server_request_count[5m])
    ) > 1000
  for: 5m
  labels:
    severity: warning
  annotations:
    summary: "Tenant {{ $labels.namespace }} exceeds 1000 req/s"
```

## Generating Chargeback Reports

Export per-tenant usage to a billing system using a daily job:

```bash
#!/bin/bash
# Daily chargeback export

TENANT=$1
DATE=$(date -u +%Y-%m-%d)

# Query total requests for the day
REQUESTS=$(curl -s "http://prometheus:9090/api/v1/query" \
  --data-urlencode "query=sum(increase(dapr_http_server_request_count{namespace=\"${TENANT}\"}[24h]))" \
  | python3 -c "import json,sys; d=json.load(sys.stdin); print(d['data']['result'][0]['value'][1])")

echo "${DATE},${TENANT},${REQUESTS}" >> /reports/chargeback.csv
```

## Summary

Dapr's Prometheus metrics include `app_id` and `namespace` labels that enable per-tenant observability out of the box. Build Grafana dashboards with namespace variables to visualize tenant-specific request rates, state operations, and sidecar resource consumption. Use Prometheus alerts to enforce per-tenant rate limits and daily query jobs to generate chargeback reports for cost allocation.
