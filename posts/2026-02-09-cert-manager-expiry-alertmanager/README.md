# How to Implement cert-manager Certificate Expiry Alerting with Alertmanager

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Kubernetes, cert-manager, Alertmanager, Monitoring

Description: Learn how to set up automated certificate expiry alerting for cert-manager using Prometheus and Alertmanager to prevent unexpected outages from expired certificates.

---

Certificate expiration is one of the most common causes of production outages. When TLS certificates expire unexpectedly, services become inaccessible, API calls fail, and user trust diminishes. While cert-manager automates certificate renewal in Kubernetes, having alerting in place ensures you catch any renewal failures before they impact production.

In this guide, you'll learn how to implement comprehensive certificate expiry alerting using cert-manager's built-in metrics, Prometheus for metric collection, and Alertmanager for notification routing.

## Understanding cert-manager Metrics

cert-manager exposes several Prometheus metrics that track certificate lifecycle events. The most critical metric for expiry alerting is `certmanager_certificate_expiration_timestamp_seconds`, which provides the Unix timestamp when each certificate will expire.

Other useful metrics include:

- `certmanager_certificate_ready_status` - indicates whether a certificate is ready
- `certmanager_certificate_renewal_timestamp_seconds` - tracks when renewal attempts occur
- `certmanager_http_acme_client_request_count` - monitors ACME challenge attempts

These metrics allow you to build alerting rules that detect certificates approaching expiration, failed renewals, and other certificate-related issues.

## Setting Up Prometheus ServiceMonitor

First, ensure cert-manager is configured to expose metrics. By default, cert-manager's controller, webhook, and cainjector components expose metrics on port 9402.

Create a ServiceMonitor to tell Prometheus to scrape cert-manager metrics:

```yaml
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
      app.kubernetes.io/name: cert-manager
  endpoints:
  - port: tcp-prometheus-servicemonitor
    interval: 30s
    path: /metrics
```

Apply this configuration:

```bash
kubectl apply -f servicemonitor.yaml
```

Verify Prometheus is scraping cert-manager metrics:

```bash
# Port-forward to Prometheus
kubectl port-forward -n monitoring svc/prometheus-operated 9090:9090

# Query for cert-manager metrics
curl -s 'http://localhost:9090/api/v1/query?query=certmanager_certificate_expiration_timestamp_seconds' | jq
```

## Creating Prometheus Alert Rules

Define alert rules that trigger based on certificate expiry timelines. Create a PrometheusRule resource:

```yaml
apiVersion: monitoring.coreos.com/v1
kind: PrometheusRule
metadata:
  name: cert-manager-alerts
  namespace: monitoring
  labels:
    prometheus: kube-prometheus
spec:
  groups:
  - name: cert-manager
    interval: 30s
    rules:
    # Alert when certificate expires in less than 7 days
    - alert: CertificateExpiryWarning
      expr: |
        (certmanager_certificate_expiration_timestamp_seconds - time()) / 86400 < 7
      for: 1h
      labels:
        severity: warning
      annotations:
        summary: "Certificate {{ $labels.name }} expiring soon"
        description: "Certificate {{ $labels.name }} in namespace {{ $labels.namespace }} will expire in {{ $value | humanizeDuration }}."

    # Alert when certificate expires in less than 24 hours
    - alert: CertificateExpiryCritical
      expr: |
        (certmanager_certificate_expiration_timestamp_seconds - time()) / 86400 < 1
      for: 15m
      labels:
        severity: critical
      annotations:
        summary: "Certificate {{ $labels.name }} expiring within 24 hours"
        description: "Certificate {{ $labels.name }} in namespace {{ $labels.namespace }} expires in {{ $value | humanizeDuration }}. Immediate action required."

    # Alert when certificate is not ready
    - alert: CertificateNotReady
      expr: |
        certmanager_certificate_ready_status{condition="True"} == 0
      for: 10m
      labels:
        severity: warning
      annotations:
        summary: "Certificate {{ $labels.name }} is not ready"
        description: "Certificate {{ $labels.name }} in namespace {{ $labels.namespace }} has not been ready for 10 minutes."

    # Alert when certificate renewal fails
    - alert: CertificateRenewalFailed
      expr: |
        increase(certmanager_http_acme_client_request_count{status="error"}[15m]) > 5
      for: 5m
      labels:
        severity: critical
      annotations:
        summary: "Certificate renewal failing"
        description: "Certificate renewal has failed {{ $value }} times in the last 15 minutes."
```

Apply the alert rules:

```bash
kubectl apply -f cert-manager-alerts.yaml
```

## Configuring Alertmanager

Configure Alertmanager to route certificate alerts to appropriate channels. Create an Alertmanager configuration:

```yaml
apiVersion: v1
kind: Secret
metadata:
  name: alertmanager-main
  namespace: monitoring
type: Opaque
stringData:
  alertmanager.yaml: |
    global:
      resolve_timeout: 5m

    route:
      group_by: ['alertname', 'namespace']
      group_wait: 10s
      group_interval: 10s
      repeat_interval: 12h
      receiver: 'default'
      routes:
      # Route critical certificate alerts to PagerDuty
      - match:
          alertname: CertificateExpiryCritical
        receiver: 'pagerduty-critical'
        continue: true

      # Route certificate warnings to Slack
      - match_re:
          alertname: Certificate.*Warning
        receiver: 'slack-certificates'

    receivers:
    - name: 'default'
      slack_configs:
      - api_url: 'https://hooks.slack.com/services/YOUR/WEBHOOK/URL'
        channel: '#alerts'
        title: 'Alert: {{ .GroupLabels.alertname }}'
        text: '{{ range .Alerts }}{{ .Annotations.description }}{{ end }}'

    - name: 'slack-certificates'
      slack_configs:
      - api_url: 'https://hooks.slack.com/services/YOUR/WEBHOOK/URL'
        channel: '#certificates'
        title: 'Certificate Alert: {{ .GroupLabels.alertname }}'
        text: |
          {{ range .Alerts }}
          *Alert:* {{ .Annotations.summary }}
          *Description:* {{ .Annotations.description }}
          *Namespace:* {{ .Labels.namespace }}
          *Certificate:* {{ .Labels.name }}
          {{ end }}

    - name: 'pagerduty-critical'
      pagerduty_configs:
      - service_key: 'YOUR_PAGERDUTY_INTEGRATION_KEY'
        description: '{{ .CommonAnnotations.summary }}'
```

Apply the Alertmanager configuration:

```bash
kubectl apply -f alertmanager-config.yaml
```

## Testing Your Alert Configuration

Manually test alerts by creating a certificate with a short lifespan:

```yaml
apiVersion: cert-manager.io/v1
kind: Certificate
metadata:
  name: test-expiry-alert
  namespace: default
spec:
  secretName: test-expiry-tls
  duration: 1h  # Short duration for testing
  renewBefore: 30m
  issuerRef:
    name: selfsigned-issuer
    kind: ClusterIssuer
  dnsNames:
  - test.example.com
```

Apply this test certificate:

```bash
kubectl apply -f test-certificate.yaml

# Wait for the certificate to be created
kubectl get certificate test-expiry-alert -w

# Check the expiry timestamp metric
kubectl exec -n monitoring prometheus-0 -- promtool query instant \
  http://localhost:9090 \
  'certmanager_certificate_expiration_timestamp_seconds{name="test-expiry-alert"}'
```

Within 30 minutes, you should receive a warning alert as the certificate approaches expiration.

## Advanced Alert Configurations

Add alerts for certificate issuance velocity to detect potential issues:

```yaml
- alert: HighCertificateIssuanceRate
  expr: |
    rate(certmanager_certificate_renewal_timestamp_seconds[15m]) > 10
  for: 5m
  labels:
    severity: warning
  annotations:
    summary: "High certificate issuance rate detected"
    description: "More than 10 certificates are being issued per minute, which may indicate a problem."
```

Monitor cert-manager controller health:

```yaml
- alert: CertManagerControllerDown
  expr: |
    up{job="cert-manager"} == 0
  for: 5m
  labels:
    severity: critical
  annotations:
    summary: "cert-manager controller is down"
    description: "The cert-manager controller has been down for 5 minutes."
```

## Monitoring Certificate Metrics Dashboard

Create a Grafana dashboard to visualize certificate expiry:

```json
{
  "panels": [
    {
      "title": "Certificates Expiring Soon",
      "targets": [
        {
          "expr": "sort_desc((certmanager_certificate_expiration_timestamp_seconds - time()) / 86400)",
          "legendFormat": "{{namespace}}/{{name}}"
        }
      ]
    }
  ]
}
```

## Best Practices

Follow these best practices for certificate expiry alerting:

1. **Set multiple alert thresholds** - Use warning alerts at 7 days and critical alerts at 24 hours
2. **Monitor renewal attempts** - Alert on failed ACME challenges or renewal errors
3. **Test alert routing** - Regularly verify alerts reach the correct channels
4. **Document runbooks** - Include troubleshooting steps in alert annotations
5. **Use silences carefully** - Only silence known maintenance windows
6. **Monitor cert-manager health** - Alert if the controller or webhook pods are down
7. **Track certificate inventory** - Maintain visibility into all managed certificates

## Troubleshooting Common Issues

If alerts aren't firing:

```bash
# Check if Prometheus is scraping cert-manager
kubectl get servicemonitor -n cert-manager

# Verify metrics are being exposed
kubectl port-forward -n cert-manager svc/cert-manager 9402:9402
curl http://localhost:9402/metrics | grep certmanager_certificate_expiration

# Check PrometheusRule is loaded
kubectl get prometheusrule -n monitoring cert-manager-alerts -o yaml

# Verify Alertmanager is receiving alerts
kubectl logs -n monitoring alertmanager-main-0 -f
```

## Conclusion

Implementing certificate expiry alerting with cert-manager and Alertmanager provides essential visibility into your certificate lifecycle. By monitoring expiration timestamps, renewal attempts, and certificate readiness, you can prevent outages caused by expired certificates.

The combination of Prometheus metrics, well-tuned alert rules, and properly configured Alertmanager routing ensures your team receives timely notifications about certificate issues. Regular testing of your alerting pipeline and maintaining up-to-date runbooks will help you respond quickly when certificates need attention.
