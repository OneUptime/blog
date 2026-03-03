# How to Monitor Certificate Health in Istio

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Istio, Certificate, Monitoring, Prometheus, Security, Kubernetes

Description: How to set up comprehensive monitoring for certificate health in Istio, including metrics, alerts, and dashboards for tracking certificate expiry and rotation.

---

Certificates silently expiring is one of the most common causes of outages in service mesh environments. Everything works fine until a certificate expires and suddenly mTLS connections start failing. The fix is monitoring. If you know a certificate is about to expire, you can rotate it before it causes problems. This guide covers everything you need to monitor certificate health in Istio.

## What to Monitor

There are several layers of certificates in Istio, each with different monitoring needs:

1. **Root CA certificate** - Long-lived (years), but if it expires, the entire mesh breaks
2. **Intermediate CA certificate** - Medium-lived (months to years), needs rotation before expiry
3. **Workload certificates** - Short-lived (hours), automatically rotated, but rotation can fail
4. **Gateway TLS certificates** - Depends on your setup (Let's Encrypt, manual, etc.)

## Istiod Metrics

Istiod exposes several Prometheus metrics related to certificate health:

```text
# Root certificate expiry timestamp (Unix epoch)
citadel_server_root_cert_expiry_timestamp

# Total CSR requests received
citadel_server_csr_count

# CSR parsing errors
citadel_server_csr_parsing_err_count

# Successful certificate issuances
citadel_server_success_cert_issuance_count

# Certificate signing errors
citadel_server_csr_sign_err_count

# Authentication failures (failed to verify SA token)
citadel_server_authentication_failure_count
```

You can check these directly:

```bash
kubectl exec deployment/istiod -n istio-system -- curl -s localhost:15014/metrics | grep citadel
```

## Setting Up Prometheus Alerts

### Root CA Expiry Alert

```yaml
groups:
- name: istio-certificate-health
  rules:
  # Root CA expiring in less than 30 days
  - alert: IstioRootCAExpiringSoon
    expr: |
      (citadel_server_root_cert_expiry_timestamp - time()) < 2592000
    for: 1h
    labels:
      severity: critical
    annotations:
      summary: "Istio root CA certificate expires in less than 30 days"
      description: "The root CA certificate will expire at {{ $value | humanizeTimestamp }}. Rotate the CA immediately."

  # Root CA expiring in less than 90 days
  - alert: IstioRootCAExpiryWarning
    expr: |
      (citadel_server_root_cert_expiry_timestamp - time()) < 7776000
    for: 1h
    labels:
      severity: warning
    annotations:
      summary: "Istio root CA certificate expires in less than 90 days"
```

### CSR Processing Alerts

```yaml
  # CSR processing failures
  - alert: IstioCertSigningFailures
    expr: |
      rate(citadel_server_csr_sign_err_count[5m]) > 0
    for: 5m
    labels:
      severity: warning
    annotations:
      summary: "Istio certificate signing failures detected"
      description: "{{ $value }} CSR signing failures per second"

  # CSR parsing errors
  - alert: IstioCertCSRParsingErrors
    expr: |
      rate(citadel_server_csr_parsing_err_count[5m]) > 0
    for: 5m
    labels:
      severity: warning
    annotations:
      summary: "Istio CSR parsing errors detected"

  # Authentication failures (SA token validation)
  - alert: IstioCertAuthFailures
    expr: |
      rate(citadel_server_authentication_failure_count[5m]) > 0
    for: 5m
    labels:
      severity: warning
    annotations:
      summary: "Certificate request authentication failures detected"
```

### Workload Certificate Alerts

```yaml
  # Envoy proxy certificate expiry
  - alert: EnvoyProxyCertExpiring
    expr: |
      envoy_server_days_until_first_cert_expiring < 1
    for: 5m
    labels:
      severity: critical
    annotations:
      summary: "Envoy proxy certificate expiring within 1 day for {{ $labels.pod_name }}"

  # Increase in 503 errors (could indicate mTLS cert issues)
  - alert: HighTLSErrors
    expr: |
      sum(rate(istio_requests_total{response_code="503",response_flags="UC"}[5m])) by (destination_workload) > 0.1
    for: 5m
    labels:
      severity: warning
    annotations:
      summary: "High rate of upstream connection failures for {{ $labels.destination_workload }}, possible TLS cert issue"
```

## Envoy Proxy Metrics

Each Envoy sidecar exposes certificate-related metrics:

```text
# Days until the first certificate in the chain expires
envoy_server_days_until_first_cert_expiring

# Total TLS handshake failures
envoy_listener_ssl_handshake

# Connection failures
envoy_cluster_upstream_cx_connect_fail
```

Check a specific pod's certificate metrics:

```bash
kubectl exec <pod-name> -c istio-proxy -- curl -s localhost:15000/stats | grep -i cert
```

## Building a Grafana Dashboard

Here are the key panels for a certificate health dashboard:

### Panel 1: Root CA Expiry Countdown

```text
(citadel_server_root_cert_expiry_timestamp - time()) / 86400
```

This shows days until root CA expiry. Display as a gauge with thresholds at 90, 30, and 7 days.

### Panel 2: CSR Processing Rate

```text
rate(citadel_server_csr_count[5m])
```

Shows the rate of certificate signing requests. A sudden drop might indicate istiod issues. A sudden spike might indicate mass pod restarts.

### Panel 3: Certificate Signing Errors

```text
rate(citadel_server_csr_sign_err_count[5m])
```

Should be zero in healthy operation. Any non-zero value needs investigation.

### Panel 4: Workload Certificate Expiry Across Pods

```text
min(envoy_server_days_until_first_cert_expiring) by (pod_name, namespace)
```

Shows which pods have the soonest expiring certificates. Useful for spotting rotation failures.

### Panel 5: TLS Handshake Success Rate

```text
sum(rate(envoy_listener_ssl_handshake[5m])) by (namespace) /
(sum(rate(envoy_listener_ssl_handshake[5m])) by (namespace) +
 sum(rate(envoy_listener_ssl_connection_error[5m])) by (namespace))
```

Shows the TLS handshake success rate. Should be close to 100%.

## Command-Line Certificate Checks

For quick ad-hoc checks without Prometheus:

### Check Root CA Expiry

```bash
kubectl get secret cacerts -n istio-system -o jsonpath='{.data.ca-cert\.pem}' 2>/dev/null | \
  base64 -d | openssl x509 -noout -enddate || \
kubectl get secret istio-ca-secret -n istio-system -o jsonpath='{.data.ca-cert\.pem}' | \
  base64 -d | openssl x509 -noout -enddate
```

### Check All Workload Certificates in a Namespace

```bash
for pod in $(kubectl get pods -n default -o jsonpath='{.items[*].metadata.name}'); do
  echo -n "$pod: "
  cert_data=$(istioctl proxy-config secret $pod -n default -o json 2>/dev/null | \
    jq -r '.dynamicActiveSecrets[] | select(.name=="default") | .secret.tlsCertificate.certificateChain.inlineBytes' 2>/dev/null)
  if [ -n "$cert_data" ]; then
    echo "$cert_data" | base64 -d | openssl x509 -noout -enddate 2>/dev/null
  else
    echo "no certificate found"
  fi
done
```

### Check Certificate Chain Validity

```bash
istioctl proxy-config secret <pod-name> -n default -o json | \
  jq -r '.dynamicActiveSecrets[] | select(.name=="ROOTCA") | .secret.validationContext.trustedCa.inlineBytes' | \
  base64 -d | openssl x509 -noout -dates
```

## Automated Health Check Script

Create a script that runs periodically to check certificate health:

```bash
#!/bin/bash
# istio-cert-health-check.sh

WARN_DAYS=30
CRIT_DAYS=7

echo "=== Istio Certificate Health Check ==="
echo "Date: $(date)"
echo ""

# Check CA certificate
echo "--- CA Certificate ---"
ca_expiry=$(kubectl get secret cacerts -n istio-system -o jsonpath='{.data.ca-cert\.pem}' 2>/dev/null | \
  base64 -d | openssl x509 -noout -enddate 2>/dev/null | cut -d= -f2)

if [ -n "$ca_expiry" ]; then
  ca_epoch=$(date -d "$ca_expiry" +%s 2>/dev/null || date -j -f "%b %d %H:%M:%S %Y %Z" "$ca_expiry" +%s 2>/dev/null)
  now=$(date +%s)
  days_left=$(( (ca_epoch - now) / 86400 ))
  echo "CA Expires: $ca_expiry ($days_left days remaining)"
  if [ $days_left -lt $CRIT_DAYS ]; then
    echo "STATUS: CRITICAL"
  elif [ $days_left -lt $WARN_DAYS ]; then
    echo "STATUS: WARNING"
  else
    echo "STATUS: OK"
  fi
else
  echo "Using self-signed CA"
fi

echo ""
echo "--- Istiod Metrics ---"
kubectl exec deployment/istiod -n istio-system -- curl -s localhost:15014/metrics 2>/dev/null | \
  grep -E "citadel_server_(root_cert|csr_sign_err|csr_parsing_err)" | grep -v "^#"

echo ""
echo "--- CSR Processing ---"
kubectl exec deployment/istiod -n istio-system -- curl -s localhost:15014/metrics 2>/dev/null | \
  grep "citadel_server_success_cert_issuance_count" | grep -v "^#"
```

## Integration with PagerDuty/Slack

Route your Prometheus alerts to your incident management system:

```yaml
# Alertmanager configuration
route:
  receiver: default
  routes:
  - match:
      alertname: IstioRootCAExpiringSoon
    receiver: pagerduty-critical
  - match:
      alertname: IstioCertSigningFailures
    receiver: slack-ops

receivers:
- name: pagerduty-critical
  pagerduty_configs:
  - service_key: <your-key>
- name: slack-ops
  slack_configs:
  - channel: '#ops-alerts'
    text: '{{ .CommonAnnotations.summary }}'
```

## Summary

Monitoring certificate health in Istio boils down to three things: watch the CA expiry, track CSR processing for errors, and verify that workload certificates are rotating on schedule. Set up Prometheus alerts for all three, build a dashboard for visibility, and run periodic health checks as a safety net. Certificate expiry is a completely preventable outage, and the monitoring setup described here takes about an hour to implement.
