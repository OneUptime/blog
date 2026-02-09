# How to Implement cert-manager Certificate Renewal Automation and Monitoring

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Kubernetes, TLS, Monitoring

Description: Learn how to configure cert-manager certificate renewal automation, set up monitoring for certificate expiration, and implement best practices for reliable certificate lifecycle management.

---

Automated certificate renewal is one of cert-manager's most valuable features. Expired certificates cause outages, failed API calls, and broken user experiences. Manual renewal processes are error-prone and don't scale. cert-manager eliminates this operational burden by automatically renewing certificates before they expire.

However, automation requires monitoring. You need visibility into certificate status, renewal attempts, and potential failures. This guide covers configuring renewal automation, implementing comprehensive monitoring, and ensuring your certificates renew reliably without manual intervention.

## Understanding cert-manager Renewal Logic

cert-manager continuously monitors Certificate resources and initiates renewal based on specific triggers. By default, it renews certificates when they reach a configurable time before expiration. This renewal window provides buffer time for retry attempts if renewal initially fails.

The renewal process mirrors initial certificate issuance. cert-manager creates a new CertificateRequest, completes the required challenge (HTTP-01, DNS-01, etc.), obtains the new certificate, and updates the target secret. The entire process happens automatically without service disruption.

Certificate renewal is non-disruptive for most applications. When cert-manager updates the secret, applications reading certificates dynamically (like Ingress controllers) pick up the new certificate automatically. Applications that cache certificates need configuration to watch for secret changes.

## Configuring Renewal Parameters

Control renewal timing through the renewBefore field in Certificate specifications:

```yaml
# example-certificate-renewal.yaml
apiVersion: cert-manager.io/v1
kind: Certificate
metadata:
  name: app-cert
  namespace: production
spec:
  secretName: app-tls
  issuerRef:
    name: letsencrypt-prod
    kind: ClusterIssuer

  # Certificate duration (Let's Encrypt issues 90-day certificates)
  duration: 2160h # 90 days

  # Renew 30 days before expiration (default: 2/3 of duration)
  renewBefore: 720h # 30 days

  dnsNames:
  - app.example.com
```

With this configuration, cert-manager initiates renewal when the certificate has 30 days remaining. If the certificate duration is 90 days, renewal starts at day 60.

The default renewBefore is 2/3 of the certificate duration if not specified. For a 90-day certificate, this means renewal at 60 days remaining. This provides ample buffer time for handling renewal failures.

## Automatic Renewal for ACME Certificates

Let's Encrypt certificates (issued via ACME protocol) have specific renewal considerations:

```yaml
# letsencrypt-certificate.yaml
apiVersion: cert-manager.io/v1
kind: Certificate
metadata:
  name: web-cert
  namespace: production
spec:
  secretName: web-tls

  # Let's Encrypt issues 90-day certificates
  duration: 2160h

  # Renew 30 days before expiration
  # Provides 30 days for retry attempts
  renewBefore: 720h

  issuerRef:
    name: letsencrypt-prod
    kind: ClusterIssuer

  # Private key rotation on renewal (recommended)
  privateKey:
    rotationPolicy: Always
    algorithm: RSA
    size: 2048

  dnsNames:
  - web.example.com
```

Let's Encrypt has rate limits (50 certificates per registered domain per week). Setting renewBefore to 30 days ensures renewal happens well before expiration, providing time to handle rate limit issues without risking certificate expiration.

## Monitoring Certificate Expiration

Implement monitoring to track certificate expiration and renewal status. Start by listing all certificates and their expiration:

```bash
# List all certificates with expiration info
kubectl get certificates --all-namespaces -o custom-columns=\
NAMESPACE:.metadata.namespace,\
NAME:.metadata.name,\
READY:.status.conditions[0].status,\
EXPIRATION:.status.notAfter

# Find certificates expiring soon (within 30 days)
kubectl get certificates --all-namespaces -o json | \
  jq -r '.items[] | select(.status.notAfter != null) |
  "\(.metadata.namespace) \(.metadata.name) \(.status.notAfter)"'
```

Check certificate renewal status:

```bash
# Check certificate status
kubectl describe certificate <cert-name> -n <namespace>

# Look for renewal events
kubectl get events --field-selector involvedObject.kind=Certificate -n <namespace>

# Check last renewal time
kubectl get certificate <cert-name> -n <namespace> \
  -o jsonpath='{.status.renewalTime}'
```

