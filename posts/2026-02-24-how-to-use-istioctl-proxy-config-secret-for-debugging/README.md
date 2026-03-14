# How to Use istioctl proxy-config secret for Debugging

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Istio, Debugging, Istioctl, MTLS, Certificates, Kubernetes

Description: How to inspect proxy TLS certificates using istioctl proxy-config secret to debug mTLS connectivity and certificate rotation issues in Istio.

---

Mutual TLS in Istio depends on every sidecar proxy having a valid TLS certificate. These certificates are issued by istiod's built-in certificate authority and rotated automatically. When mTLS is not working, the problem is often related to certificates: they might be expired, not issued, or issued for the wrong identity. The `istioctl proxy-config secret` command lets you inspect the certificates loaded in any proxy.

## Basic Usage

```bash
istioctl proxy-config secret <pod-name>.<namespace>
```

Example:

```bash
istioctl proxy-config secret productpage-v1-6b746f74dc-9rlmh.bookinfo
```

Output:

```text
RESOURCE NAME     TYPE           STATUS     VALID CERT     SERIAL NUMBER                        NOT AFTER                NOT BEFORE
default           Cert Chain     ACTIVE     true           29f3a1e83bcf0a9c5ac4b64e0b3c5178     2026-02-25T12:00:00Z     2026-02-24T12:00:00Z
ROOTCA            CA             ACTIVE     true           5a8e4f2c1b7d9a3e6c0f8b2d4a7e1c9f     2036-02-22T12:00:00Z     2026-02-24T12:00:00Z
```

## Understanding the Output

**RESOURCE NAME**: The name of the secret.
- `default`: This is the workload certificate used for mTLS communication. It contains the proxy's identity (SPIFFE ID).
- `ROOTCA`: The root CA certificate used to validate other proxies' certificates.

**TYPE**: Either `Cert Chain` (workload certificate) or `CA` (certificate authority).

**STATUS**: Whether the certificate is actively being used.
- `ACTIVE`: The certificate is loaded and in use.

**VALID CERT**: Whether the certificate passes validation (not expired, properly signed).

**SERIAL NUMBER**: The certificate's serial number. Useful for tracking certificate rotation.

**NOT AFTER / NOT BEFORE**: The certificate's validity period.

## Debugging Certificate Issues

### Expired Certificate

If `VALID CERT` shows `false` and the `NOT AFTER` date is in the past, the certificate has expired:

```text
RESOURCE NAME     TYPE           STATUS     VALID CERT     NOT AFTER
default           Cert Chain     ACTIVE     false          2026-02-23T12:00:00Z
```

Certificate rotation should happen automatically. If it is not happening:

1. Check if the proxy can reach istiod:

```bash
kubectl exec productpage-v1-6b746f74dc-9rlmh -c istio-proxy -n bookinfo -- \
  curl -s -o /dev/null -w "%{http_code}" https://istiod.istio-system.svc:15012/debug/endpointz
```

2. Check the pilot-agent logs for rotation errors:

```bash
kubectl logs productpage-v1-6b746f74dc-9rlmh -c istio-proxy -n bookinfo | grep "certificate\|rotation\|SDS\|secret"
```

3. Check if istiod's CA is healthy:

```bash
kubectl logs deploy/istiod -n istio-system | grep "CA\|cert\|sign"
```

### Missing Certificate

If the secret list is empty or the `default` secret is missing, the proxy has not received its workload certificate:

```bash
istioctl proxy-config secret productpage-v1-6b746f74dc-9rlmh.bookinfo
```

If there is no output, the SDS (Secret Discovery Service) connection to the local pilot-agent is broken. Check:

```bash
# Check pilot-agent health
kubectl exec productpage-v1-6b746f74dc-9rlmh -c istio-proxy -n bookinfo -- \
  pilot-agent request GET /healthz/ready

# Check SDS connection
kubectl exec productpage-v1-6b746f74dc-9rlmh -c istio-proxy -n bookinfo -- \
  pilot-agent request GET stats | grep sds
```

### Wrong SPIFFE Identity

The workload certificate contains a SPIFFE ID that identifies the workload. To see the full certificate details:

