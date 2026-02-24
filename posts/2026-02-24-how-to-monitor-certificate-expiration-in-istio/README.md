# How to Monitor Certificate Expiration in Istio

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Istio, Certificates, Monitoring, Prometheus, Security

Description: How to monitor certificate expiration in your Istio service mesh using Prometheus metrics, custom scripts, and alerting rules to prevent outages from expired certificates.

---

Expired certificates are one of the most common causes of production outages in systems that use TLS. Even though Istio handles certificate rotation automatically, things can go wrong. The rotation might fail silently, istiod might be down, or your root CA might be approaching its expiration date. Monitoring certificate expiration gives you early warning before these problems turn into outages.

## What Can Expire in Istio?

There are three levels of certificates that can expire:

1. **Workload certificates** - Issued to each sidecar, default TTL is 24 hours
2. **Intermediate CA certificate** - Used by istiod to sign workload certs
3. **Root CA certificate** - The trust anchor for the entire mesh

Workload certificates are rotated automatically and rarely cause problems. The intermediate and root CA certificates are the dangerous ones because they have longer lifetimes and are not auto-rotated by Istio.

## Built-in Metrics for Certificate Monitoring

Istiod exposes several Prometheus metrics related to certificates:

```bash
# Check istiod certificate metrics
kubectl exec -n istio-system deploy/istiod -- \
  curl -s localhost:15014/metrics | grep -E "cert|citadel"
```

The key metrics are:

- `citadel_server_root_cert_expiry_timestamp` - Unix timestamp of root cert expiry
- `citadel_server_cert_chain_expiry_timestamp` - Unix timestamp of CA cert chain expiry
- `citadel_server_csr_count` - Total CSR requests processed
- `citadel_server_success_cert_issuance_count` - Successful certificate issuances
- `citadel_server_csr_parsing_err_count` - Failed CSR parsing attempts
- `citadel_server_authentication_failure_count` - Auth failures during CSR

## Setting Up Prometheus Alerts

Create alerting rules for certificate expiration:

```yaml
apiVersion: monitoring.coreos.com/v1
kind: PrometheusRule
metadata:
  name: istio-cert-alerts
  namespace: monitoring
spec:
  groups:
  - name: istio-certificates
    rules:
    - alert: IstioRootCertExpiring30Days
      expr: (citadel_server_root_cert_expiry_timestamp - time()) < 30 * 24 * 3600
      for: 1h
      labels:
        severity: warning
      annotations:
        summary: "Istio root certificate expires in less than 30 days"
        description: "Root cert expires at {{ $value | humanizeTimestamp }}"

    - alert: IstioRootCertExpiring7Days
      expr: (citadel_server_root_cert_expiry_timestamp - time()) < 7 * 24 * 3600
      for: 1h
      labels:
        severity: critical
      annotations:
        summary: "Istio root certificate expires in less than 7 days"
        description: "Root cert expires at {{ $value | humanizeTimestamp }}"

    - alert: IstioCACertExpiring30Days
      expr: (citadel_server_cert_chain_expiry_timestamp - time()) < 30 * 24 * 3600
      for: 1h
      labels:
        severity: warning
      annotations:
        summary: "Istio CA certificate chain expires in less than 30 days"

    - alert: IstioCertIssuanceFailures
      expr: rate(citadel_server_csr_parsing_err_count[5m]) > 0
      for: 10m
      labels:
        severity: warning
      annotations:
        summary: "Istio is failing to issue certificates"
        description: "CSR parsing errors detected"

    - alert: IstioCertAuthFailures
      expr: rate(citadel_server_authentication_failure_count[5m]) > 0
      for: 10m
      labels:
        severity: warning
      annotations:
        summary: "Certificate signing authentication failures"
```

## Monitoring Workload Certificate Health

While workload certificates rotate automatically, you should still monitor them. A workload certificate that is not rotating is a sign of trouble.

Check individual workload certificates:

```bash
# Check certificate expiration for a specific pod
istioctl proxy-config secret <pod-name> -o json | \
  jq -r '.dynamicActiveSecrets[0].secret.tlsCertificate.certificateChain.inlineBytes' | \
  base64 -d | openssl x509 -enddate -noout
```

For bulk checking across all pods:

```bash
#!/bin/bash
# check-certs.sh - Check all workload certificate expirations
for pod in $(kubectl get pods -l security.istio.io/tlsMode=istio -o jsonpath='{.items[*].metadata.name}'); do
  expiry=$(istioctl proxy-config secret "$pod" -o json 2>/dev/null | \
    jq -r '.dynamicActiveSecrets[0].secret.tlsCertificate.certificateChain.inlineBytes' 2>/dev/null | \
    base64 -d 2>/dev/null | openssl x509 -enddate -noout 2>/dev/null)
  echo "$pod: $expiry"
done
```

## Monitoring the Root CA ConfigMap

