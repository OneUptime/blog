# How to Monitor Dapr Component Health with Metrics

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Dapr, Component, Metric, Observability, Prometheus

Description: Use Dapr component metrics to track the health of state stores, pub/sub brokers, and bindings to detect failures before they impact services.

---

Dapr components - state stores, pub/sub brokers, secret stores, and bindings - are the backing infrastructure your services depend on. When a component becomes unhealthy, the effects cascade. Dapr exposes metrics for each component type so you can detect issues early.

## Component Metric Categories

Dapr emits component metrics with labels including `app_id`, `component`, and `namespace`. The main categories are:

- State store: `dapr_component_state_*`
- Pub/sub: `dapr_component_pubsub_*`
- Input bindings: `dapr_component_input_binding_*`
- Output bindings: `dapr_component_output_binding_*`
- Secret store: implicit via error counts

## State Store Health Metrics

State store metrics use a single counter `dapr_component_state_count` with an `operation` label (e.g., `get`, `set`, `delete`, `bulk-get`, `bulk-set`) and a `success` label (`true` or `false`).

```text
# GET operation error rate
rate(dapr_component_state_count{operation="get", success="false"}[5m])

# SET operation error rate
rate(dapr_component_state_count{operation="set", success="false"}[5m])

# GET latency P99
histogram_quantile(0.99,
  sum by (le, component) (
    rate(dapr_component_state_latencies_bucket{operation="get"}[5m])
  )
)

# Total GET operations by component
rate(dapr_component_state_count{operation="get"}[5m])
```

## Pub/Sub Component Health

Pub/sub metrics are split into ingress (subscribed messages) and egress (published messages). Egress uses a `success` label, while ingress uses `status` and `process_status` labels.

```text
# Messages failing to be published
rate(dapr_component_pubsub_egress_count{success="false"}[5m])

# Messages failing to be processed (ingress errors)
rate(dapr_component_pubsub_ingress_count{status="drop"}[5m])

# End-to-end pub/sub ingress latency
histogram_quantile(0.95,
  sum by (le, component, topic) (
    rate(dapr_component_pubsub_ingress_latencies_bucket[5m])
  )
)
```

## Binding Component Health

Binding metrics are split into input and output bindings. Each has a counter and latency histogram with `operation` and `success` labels.

```text
# Output binding invocation errors
rate(dapr_component_output_binding_count{success="false"}[5m])

# Output binding invocation latency
histogram_quantile(0.99,
  sum by (le, component) (
    rate(dapr_component_output_binding_latencies_bucket[5m])
  )
)
```

## Alert Rules for Component Health

```yaml
groups:
- name: dapr-components
  rules:
  - alert: DaprStateStoreErrors
    expr: rate(dapr_component_state_count{operation="get", success="false"}[5m]) > 0
    for: 2m
    labels:
      severity: warning
    annotations:
      summary: "State store {{ $labels.component }} has GET failures"

  - alert: DaprPubSubIngressDrops
    expr: rate(dapr_component_pubsub_ingress_count{status="drop"}[5m]) > 0
    for: 1m
    labels:
      severity: critical
    annotations:
      summary: "Pub/sub component {{ $labels.component }} is dropping messages on topic {{ $labels.topic }}"

  - alert: DaprPubSubEgressErrors
    expr: |
      rate(dapr_component_pubsub_egress_count{success="false"}[5m])
        / rate(dapr_component_pubsub_egress_count[5m]) > 0.01
    for: 3m
    labels:
      severity: warning
    annotations:
      summary: "Pub/sub publish error rate above 1% on {{ $labels.component }}"
```

## Checking Component Status via Dapr API

Beyond metrics, use the Dapr health API to check overall sidecar health, which includes verifying that all components are initialized:

```bash
# Check overall sidecar health (includes component initialization)
curl http://localhost:3500/v1.0/healthz

# Check outbound readiness (components initialized, no app channel required)
curl http://localhost:3500/v1.0/healthz/outbound

# Check specific component initialization in sidecar logs
kubectl logs deploy/order-service -c daprd | grep -i "component"
```

Note: The health endpoints return 204 (healthy) or 500 (unhealthy) as a binary check. They do not provide per-component health details.

## Grafana Dashboard for Component Health

Create a table panel showing error rates across all state store components:

```text
# Matrix query - error rate per component
sum by (component) (
  rate(dapr_component_state_count{success="false"}[5m])
)
```

Use the "Table" visualization with color thresholds: green at 0, yellow above 0.01, red above 0.1.

## Summary

Dapr component health metrics cover state stores, pub/sub, and bindings with operation counts, error rates, and latency histograms. Alert on any non-zero error rates for state operations and on drop rates for pub/sub ingress, as drops indicate the system is falling behind. Combine metrics with the Dapr health API and sidecar logs for complete component observability.
