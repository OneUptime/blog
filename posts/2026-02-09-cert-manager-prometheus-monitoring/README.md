# How to Implement cert-manager Certificate Monitoring with Prometheus Metrics

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Kubernetes, Monitoring, TLS

Description: Learn how to monitor cert-manager certificates using Prometheus metrics, implement comprehensive alerts for certificate expiration and renewal failures, and build Grafana dashboards.

---

Certificate monitoring is critical for preventing outages from expired certificates. While cert-manager automates renewal, monitoring provides visibility into the certificate lifecycle and early warning when automation fails. Prometheus metrics from cert-manager enable comprehensive monitoring of certificate health, renewal status, and operational issues.

This guide covers implementing complete certificate monitoring using Prometheus, creating actionable alerts, and building dashboards for certificate lifecycle visibility.

## Understanding cert-manager Metrics

cert-manager exposes Prometheus metrics on port 9402 covering:

Certificate expiration timestamps for tracking time until expiration
Certificate readiness status indicating if certificates are valid and ready
Certificate renewal timestamps for monitoring renewal activity
Controller operation metrics for troubleshooting performance issues
ACME challenge metrics for monitoring certificate issuance

These metrics enable proactive monitoring of certificate health across your entire cluster.

## Enabling Prometheus Metrics

cert-manager exposes metrics by default. Verify metrics endpoint:

```bash
# Check cert-manager metrics endpoint
kubectl port-forward -n cert-manager deployment/cert-manager 9402:9402

# Query metrics
curl http://localhost:9402/metrics
```

## Configuring Service Monitor

For Prometheus Operator, create a ServiceMonitor to scrape cert-manager metrics:

```yaml
# cert-manager-servicemonitor.yaml
apiVersion: monitoring.coreos.com/v1
kind: ServiceMonitor
metadata:
  name: cert-manager
  namespace: cert-manager
  labels:
    app: cert-manager
spec:
  selector:
    matchLabels:
      app: cert-manager
  endpoints:
  - port: tcp-prometheus-servicemonitor
    interval: 60s
    scrapeTimeout: 30s
```

Apply the ServiceMonitor:

```bash
kubectl apply -f cert-manager-servicemonitor.yaml

# Verify Prometheus scrapes cert-manager
# Check Prometheus targets page
```

For standard Prometheus, add scrape configuration:

```yaml
# prometheus-scrape-config.yaml
scrape_configs:
- job_name: 'cert-manager'
  kubernetes_sd_configs:
  - role: endpoints
    namespaces:
      names:
      - cert-manager
  relabel_configs:
  - source_labels: [__meta_kubernetes_service_name]
    action: keep
    regex: cert-manager
  - source_labels: [__meta_kubernetes_endpoint_port_name]
    action: keep
    regex: tcp-prometheus-servicemonitor
```

## Key Metrics to Monitor

### Certificate Expiration

```promql
# Time until certificate expiration (seconds)
certmanager_certificate_expiration_timestamp_seconds

# Time until expiration in days
(certmanager_certificate_expiration_timestamp_seconds - time()) / 86400

# Certificates expiring in next 30 days
count((certmanager_certificate_expiration_timestamp_seconds - time()) / 86400 < 30)

# Certificates expiring in next 7 days (critical)
count((certmanager_certificate_expiration_timestamp_seconds - time()) / 86400 < 7)
```

### Certificate Readiness

```promql
# Certificate ready status (1 = ready, 0 = not ready)
certmanager_certificate_ready_status

# Count of not ready certificates
count(certmanager_certificate_ready_status == 0)

# Not ready certificates by namespace
sum(certmanager_certificate_ready_status == 0) by (namespace)
```

### Certificate Renewal

```promql
# Certificate renewal timestamp
certmanager_certificate_renewal_timestamp_seconds

# Time since last renewal
time() - certmanager_certificate_renewal_timestamp_seconds

# Certificates not renewed in last 30 days
count((time() - certmanager_certificate_renewal_timestamp_seconds) / 86400 > 30)
```

## Implementing Alerts

Create comprehensive alerting rules:

