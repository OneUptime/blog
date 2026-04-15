# How to Set Up Alerting for Dapr Metrics

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Dapr, Alert, Prometheus, Metric, Observability

Description: Configure Prometheus alerting rules for Dapr metrics to detect high error rates, latency spikes, and component failures before users are impacted.

---

Alerting on Dapr metrics lets you catch service degradation early. This guide covers writing Prometheus alerting rules for the most critical Dapr signals and routing notifications to PagerDuty, Slack, or email via Alertmanager.

## Core Dapr Signals to Alert On

The most important signals for Dapr services are:

1. HTTP/gRPC error rate - services failing to respond correctly
2. Request latency - P99 exceeding SLO thresholds
3. Component failures - state stores, pub/sub brokers becoming unavailable
4. Sidecar availability - daprd containers crashing or not starting
5. Control plane health - operator and sentry issues

## Prometheus Alert Rules

Create an alert rules file:

```yaml
groups:
- name: dapr-service-alerts
  rules:

  - alert: DaprHighErrorRate
    expr: |
      sum by (app_id) (
        rate(dapr_http_server_request_count{status!~"2.."}[5m])
      )
      /
      sum by (app_id) (
        rate(dapr_http_server_request_count[5m])
      ) > 0.05
    for: 3m
    labels:
      severity: warning
    annotations:
      summary: "High error rate for Dapr app {{ $labels.app_id }}"
      description: "Error rate is {{ $value | humanizePercentage }} for app {{ $labels.app_id }}"

  - alert: DaprHighLatency
    expr: |
      histogram_quantile(0.99,
        sum by (le, app_id) (
          rate(dapr_http_server_latency_bucket[5m])
        )
      ) > 1000
    for: 5m
    labels:
      severity: warning
    annotations:
      summary: "P99 latency above 1s for app {{ $labels.app_id }}"

  - alert: DaprSidecarDown
    expr: |
      kube_pod_container_status_running{container="daprd"} == 0
    for: 2m
    labels:
      severity: critical
    annotations:
      summary: "Dapr sidecar not running in pod {{ $labels.pod }}"

  - alert: DaprComponentUnhealthy
    expr: |
      rate(dapr_component_state_count{success="false"}[5m]) > 0
    for: 1m
    labels:
      severity: warning
    annotations:
      summary: "Dapr component {{ $labels.component }} has errors"
```

## Applying Alert Rules in Kubernetes

```bash
kubectl create configmap dapr-alert-rules \
  --from-file=dapr-alerts.yaml=dapr-alerts.yaml \
  -n monitoring

# If using Prometheus Operator
kubectl apply -f - <<EOF
apiVersion: monitoring.coreos.com/v1
kind: PrometheusRule
metadata:
  name: dapr-alerts
  namespace: monitoring
  labels:
    release: prometheus
spec:
  groups:
  - name: dapr-service-alerts
    rules:
    - alert: DaprHighErrorRate
      expr: |
        sum by (app_id) (rate(dapr_http_server_request_count{status!~"2.."}[5m]))
        / sum by (app_id) (rate(dapr_http_server_request_count[5m])) > 0.05
      for: 3m
      labels:
        severity: warning
EOF
```

## Configuring Alertmanager Routes

Route Dapr alerts to Slack:

```yaml
route:
  group_by: ['alertname', 'app_id']
  group_wait: 30s
  group_interval: 5m
  repeat_interval: 12h
  receiver: 'slack-dapr'
  routes:
  - matchers:
    - severity = critical
    receiver: 'pagerduty-dapr'

receivers:
- name: 'slack-dapr'
  slack_configs:
  - api_url: 'https://hooks.slack.com/services/YOUR/WEBHOOK/URL'
    channel: '#dapr-alerts'
    text: '{{ range .Alerts }}{{ .Annotations.summary }}{{ end }}'

- name: 'pagerduty-dapr'
  pagerduty_configs:
  - routing_key: '<YOUR_PAGERDUTY_KEY>'
```

## Testing Alerts

Simulate high error rates to verify alerting works:

```bash
# Generate errors by calling a non-existent method
for i in $(seq 1 100); do
  curl -s http://localhost:3500/v1.0/invoke/order-service/method/nonexistent > /dev/null
done

# Check pending alerts
curl http://localhost:9090/api/v1/alerts | jq '.data.alerts[] | select(.labels.alertname | startswith("Dapr"))'
```

## Summary

Effective Dapr alerting covers error rates, latency, sidecar availability, and component health. Use Prometheus alerting rules with a 3-5 minute `for` clause to avoid flapping alerts. Route critical alerts like sidecar down events to PagerDuty and warning-level alerts to Slack. Test your alert rules by generating synthetic load or errors before relying on them in production.
