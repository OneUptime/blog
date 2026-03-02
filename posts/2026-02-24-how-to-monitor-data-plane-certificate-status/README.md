# How to Monitor Data Plane Certificate Status

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Istio, Data Plane, Certificate, mTLS, Security, Monitoring

Description: How to monitor and troubleshoot TLS certificate status in Istio's data plane including expiration checks, rotation verification, and SDS debugging.

---

Certificates are the foundation of mutual TLS in Istio. Every sidecar proxy gets a certificate that identifies the workload, and these certificates are used to encrypt and authenticate all traffic within the mesh. If certificates expire, fail to rotate, or are not distributed properly, your mesh traffic will break. Monitoring certificate status proactively saves you from those 3 AM outages.

## How Certificates Work in Istio

Istio uses a component called the Secret Discovery Service (SDS) to distribute certificates to Envoy sidecars. Here is the flow:

1. When an Envoy sidecar starts, it sends a certificate signing request (CSR) to istiod
2. istiod signs the certificate using its CA (either the built-in Istio CA or an external CA like cert-manager)
3. The signed certificate is pushed to the sidecar via SDS
4. The certificate has a TTL (default 24 hours)
5. Before the certificate expires, the sidecar requests a new one through SDS

The certificates follow the SPIFFE standard, with identities in the format:
```
spiffe://cluster.local/ns/<namespace>/sa/<service-account>
```

## Checking Certificate Status on a Sidecar

The most direct way to check what certificate a sidecar is using:

```bash
istioctl proxy-config secret deploy/my-app -n default
```

This shows you:

```
RESOURCE NAME     TYPE           STATUS     VALID CERT     SERIAL NUMBER     NOT AFTER               NOT BEFORE
default           Cert Chain     ACTIVE     true           abc123...         2024-01-16T12:00:00Z    2024-01-15T12:00:00Z
ROOTCA            CA             ACTIVE     true           def456...         2034-01-13T12:00:00Z    2024-01-15T12:00:00Z
```

The important columns are:
- **STATUS**: Should be `ACTIVE`
- **VALID CERT**: Should be `true`
- **NOT AFTER**: The expiration time of the certificate

For more detail, add the `-o json` flag:

```bash
istioctl proxy-config secret deploy/my-app -n default -o json
```

This gives you the full certificate chain including the subject, issuer, and SAN (Subject Alternative Name).

## Verifying mTLS Is Active

To confirm that mTLS is actually being used between services:

```bash
istioctl authn tls-check deploy/my-app -n default
```

This shows you the TLS status for each destination:

```
HOST:PORT                                STATUS     SERVER       CLIENT     AUTHN POLICY     DESTINATION RULE
my-service.default.svc.cluster.local     OK         STRICT       ISTIO_MUTUAL   default/         default/my-service
```

If the STATUS is not OK, something is wrong with the certificate or mTLS configuration.

You can also verify from the Envoy side by checking the TLS details of active connections:

```bash
kubectl exec deploy/my-app -c istio-proxy -- curl -s localhost:15000/certs
```

This shows you all certificates loaded in Envoy, including the certificate chain and the CA certificate.

## Monitoring Certificate Expiration

The most critical thing to monitor is certificate expiration. Istio sidecars expose a metric for this:

```promql
# Time until certificate expires (in seconds)
envoy_server_days_until_first_cert_expiring * 86400
```

Actually, the more practical metric is:

```promql
# Check for certificates expiring soon
citadel_server_root_cert_expiry_timestamp
```

You can also check from inside the proxy:

```bash
kubectl exec deploy/my-app -c istio-proxy -- curl -s localhost:15000/certs | python3 -c "
import json, sys
from datetime import datetime
certs = json.load(sys.stdin)
for cert in certs.get('certificates', []):
    for ca in cert.get('ca_cert', []):
        expiry = ca.get('expiration_time', '')
        print(f'CA cert expires: {expiry}')
    for cc in cert.get('cert_chain', []):
        expiry = cc.get('expiration_time', '')
        print(f'Workload cert expires: {expiry}')
"
```

Set up a Prometheus alert for certificates expiring soon:

```yaml
groups:
- name: istio-certificates
  rules:
  - alert: IstioCertExpiringSoon
    expr: |
      envoy_server_days_until_first_cert_expiring < 1
    for: 10m
    labels:
      severity: critical
    annotations:
      summary: "Certificate expiring within 24 hours on {{ $labels.pod }}"
```

## Verifying Certificate Rotation

Certificates should rotate automatically before they expire. By default, Istio rotates certificates when they reach 80% of their TTL. For a 24-hour certificate, that means rotation happens after about 19 hours.

To verify rotation is happening, check the SDS stats:

```bash
kubectl exec deploy/my-app -c istio-proxy -- curl -s localhost:15000/stats | grep "sds"
```