## Prometheus Metrics Integration

cert-manager exposes Prometheus metrics for certificate monitoring. Enable metrics in cert-manager deployment:

```yaml
# cert-manager-values.yaml (if using Helm)
prometheus:
  enabled: true
  servicemonitor:
    enabled: true
    prometheusInstance: default
```

Key metrics to monitor:

```bash
# Certificate expiration time (timestamp)
certmanager_certificate_expiration_timestamp_seconds

# Certificate readiness status (0=not ready, 1=ready)
certmanager_certificate_ready_status

# Time until certificate renewal
certmanager_certificate_renewal_timestamp_seconds
```

Create Prometheus rules for alerting on certificate issues:

```yaml
# prometheus-rules.yaml
apiVersion: monitoring.coreos.com/v1
kind: PrometheusRule
metadata:
  name: cert-manager-alerts
  namespace: monitoring
spec:
  groups:
  - name: cert-manager
    interval: 30s
    rules:
    # Alert when certificate expires in less than 7 days
    - alert: CertificateExpiringSoon
      expr: |
        (certmanager_certificate_expiration_timestamp_seconds - time()) / 86400 < 7
      for: 1h
      labels:
        severity: warning
      annotations:
        summary: "Certificate {{ $labels.name }} expiring soon"
        description: "Certificate {{ $labels.name }} in namespace {{ $labels.namespace }} expires in {{ $value }} days"

    # Alert when certificate is not ready
    - alert: CertificateNotReady
      expr: certmanager_certificate_ready_status == 0
      for: 10m
      labels:
        severity: critical
      annotations:
        summary: "Certificate {{ $labels.name }} not ready"
        description: "Certificate {{ $labels.name }} in namespace {{ $labels.namespace }} has been not ready for 10 minutes"

    # Alert when certificate renewal fails
    - alert: CertificateRenewalFailed
      expr: |
        increase(certmanager_certificate_renewal_timestamp_seconds[1h]) == 0
        and (certmanager_certificate_expiration_timestamp_seconds - time()) / 86400 < 30
      for: 6h
      labels:
        severity: warning
      annotations:
        summary: "Certificate {{ $labels.name }} renewal may have failed"
        description: "Certificate {{ $labels.name }} expires in less than 30 days but hasn't renewed recently"
```

Apply the Prometheus rules:

```bash
kubectl apply -f prometheus-rules.yaml
```

## Grafana Dashboard for Certificate Monitoring

Create a Grafana dashboard to visualize certificate status:

```json
{
  "dashboard": {
    "title": "cert-manager Certificate Monitoring",
    "panels": [
      {
        "title": "Certificates by Expiration",
        "targets": [
          {
            "expr": "(certmanager_certificate_expiration_timestamp_seconds - time()) / 86400",
            "legendFormat": "{{ namespace }}/{{ name }}"
          }
        ]
      },
      {
        "title": "Certificate Ready Status",
        "targets": [
          {
            "expr": "certmanager_certificate_ready_status",
            "legendFormat": "{{ namespace }}/{{ name }}"
          }
        ]
      },
      {
        "title": "Certificates Expiring in 30 Days",
        "targets": [
          {
            "expr": "count((certmanager_certificate_expiration_timestamp_seconds - time()) / 86400 < 30)"
          }
        ]
      }
    ]
  }
}
```

This dashboard shows:
- Time until certificate expiration
- Certificate ready status
- Count of certificates expiring soon

## Handling Renewal Failures

When renewal fails, cert-manager retries with exponential backoff. Monitor for failed renewals:

```bash
# Check CertificateRequest resources for failures
kubectl get certificaterequest --all-namespaces

# View failed CertificateRequest details
kubectl describe certificaterequest <request-name> -n <namespace>

# Check for failed Challenge resources (ACME)
kubectl get challenges --all-namespaces

# View challenge failure details
kubectl describe challenge <challenge-name> -n <namespace>
```

Common renewal failure causes:
- DNS changes preventing domain validation
- Expired cloud credentials (for DNS-01 challenges)
- Rate limits from certificate authority
- Network connectivity issues

Address failures by examining the CertificateRequest and Challenge status messages.

## Testing Renewal Automation

Test renewal before relying on it in production:

```yaml
# test-renewal-certificate.yaml
apiVersion: cert-manager.io/v1
kind: Certificate
metadata:
  name: renewal-test
  namespace: default
spec:
  secretName: renewal-test-tls

  # Short duration for testing
  duration: 24h

  # Renew quickly for testing
  renewBefore: 12h

  issuerRef:
    name: letsencrypt-staging # Use staging for testing
    kind: ClusterIssuer

  dnsNames:
  - test.example.com
```

