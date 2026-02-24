# How to Set Up Complete Monitoring and Alerting with Istio

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Istio, Monitoring, Alerting, Prometheus, Grafana

Description: Build a production-grade monitoring and alerting system for Istio with Prometheus rules, Grafana dashboards, and multi-tier alert routing.

---

Setting up monitoring is one thing. Setting up monitoring that actually helps you catch problems before your users notice them is something else entirely. A complete monitoring and alerting system for Istio needs to cover the data plane, the control plane, and the application layer. Here's how to build one that works in production.

## What to Monitor

An Istio mesh has three layers that each need monitoring:

1. **Data Plane**: The Envoy sidecar proxies that handle traffic
2. **Control Plane**: istiod, which manages configuration and certificates
3. **Application Layer**: Your actual services running inside the mesh

Each layer has different failure modes and needs different monitoring strategies.

## Data Plane Monitoring

### Key Metrics

The most important data plane metrics come from the `istio_requests_total` and `istio_request_duration_milliseconds` metric families:

```yaml
# Prometheus recording rules to pre-compute common queries
apiVersion: monitoring.coreos.com/v1
kind: PrometheusRule
metadata:
  name: istio-data-plane-rules
  namespace: monitoring
spec:
  groups:
  - name: istio.data-plane
    interval: 30s
    rules:
    # Request rate per service
    - record: istio:service:request_rate:5m
      expr: |
        sum(rate(istio_requests_total[5m])) by (destination_service, destination_service_namespace)

    # Error rate per service
    - record: istio:service:error_rate:5m
      expr: |
        sum(rate(istio_requests_total{response_code=~"5.*"}[5m])) by (destination_service, destination_service_namespace)
        /
        sum(rate(istio_requests_total[5m])) by (destination_service, destination_service_namespace)

    # P99 latency per service
    - record: istio:service:latency_p99:5m
      expr: |
        histogram_quantile(0.99,
          sum(rate(istio_request_duration_milliseconds_bucket[5m])) by (le, destination_service, destination_service_namespace)
        )

    # P50 latency per service
    - record: istio:service:latency_p50:5m
      expr: |
        histogram_quantile(0.50,
          sum(rate(istio_request_duration_milliseconds_bucket[5m])) by (le, destination_service, destination_service_namespace)
        )
```

### Data Plane Alerts

```yaml
apiVersion: monitoring.coreos.com/v1
kind: PrometheusRule
metadata:
  name: istio-data-plane-alerts
  namespace: monitoring
spec:
  groups:
  - name: istio.data-plane.alerts
    rules:
    # High error rate
    - alert: IstioHighErrorRate
      expr: |
        istio:service:error_rate:5m > 0.05
      for: 5m
      labels:
        severity: critical
      annotations:
        summary: "High error rate for {{ $labels.destination_service }}"
        description: "Service {{ $labels.destination_service }} has a {{ $value | humanizePercentage }} error rate"

    # High latency
    - alert: IstioHighLatency
      expr: |
        istio:service:latency_p99:5m > 2000
      for: 10m
      labels:
        severity: warning
      annotations:
        summary: "High P99 latency for {{ $labels.destination_service }}"
        description: "P99 latency is {{ $value }}ms for {{ $labels.destination_service }}"

    # No traffic (potential outage)
    - alert: IstioNoTraffic
      expr: |
        istio:service:request_rate:5m == 0
        and
        istio:service:request_rate:5m offset 1h > 0
      for: 10m
      labels:
        severity: critical
      annotations:
        summary: "No traffic to {{ $labels.destination_service }}"
        description: "{{ $labels.destination_service }} received traffic an hour ago but is receiving none now"
```

## Control Plane Monitoring

### Key Metrics

istiod exposes metrics about configuration pushes, certificate management, and resource usage:

