# How to Monitor Dapr Service Invocation Success Rates

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Dapr, Service Invocation, Monitoring, Reliability, Prometheus

Description: Track success rates for Dapr service-to-service calls, identify failing endpoints, and maintain reliability SLOs across your microservices.

---

Service invocation success rate is one of the most important reliability signals in a microservices architecture. Dapr routes all service-to-service calls through its sidecar, making it the perfect observation point for success/failure tracking. This guide explains how to build comprehensive success rate monitoring for Dapr service invocation.

## Dapr Service Invocation Metrics

When Dapr routes service calls, it emits metrics on both the calling and receiving sidecars:

- `dapr_http_server_request_count` - requests received by sidecar (with HTTP status code)
- `dapr_http_client_completed_count` - completed requests sent by sidecar to target service
- `dapr_runtime_service_invocation_req_sent_total` - service invocation attempts with success label

Labels include `app_id` (target service), `method`, `status`, and `path`.

## Querying Success Rates

Calculate the success rate for each service over the last 5 minutes:

```promql
# Success rate per target app_id
sum(rate(dapr_http_server_request_count{status!~"5.."}[5m])) by (app_id)
/
sum(rate(dapr_http_server_request_count[5m])) by (app_id)

# Success rate by method
sum(rate(dapr_http_server_request_count{status!~"5.."}[5m])) by (app_id, method)
/
sum(rate(dapr_http_server_request_count[5m])) by (app_id, method)
```

Identify the least reliable service:

```promql
topk(5,
  1 - (
    sum(rate(dapr_http_server_request_count{status!~"5.."}[5m])) by (app_id)
    /
    sum(rate(dapr_http_server_request_count[5m])) by (app_id)
  )
)
```

## Alerting on Success Rate Degradation

```yaml
apiVersion: monitoring.coreos.com/v1
kind: PrometheusRule
metadata:
  name: dapr-service-invocation-success-alerts
  namespace: monitoring
spec:
  groups:
    - name: dapr.invocation.success
      interval: 30s
      rules:
        - alert: DaprServiceInvocationSuccessRateLow
          expr: |
            sum(rate(dapr_http_server_request_count{status!~"5.."}[5m])) by (app_id)
            /
            sum(rate(dapr_http_server_request_count[5m])) by (app_id)
            < 0.95
          for: 3m
          labels:
            severity: warning
          annotations:
            summary: "Dapr service invocation success rate below 95%"
            description: "Service {{ $labels.app_id }} success rate is {{ $value | humanizePercentage }}."

        - alert: DaprServiceInvocationSuccessRateCritical
          expr: |
            sum(rate(dapr_http_server_request_count{status!~"5.."}[5m])) by (app_id)
            /
            sum(rate(dapr_http_server_request_count[5m])) by (app_id)
            < 0.80
          for: 1m
          labels:
            severity: critical
          annotations:
            summary: "Dapr service invocation critically failing"
            description: "Service {{ $labels.app_id }} success rate is {{ $value | humanizePercentage }}. Immediate action required."

        - alert: DaprServiceInvocationAllFailing
          expr: |
            sum(rate(dapr_http_server_request_count{status!~"5.."}[5m])) by (app_id)
            /
            sum(rate(dapr_http_server_request_count[5m])) by (app_id)
            == 0
          for: 1m
          labels:
            severity: critical
          annotations:
            summary: "Dapr service completely unavailable"
            description: "Service {{ $labels.app_id }} is returning 100% errors."
```

## Tracking Success Rates by Endpoint

For more granular tracking, filter by HTTP method and path:

```bash
# Check success rate per endpoint using Dapr CLI
dapr invoke --app-id my-service --method health --verb GET

# Prometheus query for per-endpoint success
sum(rate(dapr_http_server_request_count{status!~"5..", method="GET"}[5m])) by (app_id)
/
sum(rate(dapr_http_server_request_count{method="GET"}[5m])) by (app_id)
```

## Grafana Dashboard Setup

Create a service reliability overview panel:

```promql
# Panel: Service Invocation Success Rate Table
sum(rate(dapr_http_server_request_count{status!~"5.."}[5m])) by (app_id)
/
sum(rate(dapr_http_server_request_count[5m])) by (app_id)
```

Set thresholds in Grafana: green above 99%, yellow 95-99%, red below 95%.

## Summary

Monitoring Dapr service invocation success rates uses HTTP status code-based ratio queries to track reliability per service and endpoint. Combining warning and critical alerts with granular Grafana dashboards gives operations teams real-time visibility into microservice reliability across the entire Dapr mesh.