The root CA certificate is distributed via ConfigMap to every namespace. Verify it is present and valid:

```bash
# Check root cert in all namespaces
for ns in $(kubectl get ns -o jsonpath='{.items[*].metadata.name}'); do
  cert=$(kubectl get cm istio-ca-root-cert -n "$ns" -o jsonpath='{.data.root-cert\.pem}' 2>/dev/null)
  if [ -n "$cert" ]; then
    expiry=$(echo "$cert" | openssl x509 -enddate -noout 2>/dev/null)
    echo "$ns: $expiry"
  else
    echo "$ns: NO ROOT CERT"
  fi
done
```

If a namespace is missing the `istio-ca-root-cert` ConfigMap, workloads in that namespace will not be able to validate peer certificates.

## Using Grafana for Certificate Dashboards

Build a Grafana dashboard for certificate monitoring:

```json
{
  "dashboard": {
    "title": "Istio Certificate Health",
    "panels": [
      {
        "title": "Root CA Days Until Expiry",
        "type": "stat",
        "targets": [
          {
            "expr": "(citadel_server_root_cert_expiry_timestamp - time()) / 86400",
            "legendFormat": "Days remaining"
          }
        ],
        "fieldConfig": {
          "defaults": {
            "thresholds": {
              "steps": [
                {"color": "red", "value": 7},
                {"color": "yellow", "value": 30},
                {"color": "green", "value": 90}
              ]
            }
          }
        }
      },
      {
        "title": "Certificate Issuance Rate",
        "type": "graph",
        "targets": [
          {
            "expr": "sum(rate(citadel_server_success_cert_issuance_count[5m]))",
            "legendFormat": "Issuances/sec"
          }
        ]
      },
      {
        "title": "Certificate Errors",
        "type": "graph",
        "targets": [
          {
            "expr": "sum(rate(citadel_server_csr_parsing_err_count[5m]))",
            "legendFormat": "CSR Errors"
          },
          {
            "expr": "sum(rate(citadel_server_authentication_failure_count[5m]))",
            "legendFormat": "Auth Failures"
          }
        ]
      }
    ]
  }
}
```

## Sidecar-Level Certificate Metrics

The Envoy sidecar also exposes certificate-related metrics:

```bash
kubectl exec <pod-name> -c istio-proxy -- \
  curl -s localhost:15000/stats | grep -E "ssl|certificate"
```

Look for:

- `ssl.handshake` - Total TLS handshakes
- `ssl.connection_error` - TLS connection errors
- `ssl.fail_verify_error` - Certificate verification failures

Track these in Prometheus:

```promql
# TLS handshake failure rate
sum(rate(envoy_listener_ssl_connection_error[5m])) by (pod)

# Certificate verification failures
sum(rate(envoy_cluster_ssl_fail_verify_error[5m])) by (pod)
```

## Automated Certificate Health Checks

For a more proactive approach, run a CronJob that checks certificate health:

```yaml
apiVersion: batch/v1
kind: CronJob
metadata:
  name: cert-health-check
  namespace: istio-system
spec:
  schedule: "0 */6 * * *"
  jobTemplate:
    spec:
      template:
        spec:
          serviceAccountName: cert-checker
          containers:
          - name: checker
            image: bitnami/kubectl:latest
            command:
            - /bin/sh
            - -c
            - |
              ROOT_CERT=$(kubectl get cm istio-ca-root-cert -n default -o jsonpath='{.data.root-cert\.pem}')
              EXPIRY=$(echo "$ROOT_CERT" | openssl x509 -enddate -noout | cut -d= -f2)
              EXPIRY_EPOCH=$(date -d "$EXPIRY" +%s 2>/dev/null || date -j -f "%b %d %T %Y %Z" "$EXPIRY" +%s)
              NOW=$(date +%s)
              DAYS_LEFT=$(( (EXPIRY_EPOCH - NOW) / 86400 ))
              echo "Root CA expires in $DAYS_LEFT days"
              if [ "$DAYS_LEFT" -lt 30 ]; then
                echo "WARNING: Root CA expires in less than 30 days!"
                exit 1
              fi
          restartPolicy: OnFailure
```

## What to Do When Certificates Are About to Expire

If your root CA is approaching expiration:

1. Generate a new root CA certificate
2. Create a combined trust bundle with both old and new roots
3. Update the `cacerts` secret
4. Restart istiod
5. Wait for all workload certificates to be re-issued
6. Remove the old root from the trust bundle

If workload certificates are not rotating:

1. Check istiod health and logs
2. Verify service account tokens are valid
3. Check that istiod can reach the Kubernetes API
4. Restart the affected pods as a last resort

Monitoring certificate expiration is not optional if you are running Istio in production. The automatic rotation handles the common case, but edge cases and CA certificate expiration need active monitoring. Set up the alerts, build the dashboard, and you will catch certificate problems long before they cause an outage.