```yaml
apiVersion: monitoring.coreos.com/v1
kind: PrometheusRule
metadata:
  name: istio-control-plane-rules
  namespace: monitoring
spec:
  groups:
  - name: istio.control-plane
    rules:
    # Config push rate
    - record: istio:pilot:push_rate:5m
      expr: |
        sum(rate(pilot_xds_pushes[5m])) by (type)

    # Push errors
    - record: istio:pilot:push_error_rate:5m
      expr: |
        sum(rate(pilot_xds_push_errors[5m]))

    # Connected proxies
    - record: istio:pilot:connected_proxies
      expr: |
        sum(pilot_xds)
```

### Control Plane Alerts

```yaml
apiVersion: monitoring.coreos.com/v1
kind: PrometheusRule
metadata:
  name: istio-control-plane-alerts
  namespace: monitoring
spec:
  groups:
  - name: istio.control-plane.alerts
    rules:
    # istiod down
    - alert: IstiodDown
      expr: |
        absent(up{job="istiod"} == 1)
      for: 2m
      labels:
        severity: critical
      annotations:
        summary: "istiod is down"
        description: "The Istio control plane has been unreachable for 2 minutes"

    # Config push errors
    - alert: IstioPushErrors
      expr: |
        istio:pilot:push_error_rate:5m > 0
      for: 5m
      labels:
        severity: warning
      annotations:
        summary: "Istio configuration push errors detected"
        description: "istiod is failing to push configuration to proxies"

    # Proxy disconnect
    - alert: IstioProxyDisconnect
      expr: |
        istio:pilot:connected_proxies < istio:pilot:connected_proxies offset 10m * 0.9
      for: 5m
      labels:
        severity: warning
      annotations:
        summary: "Significant proxy disconnection detected"
        description: "More than 10% of proxies have disconnected from istiod"

    # High convergence time
    - alert: IstioSlowConvergence
      expr: |
        histogram_quantile(0.99,
          sum(rate(pilot_proxy_convergence_time_bucket[5m])) by (le)
        ) > 30
      for: 10m
      labels:
        severity: warning
      annotations:
        summary: "Slow configuration convergence"
        description: "P99 config push time is {{ $value }} seconds"

    # Certificate expiry
    - alert: IstioCertExpiringSoon
      expr: |
        (citadel_server_root_cert_expiry_timestamp - time()) < 604800
      labels:
        severity: critical
      annotations:
        summary: "Istio root certificate expiring within 7 days"
```

## Setting Up Alertmanager

Configure Alertmanager to route alerts to the right teams:

```yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: alertmanager-config
  namespace: monitoring
data:
  alertmanager.yml: |
    global:
      resolve_timeout: 5m

    route:
      receiver: default
      group_by: ['alertname', 'destination_service']
      group_wait: 30s
      group_interval: 5m
      repeat_interval: 4h
      routes:
      # Critical alerts go to PagerDuty
      - match:
          severity: critical
        receiver: pagerduty
        continue: true

      # All alerts go to Slack
      - match_re:
          severity: critical|warning
        receiver: slack

    receivers:
    - name: default
      webhook_configs:
      - url: 'http://oneuptime-webhook.monitoring:9095/webhook'

    - name: pagerduty
      pagerduty_configs:
      - service_key: '<your-pagerduty-key>'
        description: '{{ .CommonAnnotations.summary }}'
        details:
          description: '{{ .CommonAnnotations.description }}'

    - name: slack
      slack_configs:
      - api_url: 'https://hooks.slack.com/services/YOUR/SLACK/WEBHOOK'
        channel: '#istio-alerts'
        title: '{{ .CommonAnnotations.summary }}'
        text: '{{ .CommonAnnotations.description }}'
        send_resolved: true
```

## Grafana Dashboards

### Mesh Overview Dashboard

Create a dashboard that shows the big picture:

