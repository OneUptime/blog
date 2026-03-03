# How to Monitor mTLS Certificate Expiration in Istio

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Istio, mTLS, Certificate, Monitoring, Observability

Description: How to monitor and alert on mTLS certificate expiration in Istio to prevent outages caused by expired certificates in the mesh.

---

Istio automatically manages mTLS certificates for workloads in the mesh. Certificates are issued with a 24-hour lifetime by default and rotated automatically before they expire. Most of the time, this works without any attention. But when it fails - and it will eventually fail - the result is a full mesh outage where no service can talk to any other service.

Certificate-related outages happen when istiod goes down during a rotation window, when the root CA expires, or when certificate signing requests fail silently. Monitoring certificate health is an essential part of running Istio in production.

## Understanding Istio's Certificate Lifecycle

Istio's certificate chain looks like this:

```text
Root CA Certificate (10 years default)
  └── Intermediate CA Certificate (used by istiod)
        └── Workload Certificate (24 hours default)
```

Workload certificates are short-lived and auto-rotated. The root CA and intermediate CA certificates have much longer lifetimes but will eventually expire.

When a workload certificate expires, the sidecar cannot establish new mTLS connections. When the root CA expires, no new certificates can be issued and existing certificates cannot be validated.

## Checking Certificate Expiration per Pod

Check a specific pod's certificate:

```bash
istioctl proxy-config secret <pod-name> -n <namespace>
```

For detailed expiration dates:

```bash
istioctl proxy-config secret <pod-name> -n <namespace> -o json | \
  jq -r '.dynamicActiveSecrets[] | select(.name=="default") | .secret.tlsCertificate.certificateChain.inlineBytes' | \
  base64 -d | openssl x509 -noout -dates
```

Output:

```text
notBefore=Feb 24 10:00:00 2026 GMT
notAfter=Feb 25 10:00:00 2026 GMT
```

## Checking the Root CA Expiration

The root CA certificate has a long lifetime, but you still need to monitor it:

```bash
kubectl get secret istio-ca-secret -n istio-system -o jsonpath='{.data.ca-cert\.pem}' | \
  base64 -d | openssl x509 -noout -dates
```

If you used plug-in CA certificates:

```bash
kubectl get secret cacerts -n istio-system -o jsonpath='{.data.ca-cert\.pem}' | \
  base64 -d | openssl x509 -noout -dates
```

## Prometheus Metrics for Certificate Monitoring

Istio exposes metrics about certificate health that you can scrape with Prometheus.

### Workload Certificate Expiration

The Envoy sidecar exposes a metric for certificate expiration:

```text
envoy_server_days_until_first_cert_expiring
```

This metric reports the number of days until the sidecar's certificate expires. In normal operation, this should be between 0 and 1 (since certificates are 24 hours). If it drops to 0 and stays there, certificates are not being rotated.

### Citadel/istiod Metrics

istiod exposes metrics about certificate signing:

```text
# Number of certificate signing requests received
citadel_server_csr_count

# Number of successful certificate signings
citadel_server_success_cert_issuance_count

# Certificate signing errors
citadel_server_csr_signing_error_count

# Root certificate expiry time
citadel_server_root_cert_expiry_timestamp
```

The most critical one is `citadel_server_root_cert_expiry_timestamp`. This is a Unix timestamp of when the root CA expires. You can alert on it:

```yaml
# Prometheus alerting rule
groups:
- name: istio-cert-alerts
  rules:
  - alert: IstioRootCertExpiringSoon
    expr: (citadel_server_root_cert_expiry_timestamp - time()) < 2592000
    for: 1h
    labels:
      severity: warning
    annotations:
      summary: "Istio root CA certificate expires in less than 30 days"
      description: "Root CA certificate expires at {{ $value | humanizeTimestamp }}"

  - alert: IstioRootCertExpiryCritical
    expr: (citadel_server_root_cert_expiry_timestamp - time()) < 604800
    for: 1h
    labels:
      severity: critical
    annotations:
      summary: "Istio root CA certificate expires in less than 7 days"

  - alert: IstioCertSigningErrors
    expr: rate(citadel_server_csr_signing_error_count[5m]) > 0
    for: 5m
    labels:
      severity: critical
    annotations:
      summary: "Istio is failing to sign certificates"
```

### Workload Certificate Rotation Monitoring

Track certificate rotation health:

```yaml
  - alert: IstioWorkloadCertNotRotating
    expr: envoy_server_days_until_first_cert_expiring == 0
    for: 30m
    labels:
      severity: critical
    annotations:
      summary: "Workload certificate has expired and is not being rotated"
      description: "Pod {{ $labels.pod }} in namespace {{ $labels.namespace }} has an expired certificate"
```

## Building a Grafana Dashboard

Create a Grafana dashboard for certificate monitoring with these panels:

### Panel 1: Root CA Expiry Countdown

```text
(citadel_server_root_cert_expiry_timestamp - time()) / 86400
```

Display as a stat panel showing days until root CA expiry.

### Panel 2: Certificate Signing Rate

```text
rate(citadel_server_success_cert_issuance_count[5m])
```

This should be roughly constant. A drop to zero means istiod stopped issuing certificates.

### Panel 3: Certificate Signing Errors

```text
rate(citadel_server_csr_signing_error_count[5m])
```

This should be zero. Any non-zero value needs investigation.

### Panel 4: Workload Certificate Expiry Distribution

```text
histogram_quantile(0.99, envoy_server_days_until_first_cert_expiring)
```

Shows the certificate expiry distribution across all workloads.

## Script for Cluster-Wide Certificate Audit

Here is a script that checks certificate expiration across all pods in the mesh:

```bash
#!/bin/bash

echo "Certificate Expiration Audit"
echo "============================"

NOW=$(date +%s)

for ns in $(kubectl get namespaces -l istio-injection=enabled -o jsonpath='{.items[*].metadata.name}'); do
  for pod in $(kubectl get pods -n $ns -o jsonpath='{.items[*].metadata.name}'); do
    # Check if pod has istio-proxy
    has_proxy=$(kubectl get pod $pod -n $ns -o jsonpath='{.spec.containers[*].name}' 2>/dev/null | grep -c istio-proxy)
    if [ "$has_proxy" -eq 0 ]; then
      continue
    fi

    # Get certificate expiry
    EXPIRY=$(istioctl proxy-config secret $pod -n $ns -o json 2>/dev/null | \
      jq -r '.dynamicActiveSecrets[] | select(.name=="default") | .secret.tlsCertificate.certificateChain.inlineBytes' | \
      base64 -d 2>/dev/null | openssl x509 -noout -enddate 2>/dev/null | cut -d= -f2)

    if [ -n "$EXPIRY" ]; then
      EXPIRY_EPOCH=$(date -d "$EXPIRY" +%s 2>/dev/null || date -j -f "%b %d %T %Y %Z" "$EXPIRY" +%s 2>/dev/null)
      REMAINING=$(( (EXPIRY_EPOCH - NOW) / 3600 ))
      echo "$ns/$pod: Certificate expires in ${REMAINING}h ($EXPIRY)"
    fi
  done
done
```

## Configuring Certificate Lifetimes

If the default 24-hour workload certificate lifetime is too short (or too long) for your environment, you can change it:

```yaml
apiVersion: install.istio.io/v1alpha1
kind: IstioOperator
spec:
  meshConfig:
    defaultConfig:
      proxyMetadata:
        SECRET_TTL: "48h"
```

Or set it globally on istiod:

```yaml
apiVersion: install.istio.io/v1alpha1
kind: IstioOperator
spec:
  components:
    pilot:
      k8s:
        env:
        - name: MAX_WORKLOAD_CERT_TTL
          value: "48h"
        - name: DEFAULT_WORKLOAD_CERT_TTL
          value: "24h"
```

Shorter lifetimes reduce the window of exposure if a certificate is compromised. Longer lifetimes reduce the risk of rotation failures causing outages.

## Handling Certificate Rotation Failures

When rotation fails, the sidecar will keep using its existing certificate until it expires. After expiration, all mTLS connections from that pod will fail.

Signs of rotation failure:
- `envoy_server_days_until_first_cert_expiring` dropping toward zero
- Increasing `citadel_server_csr_signing_error_count`
- istiod log errors about certificate signing

Recovery steps:

```bash
# Check istiod health
kubectl get pods -n istio-system -l app=istiod

# Check istiod logs for errors
kubectl logs -n istio-system -l app=istiod --tail=100 | grep -i "error\|fail\|cert"

# Restart istiod if it is stuck
kubectl rollout restart deployment istiod -n istio-system

# Restart affected pods to trigger certificate re-issuance
kubectl rollout restart deployment <affected-deployment> -n <namespace>
```

Certificate monitoring might not be the most exciting part of running Istio, but it is one of the most important. A certificate expiration that catches you off guard can take down your entire mesh in seconds. Set up the alerts, build the dashboard, and never be surprised by an expired cert again.
