# How to Create Alerting Rules for Dapr Error Rates

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Dapr, Alerting, Error Rate, Prometheus, Reliability

Description: Build Prometheus alerting rules to detect elevated error rates in Dapr service invocation, state management, and pub/sub operations.

---

Error rate alerting is fundamental to site reliability engineering. Dapr's Prometheus metrics expose error counters for every building block, enabling precise alerting rules that catch reliability degradation before it breaches your SLOs. This guide walks through creating effective error rate alerts for all major Dapr operations.

## Dapr Error Rate Metrics

Dapr tracks success and failure counts for each operation type:

- `dapr_http_server_request_count` - HTTP request counts with status codes
- `dapr_runtime_service_invocation_req_sent_total` - Service invocation by status
- `dapr_component_state_count` - State store ops with `operation` and `success` labels
- `dapr_component_pubsub_egress_count` - Pub/sub publish attempts with success label

## Core Error Rate Alerting Rules

```yaml
apiVersion: monitoring.coreos.com/v1
kind: PrometheusRule
metadata:
  name: dapr-error-rate-alerts
  namespace: monitoring
  labels:
    prometheus: kube-prometheus
    role: alert-rules
spec:
  groups:
    - name: dapr.error.rates
      interval: 30s
      rules:
        - alert: DaprHighServiceInvocationErrorRate
          expr: |
            sum(rate(dapr_http_server_request_count{status=~"5.."}[5m])) by (app_id)
            /
            sum(rate(dapr_http_server_request_count[5m])) by (app_id)
            > 0.05
          for: 2m
          labels:
            severity: warning
          annotations:
            summary: "Dapr service invocation error rate above 5%"
            description: "App {{ $labels.app_id }} has {{ $value | humanizePercentage }} error rate over last 5 minutes."

        - alert: DaprStateStoreWriteErrorRate
          expr: |
            rate(dapr_component_state_count{operation="set",success="false"}[5m])
            /
            rate(dapr_component_state_count{operation="set"}[5m])
            > 0.01
          for: 3m
          labels:
            severity: warning
          annotations:
            summary: "Dapr state store write errors elevated"
            description: "State store {{ $labels.component }} write error rate: {{ $value | humanizePercentage }}."

        - alert: DaprPubSubDeliveryErrorRate
          expr: |
            rate(dapr_component_pubsub_egress_count{success="false"}[5m])
            /
            rate(dapr_component_pubsub_egress_count[5m])
            > 0.02
          for: 2m
          labels:
            severity: warning
          annotations:
            summary: "Dapr pub/sub publish error rate elevated"
            description: "Pub/sub component {{ $labels.component }} error rate: {{ $value | humanizePercentage }}."

        - alert: DaprCriticalErrorRate
          expr: |
            sum(rate(dapr_http_server_request_count{status=~"5.."}[5m])) by (app_id)
            /
            sum(rate(dapr_http_server_request_count[5m])) by (app_id)
            > 0.20
          for: 1m
          labels:
            severity: critical
          annotations:
            summary: "Dapr critical error rate - immediate action required"
            description: "App {{ $labels.app_id }} error rate is {{ $value | humanizePercentage }}, far above threshold."
```

## Adding Burn Rate Alerts for SLO Protection

Multi-window burn rate alerts catch both fast and slow error rate degradation:

```yaml
        - alert: DaprSLOBurnRateFast
          expr: |
            (
              sum(rate(dapr_http_server_request_count{status=~"5.."}[1h])) by (app_id)
              /
              sum(rate(dapr_http_server_request_count[1h])) by (app_id)
            ) > (14.4 * 0.01)
          for: 2m
          labels:
            severity: critical
            page: "true"
          annotations:
            summary: "Dapr fast burn rate - SLO budget exhausting rapidly"
            description: "App {{ $labels.app_id }} is burning SLO error budget 14.4x faster than normal."
```

## Testing Error Rate Alerts

Generate 5xx errors by invoking a non-existent Dapr app through the sidecar:

```bash
# Send requests to a non-existent app to generate 500 errors in Dapr metrics
for i in $(seq 1 100); do
  curl -s -o /dev/null http://localhost:3500/v1.0/invoke/nonexistent-app/method/test
done
```

Query error rates directly in Prometheus:

```bash
curl 'http://localhost:9090/api/v1/query' \
  --data-urlencode 'query=rate(dapr_http_server_request_count{status=~"5.."}[5m])'
```

## Summary

Dapr error rate alerting rules use ratio-based expressions to detect reliability degradation across service invocation, state stores, and pub/sub. Combining warning thresholds with multi-window burn rate alerts provides both immediate notification and early warning of slow SLO budget consumption.