```json
{
  "panels": [
    {
      "title": "Total Mesh Request Rate",
      "type": "timeseries",
      "targets": [{"expr": "sum(istio:service:request_rate:5m)"}]
    },
    {
      "title": "Mesh Error Rate",
      "type": "gauge",
      "targets": [{"expr": "sum(rate(istio_requests_total{response_code=~\"5.*\"}[5m])) / sum(rate(istio_requests_total[5m]))"}]
    },
    {
      "title": "Error Rate by Service",
      "type": "table",
      "targets": [{"expr": "istio:service:error_rate:5m > 0"}]
    },
    {
      "title": "P99 Latency by Service",
      "type": "timeseries",
      "targets": [{"expr": "istio:service:latency_p99:5m"}]
    }
  ]
}
```

### Service Detail Dashboard

Use a variable for the service name:

```
Variable: service
Query: label_values(istio_requests_total, destination_service)
```

Panels:
- Request rate (incoming and outgoing)
- Error rate with response code breakdown
- Latency percentiles (p50, p95, p99)
- Active connections
- Request/response size distribution

### Control Plane Dashboard

Panels:
- istiod CPU and memory usage
- Config push rate by type (CDS, EDS, LDS, RDS)
- Push errors and rejections
- Connected proxy count
- Certificate signing rate and errors
- Proxy convergence time distribution

## Synthetic Monitoring

In addition to passive metrics, set up active health checks:

```yaml
apiVersion: batch/v1
kind: CronJob
metadata:
  name: mesh-health-check
  namespace: monitoring
spec:
  schedule: "*/2 * * * *"
  jobTemplate:
    spec:
      template:
        metadata:
          labels:
            app: mesh-health-check
        spec:
          containers:
          - name: checker
            image: curlimages/curl:latest
            command:
            - /bin/sh
            - -c
            - |
              # Check each critical service
              SERVICES="user-service:8080 product-service:8080 order-service:8080"
              FAILED=0

              for SVC in $SERVICES; do
                CODE=$(curl -s -o /dev/null -w "%{http_code}" --max-time 5 "http://${SVC}/healthz")
                if [ "$CODE" != "200" ]; then
                  echo "FAIL: ${SVC} returned ${CODE}"
                  FAILED=$((FAILED + 1))
                else
                  echo "OK: ${SVC}"
                fi
              done

              if [ $FAILED -gt 0 ]; then
                echo "${FAILED} services failed health check"
                exit 1
              fi
          restartPolicy: OnFailure
```

## Alert Testing and Tuning

### Test Alerts with Fault Injection

```bash
# Inject 503 errors to trigger error rate alert
kubectl apply -f - <<EOF
apiVersion: networking.istio.io/v1
kind: VirtualService
metadata:
  name: test-faults
  namespace: default
spec:
  hosts:
  - httpbin
  http:
  - fault:
      abort:
        percentage:
          value: 20
        httpStatus: 503
    route:
    - destination:
        host: httpbin
EOF

# Generate traffic
for i in $(seq 1 500); do
  kubectl exec deploy/sleep -- curl -s http://httpbin:8000/get > /dev/null
done

# Watch for the alert to fire
# In Prometheus UI or Alertmanager
kubectl port-forward svc/alertmanager -n monitoring 9093:9093

# Clean up
kubectl delete virtualservice test-faults
```

### Tuning Guidelines

After running your alerts for a few weeks, review and tune:

1. **False positives**: If an alert fires but nothing is wrong, increase the threshold or duration
2. **Missing alerts**: If you find problems that weren't alerted, add new alerts or lower thresholds
3. **Noisy alerts**: If the same alert fires repeatedly, check if you need better grouping or deduplication
4. **Alert fatigue**: If people start ignoring alerts, reduce the number and increase quality

A good rule of thumb: every alert should be actionable. If the on-call engineer can't do anything about it, it shouldn't page them.

The combination of recording rules for efficient queries, well-tuned alerts for timely notification, and comprehensive dashboards for investigation gives you everything you need to keep an Istio mesh running reliably. Start with the critical alerts, add dashboards as you need them, and continuously tune based on what you learn from real incidents.