This certificate renews after 12 hours, allowing you to verify renewal automation quickly. Monitor the renewal:

```bash
# Apply test certificate
kubectl apply -f test-renewal-certificate.yaml

# Watch certificate status
kubectl get certificate renewal-test -w

# After 12 hours, verify renewal occurred
kubectl describe certificate renewal-test

# Check certificate events for renewal activity
kubectl get events --field-selector involvedObject.name=renewal-test
```

## Renewal Notifications

Configure notifications when certificates renew or fail to renew. Use tools like OneUptime, PagerDuty, or custom webhooks:

```yaml
# Example: alertmanager config for cert-manager alerts
apiVersion: v1
kind: ConfigMap
metadata:
  name: alertmanager-config
  namespace: monitoring
data:
  alertmanager.yml: |
    route:
      group_by: ['alertname', 'namespace']
      receiver: 'team-notifications'
      routes:
      - match:
          alertname: CertificateExpiringSoon
        receiver: 'certificate-alerts'
      - match:
          alertname: CertificateNotReady
        receiver: 'certificate-critical'

    receivers:
    - name: 'certificate-alerts'
      slack_configs:
      - api_url: 'https://hooks.slack.com/services/YOUR/WEBHOOK/URL'
        channel: '#certificate-alerts'
        text: '{{ range .Alerts }}{{ .Annotations.description }}{{ end }}'

    - name: 'certificate-critical'
      pagerduty_configs:
      - service_key: 'YOUR-PAGERDUTY-KEY'
```

## Implementing Certificate Pre-Renewal Checks

Before renewal, verify the new certificate will work. Implement pre-renewal validation:

```yaml
# certificate-with-validation.yaml
apiVersion: cert-manager.io/v1
kind: Certificate
metadata:
  name: validated-cert
  namespace: production
spec:
  secretName: validated-cert-tls
  duration: 2160h
  renewBefore: 720h

  issuerRef:
    name: letsencrypt-prod
    kind: ClusterIssuer

  dnsNames:
  - app.example.com

  # Additional validation
  usages:
  - digital signature
  - key encipherment
  - server auth

  # Subject configuration
  subject:
    organizations:
    - Example Org

  # Private key configuration
  privateKey:
    algorithm: RSA
    size: 2048
    rotationPolicy: Always
```

The usages field ensures the certificate includes specific key usage extensions. This validation prevents issuing certificates that don't meet your application requirements.

## Automatic Secret Cleanup

cert-manager can clean up old certificate secrets after renewal:

```yaml
# certificate-with-cleanup.yaml
apiVersion: cert-manager.io/v1
kind: Certificate
metadata:
  name: auto-cleanup-cert
  namespace: production
spec:
  secretName: auto-cleanup-tls
  duration: 2160h
  renewBefore: 720h

  issuerRef:
    name: letsencrypt-prod
    kind: ClusterIssuer

  dnsNames:
  - app.example.com

  # Configure secret template
  secretTemplate:
    labels:
      managed-by: cert-manager
```

## Best Practices for Renewal Automation

Set renewBefore to at least 1/3 of certificate duration. This provides ample buffer time for handling failures and retries.

Monitor certificate expiration metrics continuously. Set up alerts for certificates expiring within 7 days as a safety net if auto-renewal fails.

Use staging environments to test renewal automation. Verify renewals work before deploying to production.

Implement multiple alerting channels for certificate issues. Critical certificate failures should page on-call engineers.

Document incident response procedures for renewal failures. Teams need clear steps for manual intervention when automation fails.

Test disaster recovery scenarios. Verify you can manually renew certificates if cert-manager fails completely.

Review certificate inventory regularly. Remove unused certificates to reduce management overhead.

Use private key rotation on renewal (rotationPolicy: Always). This improves security by limiting private key lifetime.

## Conclusion

Certificate renewal automation eliminates a major operational burden and reduces the risk of outages from expired certificates. However, automation requires comprehensive monitoring to ensure it works reliably.

By combining cert-manager's renewal automation with proper monitoring, alerting, and incident response procedures, you create a robust certificate management system that scales from small clusters to large enterprise deployments. The key is treating certificate lifecycle management as a critical system requiring the same attention as other production infrastructure.
