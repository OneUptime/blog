# How to Set Up Alerting for Istio Certificate Expiration

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Istio, Certificates, mTLS, Alerting, Security, Prometheus

Description: Learn how to set up automated alerts for Istio certificate expiration to prevent mTLS failures and service outages in your mesh.

---

Istio relies heavily on certificates for mutual TLS between services. When those certificates expire, mTLS breaks, and traffic between services starts failing. This is one of those problems that hits you at 3 AM on a Saturday if you are not monitoring it. Setting up proper alerting for certificate expiration is a straightforward way to avoid that pain.

## How Istio Handles Certificates

Istio uses a certificate authority (CA) built into Istiod to issue and rotate workload certificates automatically. By default, workload certificates have a 24-hour lifetime and get rotated well before they expire. The root CA certificate, however, has a much longer lifetime (typically 10 years for self-signed, or whatever your external CA provides).

The automatic rotation works great most of the time. But things can go wrong - Istiod might be down, the CA might become unavailable, or certificate signing requests might fail silently. That is why you need alerting.

## Checking Current Certificate Status

Before setting up alerting, take stock of your current certificate health. You can inspect the certificates used by any sidecar:

```bash
istioctl proxy-config secret deploy/my-app -n my-namespace
```

This shows the certificate chain, including expiration times. For a broader view:

```bash
istioctl proxy-config secret deploy/my-app -n my-namespace -o json | \
  jq '.dynamicActiveSecrets[] | {name: .name, valid_from: .secret.tlsCertificate.certificateChain.inlineBytes}'
```

You can also check the root CA certificate directly:

```bash
kubectl get secret istio-ca-secret -n istio-system -o jsonpath='{.data.ca-cert\.pem}' | \
  base64 -d | openssl x509 -noout -dates
```

## Key Metrics for Certificate Monitoring

Istio and Envoy expose several metrics related to certificates. Here are the ones that matter:

### Citadel/Istiod Metrics

```promql
# Number of certificate signing requests
citadel_server_csr_count

# Number of successful certificate signings
citadel_server_success_cert_issuance_count

# Number of CSR failures
citadel_server_csr_sign_error_count

# Root certificate expiry timestamp (seconds since epoch)
citadel_server_root_cert_expiry_timestamp
```

### Envoy Proxy Metrics

```promql
# Certificate expiry timestamp on each proxy
envoy_server_days_until_first_cert_expiring

# SSL handshake failures (could indicate cert issues)
envoy_cluster_ssl_handshake{cluster_name="outbound|443||my-service.my-namespace.svc.cluster.local"}
```

## Setting Up Prometheus Alert Rules

Here are the alert rules you should configure:

### Root CA Certificate Expiration

```yaml
apiVersion: monitoring.coreos.com/v1
kind: PrometheusRule
metadata:
  name: istio-cert-alerts
  namespace: istio-system
spec:
  groups:
  - name: istio-certificates
    rules:
    - alert: IstioRootCertExpiringSoon
      expr: |
        (citadel_server_root_cert_expiry_timestamp - time()) / 86400 < 30
      for: 1h
      labels:
        severity: critical
      annotations:
        summary: "Istio root CA certificate expires in less than 30 days"
        description: "The Istio root CA certificate will expire in {{ $value | humanize }} days. Rotate the root certificate immediately."
    - alert: IstioRootCertExpiring90Days
      expr: |
        (citadel_server_root_cert_expiry_timestamp - time()) / 86400 < 90
      for: 1h
      labels:
        severity: warning
      annotations:
        summary: "Istio root CA certificate expires in less than 90 days"
        description: "Plan root certificate rotation. Expiry in {{ $value | humanize }} days."
```

### Workload Certificate Issues

```yaml
    - alert: IstioCertSigningFailures
      expr: |
        rate(citadel_server_csr_sign_error_count[5m]) > 0
      for: 10m
      labels:
        severity: critical
      annotations:
        summary: "Istio certificate signing requests are failing"
        description: "CSR signing errors detected. Workload certificates may not be rotating properly."
    - alert: IstioNoCertIssuance
      expr: |
        rate(citadel_server_success_cert_issuance_count[1h]) == 0
        and
        citadel_server_csr_count > 0
      for: 30m
      labels:
        severity: warning
      annotations:
        summary: "No successful certificate issuances in the last 30 minutes"
        description: "Istiod is receiving CSR requests but not issuing certificates."
```

### Envoy-Level Certificate Alerts

