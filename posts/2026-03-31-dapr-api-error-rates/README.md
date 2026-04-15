# How to Monitor Dapr API Error Rates

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Dapr, Monitoring, API, Error Rate, Prometheus

Description: Monitor Dapr API error rates using Prometheus metrics and Grafana dashboards to detect failing service invocations, pub/sub errors, and state operation failures.

---

## Why Monitor API Error Rates?

Dapr acts as the communication layer between microservices. Elevated error rates on Dapr APIs indicate problems with downstream services, infrastructure components, or network connectivity. Monitoring error rates helps you detect and respond to issues before they cascade.

## Dapr API Categories to Monitor

Key APIs that should have error rate monitoring:
- Service invocation (direct service calls)
- Pub/Sub publish and subscribe
- State management (read/write/delete)
- Bindings (input/output)
- Actor invocations

## Prometheus Metrics for Error Rates

Enable Dapr metrics in your Helm installation:

```bash
helm upgrade dapr dapr/dapr \
  --namespace dapr-system \
  --set global.prometheus.enabled=true \
  --set global.prometheus.port=9090 \
  --reuse-values
```

Key error metrics per API:

```bash
# Service invocation errors
dapr_http_server_request_count{status=~"5.."}

# Pub/sub publish failures
dapr_component_pubsub_egress_count{success="false"}

# State store errors
dapr_component_state_count{success="false",operation="set"}
dapr_component_state_count{success="false",operation="get"}

# Binding errors
dapr_component_output_binding_count{success="false"}
```

## PromQL Error Rate Queries

Calculate error rates for Grafana panels:

```bash
# Service invocation error rate (5-minute window)
rate(dapr_http_server_request_count{status=~"5.."}[5m])
/
rate(dapr_http_server_request_count[5m])

# Pub/sub publish error rate
rate(dapr_component_pubsub_egress_count{success="false"}[5m])
/
rate(dapr_component_pubsub_egress_count[5m])
```

## Alerting on High Error Rates

```yaml
groups:
  - name: dapr-error-rates
    rules:
      - alert: DaprServiceInvocationHighErrorRate
        expr: >
          rate(dapr_http_server_request_count{status=~"5.."}[5m])
          /
          rate(dapr_http_server_request_count[5m]) > 0.05
        for: 5m
        labels:
          severity: warning
        annotations:
          summary: "Dapr service invocation error rate exceeds 5%"

      - alert: DaprPubSubPublishErrors
        expr: >
          rate(dapr_component_pubsub_egress_count{success="false"}[5m]) > 0.5
        for: 3m
        labels:
          severity: critical
        annotations:
          summary: "Dapr pub/sub publish errors are high"
```

## Diagnosing Error Sources

When you detect high error rates, drill down to the source:

```bash
# Check which app is generating errors
sum by (app_id, method) (
  rate(dapr_http_server_request_count{status=~"5.."}[5m])
)

# Check which component is failing
sum by (component, type) (
  rate(dapr_component_state_count{success="false"}[5m])
)
```

## Correlating with Application Logs

```bash
# Find 5xx errors in sidecar logs
kubectl logs <pod-name> -c daprd | grep -E "\"status\":5|ERR_" | tail -30
```

## Summary

Monitor Dapr API error rates using Prometheus metrics for service invocation, pub/sub, state management, and bindings. Set up PromQL-based error rate calculations for Grafana dashboards and configure alerts for rates exceeding thresholds. When errors are detected, use label-based queries to identify the specific app, component, or operation causing failures, then correlate with sidecar logs for root cause analysis.
