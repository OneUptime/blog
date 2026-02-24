# How to Create Custom Alerting Rules for Istio

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Istio, Alerting, Prometheus, Monitoring, SRE

Description: How to create and configure custom Prometheus alerting rules for Istio service mesh covering error rates, latency, and control plane health.

---

Monitoring is only half the equation. You can have the most beautiful Grafana dashboards in the world, but if nobody is watching them at 3 AM when things go wrong, they are useless. Alerting bridges that gap by proactively notifying you when something needs attention. With Istio generating rich metrics for every service interaction, you can build targeted alerts that catch problems before users notice them.

## Setting Up the Alerting Pipeline

Alerts in the Prometheus ecosystem flow through three stages: Prometheus evaluates rules, fires alerts to Alertmanager, and Alertmanager routes them to receivers (Slack, PagerDuty, email, etc.).

If you installed kube-prometheus-stack, Alertmanager is already running. Configure receivers:

```yaml
apiVersion: monitoring.coreos.com/v1alpha1
kind: AlertmanagerConfig
metadata:
  name: istio-alerts-config
  namespace: monitoring
spec:
  route:
    receiver: default-receiver
    groupBy: ['alertname', 'namespace', 'service']
    groupWait: 30s
    groupInterval: 5m
    repeatInterval: 4h
    routes:
    - receiver: critical-receiver
      matchers:
      - name: severity
        value: critical
      repeatInterval: 15m
    - receiver: warning-receiver
      matchers:
      - name: severity
        value: warning
      repeatInterval: 1h
  receivers:
  - name: default-receiver
    slackConfigs:
    - channel: '#istio-alerts'
      apiURL:
        name: slack-webhook-secret
        key: url
      sendResolved: true
  - name: critical-receiver
    pagerdutyConfigs:
    - routingKey:
        name: pagerduty-secret
        key: routing-key
      severity: critical
  - name: warning-receiver
    slackConfigs:
    - channel: '#istio-warnings'
      apiURL:
        name: slack-webhook-secret
        key: url
      sendResolved: true
```

## Service Error Rate Alerts

The most fundamental alert: catch when services start returning errors.

```yaml
apiVersion: monitoring.coreos.com/v1
kind: PrometheusRule
metadata:
  name: istio-service-alerts
  namespace: monitoring
  labels:
    release: prometheus
spec:
  groups:
  - name: istio-service-error-rates
    interval: 30s
    rules:
    - alert: IstioHighErrorRate
      expr: |
        (
          sum(rate(istio_requests_total{response_code=~"5.*",reporter="destination"}[5m])) by (destination_service_namespace, destination_service_name)
          /
          sum(rate(istio_requests_total{reporter="destination"}[5m])) by (destination_service_namespace, destination_service_name)
        ) > 0.05
      for: 5m
      labels:
        severity: critical
      annotations:
        summary: "High error rate on {{ $labels.destination_service_name }}"
        description: "Service {{ $labels.destination_service_name }} in namespace {{ $labels.destination_service_namespace }} has a 5xx error rate above 5% for the last 5 minutes. Current value: {{ $value | humanizePercentage }}"

    - alert: IstioServiceErrors
      expr: |
        (
          sum(rate(istio_requests_total{response_code=~"5.*",reporter="destination"}[5m])) by (destination_service_namespace, destination_service_name)
          /
          sum(rate(istio_requests_total{reporter="destination"}[5m])) by (destination_service_namespace, destination_service_name)
        ) > 0.01
      for: 10m
      labels:
        severity: warning
      annotations:
        summary: "Elevated error rate on {{ $labels.destination_service_name }}"
        description: "Service {{ $labels.destination_service_name }} has an error rate above 1% for the last 10 minutes."
```

## Latency Alerts

Catch services that are responding slowly:

```yaml
apiVersion: monitoring.coreos.com/v1
kind: PrometheusRule
metadata:
  name: istio-latency-alerts
  namespace: monitoring
  labels:
    release: prometheus
spec:
  groups:
  - name: istio-latency
    rules:
    - alert: IstioHighP99Latency
      expr: |
        histogram_quantile(0.99,
          sum(rate(istio_request_duration_milliseconds_bucket{reporter="destination"}[5m])) by (le, destination_service_namespace, destination_service_name)
        ) > 1000
      for: 5m
      labels:
        severity: warning
      annotations:
        summary: "High P99 latency on {{ $labels.destination_service_name }}"
        description: "P99 latency for {{ $labels.destination_service_name }} is above 1 second. Current value: {{ $value }}ms"

    - alert: IstioHighP50Latency
      expr: |
        histogram_quantile(0.50,
          sum(rate(istio_request_duration_milliseconds_bucket{reporter="destination"}[5m])) by (le, destination_service_namespace, destination_service_name)
        ) > 500
      for: 10m
      labels:
        severity: warning
      annotations:
        summary: "High median latency on {{ $labels.destination_service_name }}"
        description: "Median latency for {{ $labels.destination_service_name }} is above 500ms."

    - alert: IstioLatencySpike
      expr: |
        histogram_quantile(0.99,
          sum(rate(istio_request_duration_milliseconds_bucket{reporter="destination"}[5m])) by (le, destination_service_namespace, destination_service_name)
        )
        >
        3 * histogram_quantile(0.99,
          sum(rate(istio_request_duration_milliseconds_bucket{reporter="destination"}[1h])) by (le, destination_service_namespace, destination_service_name)
        )
      for: 5m
      labels:
        severity: critical
      annotations:
        summary: "Latency spike on {{ $labels.destination_service_name }}"
        description: "P99 latency has spiked to 3x the hourly average."
```