```yaml
# cert-manager-alerts.yaml
apiVersion: monitoring.coreos.com/v1
kind: PrometheusRule
metadata:
  name: cert-manager-alerts
  namespace: monitoring
spec:
  groups:
  - name: certificates
    interval: 30s
    rules:
    # Critical: Certificate expires in 24 hours
    - alert: CertificateExpiresCritical
      expr: |
        (certmanager_certificate_expiration_timestamp_seconds - time()) / 3600 < 24
      labels:
        severity: critical
      annotations:
        summary: "Certificate {{ $labels.name }} expires in 24 hours"
        description: |
          Certificate {{ $labels.name }} in namespace {{ $labels.namespace }}
          expires in {{ $value }} hours. Immediate action required.

    # Warning: Certificate expires in 7 days
    - alert: CertificateExpiresWarning
      expr: |
        (certmanager_certificate_expiration_timestamp_seconds - time()) / 86400 < 7
      labels:
        severity: warning
      annotations:
        summary: "Certificate {{ $labels.name }} expires in 7 days"
        description: |
          Certificate {{ $labels.name }} in namespace {{ $labels.namespace }}
          expires in {{ $value }} days. Check renewal status.

    # Info: Certificate expires in 30 days
    - alert: CertificateExpiresInfo
      expr: |
        (certmanager_certificate_expiration_timestamp_seconds - time()) / 86400 < 30
      labels:
        severity: info
      annotations:
        summary: "Certificate {{ $labels.name }} expires in 30 days"
        description: |
          Certificate {{ $labels.name }} in namespace {{ $labels.namespace }}
          expires in {{ $value }} days. Normal renewal window.

    # Certificate not ready
    - alert: CertificateNotReady
      expr: certmanager_certificate_ready_status == 0
      for: 10m
      labels:
        severity: critical
      annotations:
        summary: "Certificate {{ $labels.name }} not ready"
        description: |
          Certificate {{ $labels.name }} in namespace {{ $labels.namespace }}
          has been not ready for 10 minutes. Check certificate status.

    # Renewal failing
    - alert: CertificateRenewalFailed
      expr: |
        (certmanager_certificate_expiration_timestamp_seconds - time()) / 86400 < 30
        and
        increase(certmanager_certificate_renewal_timestamp_seconds[24h]) == 0
      for: 6h
      labels:
        severity: warning
      annotations:
        summary: "Certificate {{ $labels.name }} renewal may have failed"
        description: |
          Certificate {{ $labels.name }} in namespace {{ $labels.namespace }}
          expires in {{ $value }} days but hasn't renewed in 24 hours.
          Check renewal status and logs.

    # Too many not ready certificates
    - alert: ManyNotReadyCertificates
      expr: count(certmanager_certificate_ready_status == 0) > 5
      for: 15m
      labels:
        severity: warning
      annotations:
        summary: "{{ $value }} certificates not ready"
        description: |
          {{ $value }} certificates across the cluster are not ready.
          This may indicate a systemic issue with cert-manager or issuers.

    # ACME challenge failures
    - alert: ACMEChallengeFailed
      expr: |
        rate(certmanager_http_acme_client_request_count{status!~"2.."}[5m]) > 0
      for: 10m
      labels:
        severity: warning
      annotations:
        summary: "ACME challenge failures detected"
        description: |
          ACME challenges are failing. Check cert-manager logs and
          HTTP-01/DNS-01 challenge configuration.
```

Apply the alerts:

```bash
kubectl apply -f cert-manager-alerts.yaml

# Verify alerts loaded
kubectl get prometheusrule cert-manager-alerts -n monitoring
```

## Building Grafana Dashboards

Create a comprehensive Grafana dashboard for certificate monitoring:

