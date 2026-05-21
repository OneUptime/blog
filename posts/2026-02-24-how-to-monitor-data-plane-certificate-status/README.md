# How to Monitor Data Plane Certificate Status

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Istio, Data Plane, Certificate, mTLS, Security, Monitoring

Description: How to monitor and troubleshoot TLS certificate status in Istio's data plane including expiration checks, rotation verification, and SDS debugging.

---

Certificates are the foundation of mutual TLS in Istio. Every sidecar proxy gets a certificate that identifies the workload, and these certificates are used to encrypt and authenticate all traffic within the mesh. If certificates expire, fail to rotate, or are not distributed properly, your mesh traffic will break. Monitoring certificate status proactively saves you from those 3 AM outages.

## How Certificates Work in Istio

Istio uses a component called the Secret Discovery Service (SDS) to distribute certificates to Envoy sidecars. Here is the flow:

1. When an Istio sidecar starts, the local `istio-agent` sends a certificate signing request (CSR) to istiod
2. istiod signs the certificate using its CA (either the built-in Istio CA or an external CA like cert-manager)
3. The local SDS server in `istio-agent` provides the signed certificate to Envoy over SDS
4. The certificate has a TTL (default 24 hours)
5. Before the certificate expires, the sidecar requests a new one through SDS

The certificates follow the SPIFFE standard, with identities in the format:
```text
spiffe://cluster.local/ns/<namespace>/sa/<service-account>
```

## Checking Certificate Status on a Sidecar

The most direct way to check what certificate a sidecar is using:

```bash
istioctl proxy-config secret deploy/my-app -n default
```

This shows you:

```text
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

```promql
istio_requests_total{
  destination_service="my-service.default.svc.cluster.local",
  reporter="destination",
  connection_security_policy="mutual_tls"
}
```

This returns destination-reported requests where Istio secured the connection with mutual TLS. For TCP services, use one of the TCP metrics instead:

```promql
istio_tcp_connections_opened_total{
  destination_service="my-service.default.svc.cluster.local",
  reporter="destination",
  connection_security_policy="mutual_tls"
}
```

If you do not see `connection_security_policy="mutual_tls"` on destination-reported traffic, check your `PeerAuthentication`, `DestinationRule`, and sidecar injection configuration.

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

For the root CA, monitor a separate istiod metric:

```promql
# Check root CA time to expiry (in seconds)
citadel_server_root_cert_expiry_timestamp - time()
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

Certificates should rotate automatically before they expire. By default, `SECRET_TTL` is 24 hours and `SECRET_GRACE_PERIOD_RATIO` is 0.5, so rotation is requested roughly halfway through the certificate lifetime, with jitter to avoid every proxy renewing at the same time.

To verify rotation is happening, check the SDS stats:

```bash
kubectl exec deploy/my-app -c istio-proxy -- curl -s localhost:15000/stats | grep "sds"
```

Look for:
- `ssl_context_update_by_sds`: Envoy counters showing TLS contexts updated from SDS
- `sds.<secret-name>.key_rotation_failed`: Filesystem SDS key rotation failures, if you use file-backed SDS secrets

You can also watch CSR and issuance counters on istiod:

```promql
rate(citadel_server_csr_count[5m])
rate(citadel_server_success_cert_issuance_count[5m])
rate(citadel_server_csr_sign_err_count[5m])
```

If CSR or issuance counters are not changing as certificates approach rotation time, or signing errors are increasing, rotation may not be working. Check the istiod logs for errors:

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

Kubernetes will restart the istio-proxy container without killing your application container.

### CA Certificate Rotation

The root CA certificate has a much longer lifetime (10 years by default), but you may need to rotate it for security reasons. Check the root CA expiration:

```bash
kubectl get secret cacerts -n istio-system -o jsonpath='{.data.root-cert\.pem}' | base64 -d | openssl x509 -noout -dates
```

This command applies when you plugged in a CA through the `cacerts` secret. If you use Istio's self-signed CA, monitor the CA expiry metrics from istiod. If you are using an external CA, monitor the CA certificate through your CA management tools.

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
rate(citadel_server_success_cert_issuance_count[5m])

# Failed CSR signings
rate(citadel_server_csr_sign_err_count[5m])

# Root cert expiry timestamp
citadel_server_root_cert_expiry_timestamp
```

Set up alerts for CA failures:

```yaml
groups:
- name: istio-ca
  rules:
  - alert: IstioCASigningFailures
    expr: rate(citadel_server_csr_sign_err_count[5m]) > 0
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