The latency spike alert is particularly useful because it catches relative degradation rather than absolute thresholds. A service that normally responds in 50ms suddenly taking 150ms is notable even though 150ms is not inherently slow.

## Traffic Volume Alerts

Detect unusual traffic patterns:

```yaml
apiVersion: monitoring.coreos.com/v1
kind: PrometheusRule
metadata:
  name: istio-traffic-alerts
  namespace: monitoring
  labels:
    release: prometheus
spec:
  groups:
  - name: istio-traffic
    rules:
    - alert: IstioTrafficDrop
      expr: |
        sum(rate(istio_requests_total{reporter="destination"}[5m])) by (destination_service_namespace, destination_service_name)
        < 0.1 * sum(rate(istio_requests_total{reporter="destination"}[1h])) by (destination_service_namespace, destination_service_name)
      for: 10m
      labels:
        severity: critical
      annotations:
        summary: "Traffic drop on {{ $labels.destination_service_name }}"
        description: "Traffic to {{ $labels.destination_service_name }} has dropped to less than 10% of the hourly average."

    - alert: IstioNoTraffic
      expr: |
        absent(sum(rate(istio_requests_total{reporter="destination",destination_service_name="critical-service"}[5m])))
      for: 5m
      labels:
        severity: critical
      annotations:
        summary: "No traffic to critical-service"
        description: "No requests have been received by critical-service for the last 5 minutes."
```

## Control Plane Alerts

Monitor the Istio control plane health:

```yaml
apiVersion: monitoring.coreos.com/v1
kind: PrometheusRule
metadata:
  name: istio-control-plane-alerts
  namespace: monitoring
  labels:
    release: prometheus
spec:
  groups:
  - name: istio-control-plane
    rules:
    - alert: IstiodDown
      expr: |
        absent(up{job="istiod"} == 1)
      for: 2m
      labels:
        severity: critical
      annotations:
        summary: "Istiod is down"
        description: "The Istio control plane (istiod) is not running."

    - alert: IstioConfigPushSlow
      expr: |
        histogram_quantile(0.99,
          sum(rate(pilot_proxy_convergence_time_bucket[5m])) by (le)
        ) > 10
      for: 5m
      labels:
        severity: warning
      annotations:
        summary: "Slow Istio configuration push"
        description: "P99 configuration push time is above 10 seconds."

    - alert: IstioXDSPushErrors
      expr: |
        sum(rate(pilot_xds_push_errors[5m])) > 0
      for: 5m
      labels:
        severity: warning
      annotations:
        summary: "Istio xDS push errors"
        description: "Istiod is experiencing errors pushing configuration to proxies."

    - alert: IstioPilotConflicts
      expr: |
        pilot_conflict_inbound_listener > 0 or pilot_conflict_outbound_listener_tcp_over_current_tcp > 0
      for: 5m
      labels:
        severity: warning
      annotations:
        summary: "Istio configuration conflicts detected"
        description: "There are listener conflicts in the Istio configuration."
```

## Certificate Expiry Alerts

Catch certificates before they expire:

```yaml
- alert: IstioCertificateExpiring
  expr: |
    (citadel_server_root_cert_expiry_timestamp - time()) / 86400 < 30
  for: 1h
  labels:
    severity: warning
  annotations:
    summary: "Istio root certificate expiring soon"
    description: "The Istio root certificate will expire in less than 30 days."
```

## Sidecar Injection Alerts

Make sure sidecars are being injected properly:

```yaml
- alert: IstioSidecarInjectionFailure
  expr: |
    sum(rate(sidecar_injection_failure_total[5m])) > 0
  for: 5m
  labels:
    severity: warning
  annotations:
    summary: "Istio sidecar injection failures"
    description: "Sidecar injection is failing. New pods may not be part of the mesh."
```

## Testing Your Alerts

Before relying on alerts in production, test them. You can use Prometheus's built-in rule testing or simulate conditions:

```bash
# Check that rules are loaded
kubectl port-forward svc/prometheus-kube-prometheus-prometheus -n monitoring 9090:9090

# Visit http://localhost:9090/alerts to see alert states
```

You can also use `promtool` to test rules locally:

```bash
promtool check rules istio-alert-rules.yaml
promtool test rules test-cases.yaml
```

## Alert Fatigue Prevention

A few practices to keep alerts useful:

- Set appropriate `for` durations to avoid alerting on brief spikes
- Use `groupBy` in Alertmanager to consolidate related alerts
- Set different `repeatInterval` values for different severities
- Route critical alerts to PagerDuty and warnings to Slack
- Regularly review and tune thresholds based on actual traffic patterns
- Use inhibition rules to suppress downstream alerts when a root cause is already firing

Good alerting is an iterative process. Start with the basics - error rates, latency, and control plane health - then refine thresholds based on what you learn from your actual traffic patterns. The goal is to be notified about real problems while avoiding alert fatigue from false positives.