Look for:
- `sds.total_active_sds_secrets`: Number of active SDS secrets (should be 2: the workload cert and the root CA)
- `sds.key_rotation_count`: How many times the key has been rotated

If `key_rotation_count` is not incrementing over time, rotation may not be working. Check the istiod logs for errors:

```bash
kubectl logs deploy/istiod -n istio-system | grep -i "sds\|cert\|sign"
```

## Debugging Certificate Issues

### Certificate Not Being Issued

If a sidecar shows no valid certificate:

```bash
istioctl proxy-config secret deploy/my-app -n default
```

And you see `VALID CERT: false`, check:

1. Is istiod running and healthy?

```bash
kubectl get pods -n istio-system -l app=istiod
```

2. Can the sidecar reach istiod?

```bash
kubectl exec deploy/my-app -c istio-proxy -- curl -s -o /dev/null -w "%{http_code}" https://istiod.istio-system.svc:15012/debug/endpointz -k
```

3. Does the service account exist?

```bash
kubectl get serviceaccount -n default
```

### Certificate Expired

If you see an expired certificate, the rotation mechanism failed. Common causes:

- istiod was down during the rotation window
- Network issues between the proxy and istiod
- The CA certificate itself expired

Force a certificate refresh by restarting the pod:

```bash
kubectl delete pod my-app-xyz -n default
```

For a less disruptive approach, restart just the proxy process:

```bash
kubectl exec deploy/my-app -c istio-proxy -- pilot-agent request POST /quitquitquit
```

Kubernetes will restart the istio-proxy container without killing your application container (if you have `holdApplicationUntilProxyStarts` configured properly).

### CA Certificate Rotation

The root CA certificate has a much longer lifetime (10 years by default), but you may need to rotate it for security reasons. Check the root CA expiration:

```bash
kubectl get secret istio-ca-secret -n istio-system -o jsonpath='{.data.ca-cert\.pem}' | base64 -d | openssl x509 -noout -dates
```

If you are using an external CA, monitor the CA certificate through your CA management tools.

## Configuring Certificate TTL

You can adjust the workload certificate TTL through the mesh configuration:

```yaml
apiVersion: install.istio.io/v1alpha1
kind: IstioOperator
spec:
  meshConfig:
    defaultConfig:
      proxyMetadata:
        SECRET_TTL: "12h"
```

Shorter TTLs mean more frequent rotation (more overhead but better security). Longer TTLs mean less rotation overhead but a wider window if a certificate is compromised.

For specific workloads, use annotations:

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: my-app
spec:
  template:
    metadata:
      annotations:
        proxy.istio.io/config: |
          proxyMetadata:
            SECRET_TTL: "6h"
```

## Monitoring the CA Health

The CA component of istiod exposes metrics about certificate operations:

```promql
# Successful CSR signings
rate(citadel_server_csr_count[5m])

# Failed CSR signings
rate(citadel_server_authentication_failure_count[5m])

# Root cert expiry timestamp
citadel_server_root_cert_expiry_timestamp
```

Set up alerts for CA failures:

```yaml
groups:
- name: istio-ca
  rules:
  - alert: IstioCASigningFailures
    expr: rate(citadel_server_authentication_failure_count[5m]) > 0
    for: 5m
    labels:
      severity: warning
    annotations:
      summary: "Istio CA is failing to sign certificates"

  - alert: IstioRootCertExpiring
    expr: (citadel_server_root_cert_expiry_timestamp - time()) < 30 * 24 * 3600
    for: 1h
    labels:
      severity: warning
    annotations:
      summary: "Istio root CA certificate expiring within 30 days"
```

## Quick Health Check Script

Here is a quick script to check certificate health across your mesh:

```bash
#!/bin/bash
echo "=== Proxy Certificate Status ==="
for pod in $(kubectl get pods --all-namespaces -l security.istio.io/tlsMode=istio -o jsonpath='{range .items[*]}{.metadata.namespace}/{.metadata.name} {end}'); do
  ns=$(echo $pod | cut -d/ -f1)
  name=$(echo $pod | cut -d/ -f2)
  echo -n "$pod: "
  kubectl exec $name -n $ns -c istio-proxy -- curl -s localhost:15000/certs 2>/dev/null | python3 -c "
import json, sys
try:
    data = json.load(sys.stdin)
    for cert in data.get('certificates', []):
        for cc in cert.get('cert_chain', []):
            print(f\"expires {cc.get('expiration_time', 'unknown')}\")
except:
    print('ERROR reading certs')
" 2>/dev/null || echo "UNREACHABLE"
done
```

Keeping certificates healthy is one of those operational tasks that is easy to forget about until something breaks. Set up monitoring and alerting for certificate expiration, verify that rotation is working by tracking the rotation counters, and check CA health metrics regularly. If you catch certificate problems before they cause traffic failures, you will save yourself a lot of pain.