```json
{
  "dashboard": {
    "title": "cert-manager Certificate Monitoring",
    "panels": [
      {
        "title": "Certificates by Expiration",
        "type": "graph",
        "targets": [
          {
            "expr": "(certmanager_certificate_expiration_timestamp_seconds - time()) / 86400",
            "legendFormat": "{{ namespace }}/{{ name }}"
          }
        ],
        "yaxes": [
          {
            "label": "Days Until Expiration"
          }
        ]
      },
      {
        "title": "Certificate Readiness",
        "type": "stat",
        "targets": [
          {
            "expr": "sum(certmanager_certificate_ready_status)"
          }
        ],
        "options": {
          "colorMode": "value",
          "graphMode": "area"
        }
      },
      {
        "title": "Not Ready Certificates",
        "type": "stat",
        "targets": [
          {
            "expr": "count(certmanager_certificate_ready_status == 0)"
          }
        ],
        "options": {
          "colorMode": "value",
          "graphMode": "area",
          "thresholds": {
            "mode": "absolute",
            "steps": [
              { "value": 0, "color": "green" },
              { "value": 1, "color": "red" }
            ]
          }
        }
      },
      {
        "title": "Certificates Expiring Soon",
        "type": "table",
        "targets": [
          {
            "expr": "(certmanager_certificate_expiration_timestamp_seconds - time()) / 86400 < 30",
            "format": "table",
            "instant": true
          }
        ],
        "transformations": [
          {
            "id": "organize",
            "options": {
              "excludeByName": {},
              "indexByName": {
                "namespace": 0,
                "name": 1,
                "Value": 2
              },
              "renameByName": {
                "name": "Certificate",
                "namespace": "Namespace",
                "Value": "Days Until Expiration"
              }
            }
          }
        ]
      },
      {
        "title": "Certificate Renewal Activity",
        "type": "graph",
        "targets": [
          {
            "expr": "changes(certmanager_certificate_renewal_timestamp_seconds[1d])",
            "legendFormat": "{{ namespace }}/{{ name }}"
          }
        ]
      },
      {
        "title": "Certificates by Issuer",
        "type": "piechart",
        "targets": [
          {
            "expr": "count(certmanager_certificate_ready_status) by (issuer_name, issuer_kind)"
          }
        ]
      },
      {
        "title": "Controller Request Rate",
        "type": "graph",
        "targets": [
          {
            "expr": "rate(certmanager_controller_sync_call_count[5m])",
            "legendFormat": "{{ controller }}"
          }
        ]
      },
      {
        "title": "ACME HTTP Requests",
        "type": "graph",
        "targets": [
          {
            "expr": "rate(certmanager_http_acme_client_request_count[5m])",
            "legendFormat": "{{ method }} - {{ status }}"
          }
        ]
      }
    ]
  }
}
```

Import this dashboard into Grafana for comprehensive certificate visibility.

## Monitoring Certificate Lifecycle

Track certificate lifecycle events:

```promql
# New certificates created (last 24 hours)
count(changes(certmanager_certificate_ready_status[24h]) > 0)

# Certificates renewed (last 7 days)
count(changes(certmanager_certificate_renewal_timestamp_seconds[7d]) > 0)

# Average certificate age
avg(time() - certmanager_certificate_renewal_timestamp_seconds)

# Certificate churn rate
rate(certmanager_certificate_ready_status[1h])
```

## Issuer-Specific Monitoring

Monitor issuer health and performance:

```promql
# Certificates by issuer
count(certmanager_certificate_ready_status) by (issuer_name, issuer_kind)

# Not ready certificates by issuer
count(certmanager_certificate_ready_status == 0) by (issuer_name)

# Certificate request rate by issuer
rate(certmanager_controller_sync_call_count{controller="certificates"}[5m])
```

## Advanced Monitoring Queries

### Certificate Renewal Prediction

```promql
# Predict certificates needing renewal in next 24 hours
predict_linear(certmanager_certificate_expiration_timestamp_seconds[1h], 86400) - time() < 0
```

### Certificate Distribution by Namespace

```promql
# Certificates per namespace
count(certmanager_certificate_ready_status) by (namespace)

# Average expiration time by namespace
avg((certmanager_certificate_expiration_timestamp_seconds - time()) / 86400) by (namespace)
```

### Renewal Success Rate

```promql
# Certificate renewal success rate
sum(rate(certmanager_certificate_renewal_timestamp_seconds[1d]))
/
sum(rate(certmanager_certificate_expiration_timestamp_seconds[1d]))
```