```yaml
    - alert: EnvoyProxyCertExpiringSoon
      expr: |
        envoy_server_days_until_first_cert_expiring < 1
      for: 5m
      labels:
        severity: critical
      annotations:
        summary: "Envoy proxy certificate expiring within 24 hours"
        description: "Pod {{ $labels.pod }} has a certificate expiring in {{ $value }} days. Check if certificate rotation is working."
```

## Monitoring Certificate Rotation

Certificate rotation should happen seamlessly, but you want to verify it is working. Create a recording rule that tracks rotation health:

```yaml
    - record: istio:cert_rotation_success_rate
      expr: |
        rate(citadel_server_success_cert_issuance_count[5m])
        /
        rate(citadel_server_csr_count[5m])
```

If this ratio drops below 1.0, something is preventing successful certificate issuance.

## Building a Certificate Health Dashboard

A Grafana dashboard for certificate health should show:

```json
{
  "panels": [
    {
      "title": "Root CA Days Until Expiry",
      "type": "stat",
      "targets": [
        {
          "expr": "(citadel_server_root_cert_expiry_timestamp - time()) / 86400"
        }
      ]
    },
    {
      "title": "CSR Success Rate",
      "type": "timeseries",
      "targets": [
        {
          "expr": "rate(citadel_server_success_cert_issuance_count[5m])",
          "legendFormat": "Successful"
        },
        {
          "expr": "rate(citadel_server_csr_sign_error_count[5m])",
          "legendFormat": "Failed"
        }
      ]
    },
    {
      "title": "Min Days Until Proxy Cert Expiry",
      "type": "gauge",
      "targets": [
        {
          "expr": "min(envoy_server_days_until_first_cert_expiring)"
        }
      ]
    }
  ]
}
```

## Scripted Certificate Health Checks

For environments where Prometheus is not set up, you can use a shell script:

```bash
#!/bin/bash

# Check root CA expiration
ROOT_CERT_EXPIRY=$(kubectl get secret istio-ca-secret -n istio-system \
  -o jsonpath='{.data.ca-cert\.pem}' | base64 -d | \
  openssl x509 -noout -enddate | cut -d= -f2)

EXPIRY_EPOCH=$(date -d "$ROOT_CERT_EXPIRY" +%s 2>/dev/null || date -j -f "%b %d %T %Y %Z" "$ROOT_CERT_EXPIRY" +%s)
NOW_EPOCH=$(date +%s)
DAYS_LEFT=$(( (EXPIRY_EPOCH - NOW_EPOCH) / 86400 ))

echo "Root CA expires in $DAYS_LEFT days ($ROOT_CERT_EXPIRY)"

if [ "$DAYS_LEFT" -lt 30 ]; then
  echo "CRITICAL: Root CA certificate expires in less than 30 days!"
  exit 2
elif [ "$DAYS_LEFT" -lt 90 ]; then
  echo "WARNING: Root CA certificate expires in less than 90 days"
  exit 1
fi

# Check workload certificates across pods
echo "Checking workload certificates..."
for ns in $(kubectl get namespaces -l istio-injection=enabled -o name | cut -d/ -f2); do
  for pod in $(kubectl get pods -n $ns -o name); do
    CERT_INFO=$(kubectl exec $pod -n $ns -c istio-proxy -- \
      cat /var/run/secrets/istio/cert-chain.pem 2>/dev/null | \
      openssl x509 -noout -enddate 2>/dev/null)
    if [ -n "$CERT_INFO" ]; then
      echo "  $ns/$pod: $CERT_INFO"
    fi
  done
done
```

## Handling External CA Integration

If you are using an external CA like Vault, cert-manager, or your own PKI, the monitoring approach changes slightly. You need to watch the intermediate CA certificate that Istio uses:

```bash
# Check the intermediate CA cert used by Istiod
kubectl get secret cacerts -n istio-system -o jsonpath='{.data.ca-cert\.pem}' | \
  base64 -d | openssl x509 -noout -dates -subject
```

Add an alert specific to the intermediate CA:

```yaml
    - alert: IstioIntermediateCertExpiring
      expr: |
        (citadel_server_root_cert_expiry_timestamp - time()) / 86400 < 7
      for: 1h
      labels:
        severity: critical
      annotations:
        summary: "Istio intermediate CA certificate expires in less than 7 days"
```

## Testing Your Alerts

To verify your alerts work, you can temporarily lower the alert thresholds and confirm they fire. Another approach is to check the Prometheus UI directly:

```bash
kubectl port-forward svc/prometheus -n istio-system 9090:9090
```

Then visit `http://localhost:9090/alerts` to see the status of all configured alerts.

Certificate expiration alerts are the kind of thing you set up once and forget about - until the day they save you from a major outage. Take the time to get them right, and make sure they route to a channel that someone actually monitors.