```bash
istioctl proxy-config secret productpage-v1-6b746f74dc-9rlmh.bookinfo -o json
```

In the JSON output, find the certificate chain and decode it:

```bash
istioctl proxy-config secret productpage-v1-6b746f74dc-9rlmh.bookinfo -o json | \
  python3 -c "
import json, sys, base64
data = json.load(sys.stdin)
for item in data.get('dynamicActiveSecrets', []):
    if item.get('name') == 'default':
        tls = item.get('secret', {}).get('tlsCertificate', {})
        chain = tls.get('certificateChain', {}).get('inlineBytes', '')
        cert_pem = base64.b64decode(chain)
        print(cert_pem.decode('utf-8'))
" > /tmp/cert.pem

openssl x509 -in /tmp/cert.pem -text -noout | grep "Subject Alternative Name" -A1
```

You should see:

```text
X509v3 Subject Alternative Name:
    URI:spiffe://cluster.local/ns/bookinfo/sa/bookinfo-productpage
```

If the SPIFFE ID does not match the expected service account, the wrong service account is assigned to the pod.

### Root CA Mismatch

If two services cannot establish mTLS, they might have different root CAs. This happens in multi-cluster setups or after a CA rotation:

```bash
# Check root CA on service A
istioctl proxy-config secret pod-a.namespace -o json | \
  python3 -c "
import json, sys
data = json.load(sys.stdin)
for item in data.get('dynamicActiveSecrets', []):
    if item.get('name') == 'ROOTCA':
        print(item.get('secret', {}).get('validationContext', {}).get('trustedCa', {}).get('inlineBytes', '')[:50])
"

# Check root CA on service B
istioctl proxy-config secret pod-b.namespace -o json | \
  python3 -c "
import json, sys
data = json.load(sys.stdin)
for item in data.get('dynamicActiveSecrets', []):
    if item.get('name') == 'ROOTCA':
        print(item.get('secret', {}).get('validationContext', {}).get('trustedCa', {}).get('inlineBytes', '')[:50])
"
```

If the first 50 characters of the base64-encoded root CA are different, the services have different trust roots and cannot authenticate each other.

## Monitoring Certificate Rotation

Certificates in Istio are typically rotated every 24 hours (configurable). Monitor rotation by checking the serial number over time:

```bash
while true; do
  echo "=== $(date) ==="
  istioctl proxy-config secret productpage-v1-6b746f74dc-9rlmh.bookinfo | grep "default"
  sleep 3600  # Check every hour
done
```

When the serial number changes, the certificate has been rotated.

## Checking Certificate Expiry Across the Mesh

Create a script to check certificate health across all proxies:

```bash
#!/bin/bash
echo "Checking certificate status for all proxies..."

for pod in $(kubectl get pods --all-namespaces -l security.istio.io/tlsMode=istio -o jsonpath='{range .items[*]}{.metadata.name}.{.metadata.namespace}{"\n"}{end}'); do
  CERT_STATUS=$(istioctl proxy-config secret $pod 2>/dev/null | grep "default" | awk '{print $4}')
  NOT_AFTER=$(istioctl proxy-config secret $pod 2>/dev/null | grep "default" | awk '{print $6}')

  if [ "$CERT_STATUS" != "true" ]; then
    echo "WARNING: $pod has invalid certificate (expires: $NOT_AFTER)"
  fi
done

echo "Done."
```

## Forcing Certificate Rotation

If a certificate is stuck and not rotating, you can force a rotation by restarting the pod:

```bash
kubectl rollout restart deployment productpage-v1 -n bookinfo
```

Or by sending a signal to pilot-agent to trigger SDS refresh (this is less disruptive than a full restart):

```bash
kubectl exec productpage-v1-6b746f74dc-9rlmh -c istio-proxy -n bookinfo -- \
  pilot-agent request POST /debug/force_disconnect
```

The `proxy-config secret` command is essential for debugging mTLS issues. When connections between services fail with TLS errors, checking the certificate status on both sides is the fastest way to identify whether it is a certificate problem, and if so, what specifically is wrong.