## Integration with Alerting Systems

### PagerDuty Integration

```yaml
# alertmanager-config.yaml
route:
  routes:
  - match:
      severity: critical
      alertname: CertificateExpiresCritical
    receiver: pagerduty-critical

receivers:
- name: pagerduty-critical
  pagerduty_configs:
  - service_key: YOUR_PAGERDUTY_KEY
    description: "{{ .GroupLabels.alertname }}"
```

### Slack Integration

```yaml
route:
  routes:
  - match:
      severity: warning
      alertname: CertificateExpiresWarning
    receiver: slack-certificates

receivers:
- name: slack-certificates
  slack_configs:
  - api_url: 'https://hooks.slack.com/services/YOUR/WEBHOOK/URL'
    channel: '#certificates'
    title: 'Certificate Alert'
    text: |
      {{ range .Alerts }}
      *Alert:* {{ .Annotations.summary }}
      *Description:* {{ .Annotations.description }}
      *Details:*
        • Namespace: {{ .Labels.namespace }}
        • Certificate: {{ .Labels.name }}
      {{ end }}
```

## Monitoring Best Practices

Set alert thresholds appropriately. Use 7 days for warnings and 24 hours for critical alerts to provide adequate response time.

Create graduated alerts with multiple severity levels. Info, warning, and critical alerts enable appropriate response urgency.

Monitor both expiration and renewal. Track not just when certificates expire but also when they should renew.

Alert on systemic issues. Multiple certificate failures may indicate broader problems with cert-manager or issuers.

Use recording rules for expensive queries. Pre-calculate complex metrics to reduce dashboard load times.

Implement alert fatigue prevention. Use for clauses to prevent alerting on transient issues.

## Recording Rules for Performance

Create recording rules for frequently used queries:

```yaml
# cert-manager-recording-rules.yaml
apiVersion: monitoring.coreos.com/v1
kind: PrometheusRule
metadata:
  name: cert-manager-recording-rules
  namespace: monitoring
spec:
  groups:
  - name: cert-manager-recordings
    interval: 60s
    rules:
    # Days until certificate expiration
    - record: cert:expiration:days
      expr: |
        (certmanager_certificate_expiration_timestamp_seconds - time()) / 86400

    # Certificate readiness percentage
    - record: cert:ready:percentage
      expr: |
        sum(certmanager_certificate_ready_status) / count(certmanager_certificate_ready_status) * 100

    # Certificates by expiration bucket
    - record: cert:expiration:bucket
      expr: |
        count((certmanager_certificate_expiration_timestamp_seconds - time()) / 86400 < 7) or vector(0)
      labels:
        bucket: "7d"

    - record: cert:expiration:bucket
      expr: |
        count((certmanager_certificate_expiration_timestamp_seconds - time()) / 86400 < 30 and
               (certmanager_certificate_expiration_timestamp_seconds - time()) / 86400 >= 7) or vector(0)
      labels:
        bucket: "7-30d"

    - record: cert:expiration:bucket
      expr: |
        count((certmanager_certificate_expiration_timestamp_seconds - time()) / 86400 >= 30) or vector(0)
      labels:
        bucket: "30d+"
```

## Troubleshooting with Metrics

Use metrics to troubleshoot certificate issues:

```promql
# Find certificates failing renewal
certmanager_certificate_ready_status == 0

# Check controller sync failures
rate(certmanager_controller_sync_call_count{status="error"}[5m]) > 0

# Identify slow ACME operations
histogram_quantile(0.99, rate(certmanager_http_acme_client_request_duration_seconds_bucket[5m]))

# Monitor certificate request queue depth
certmanager_controller_queue_depth
```

## Conclusion

Comprehensive monitoring of cert-manager with Prometheus provides essential visibility into certificate health and renewal status. Combined with actionable alerts and informative dashboards, it enables proactive certificate management and rapid incident response when issues occur.

This monitoring infrastructure is critical for production environments where certificate expiration can cause significant outages. The metrics and alerts described here provide defense in depth against certificate-related incidents, complementing cert-manager's automated renewal with human oversight and intervention capabilities.
