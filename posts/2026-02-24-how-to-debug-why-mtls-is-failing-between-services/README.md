# How to Debug Why mTLS is Failing Between Services

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Istio, MTLS, Security, Debugging, Kubernetes

Description: Step-by-step troubleshooting for mTLS failures between services in an Istio service mesh including certificate and configuration issues.

---

mTLS in Istio should "just work" once the mesh is set up. But when it doesn't, the error messages are often cryptic and the debugging process can feel like searching in the dark. Connection resets, TLS handshake failures, and 503 errors can all stem from mTLS misconfiguration. This guide walks through a systematic debugging approach.

## Symptoms of mTLS Failures

mTLS problems typically show up as:

- Connection reset by peer
- `upstream connect error or disconnect/reset before headers. reset reason: connection termination`
- 503 Service Unavailable
- TLS handshake failures in proxy logs
- Services that worked before stop working after enabling STRICT mode

## Step 1: Check the mTLS Mode

First, understand what mTLS mode is active. There are three levels:

```bash
# Mesh-wide PeerAuthentication
kubectl get peerauthentication -n istio-system

# Namespace-level PeerAuthentication
kubectl get peerauthentication -n production

# Workload-level PeerAuthentication
kubectl get peerauthentication -n production -o json | \
  python3 -c "
import sys, json
data = json.load(sys.stdin)
for item in data['items']:
  selector = item['spec'].get('selector', {})
  mode = item['spec'].get('mtls', {}).get('mode', 'UNSET')
  print(f\"{item['metadata']['name']}: mode={mode}, selector={selector}\")
"
```

The modes are:

- **PERMISSIVE**: Accepts both mTLS and plaintext (default)
- **STRICT**: Only accepts mTLS
- **DISABLE**: Disables mTLS
- **UNSET**: Inherits from parent scope

## Step 2: Verify Both Sides Have Sidecars

mTLS requires sidecars on both the client and server. If either side is missing a sidecar, mTLS will fail in STRICT mode:

```bash
# Check if the client pod has a sidecar
kubectl get pods -n production -l app=frontend -o jsonpath='{.items[0].spec.containers[*].name}'
# Should include "istio-proxy"

# Check if the server pod has a sidecar
kubectl get pods -n production -l app=my-service -o jsonpath='{.items[0].spec.containers[*].name}'
# Should include "istio-proxy"
```

If a pod doesn't have a sidecar:

```bash
# Check if the namespace has injection enabled
kubectl get namespace production --show-labels | grep istio-injection
```

If injection is enabled but the sidecar is missing, the pod was probably created before injection was enabled. Restart it:

```bash
kubectl rollout restart deployment my-service -n production
```

## Step 3: Check Certificate Chain

mTLS uses certificates issued by Istio's CA. If the certificates are invalid, expired, or from different roots, the TLS handshake fails.

Check the certificates in the sidecar:

```bash
istioctl proxy-config secret deploy/my-service -n production
```

This shows the certificate's validity and the trust chain. Look for:

- `ACTIVE` status
- Valid dates (not expired)
- Matching root certificates between client and server

For more detail:

```bash
istioctl proxy-config secret deploy/my-service -n production -o json | \
  python3 -c "
import sys, json, base64
from datetime import datetime
data = json.load(sys.stdin)
for s in data.get('dynamicActiveSecrets', []):
  name = s.get('name', '')
  cert = s.get('secret', {}).get('tlsCertificate', {})
  chain = cert.get('certificateChain', {}).get('inlineBytes', '')
  if chain:
    print(f'Secret: {name}')
    print(f'  Has certificate chain: yes')
  else:
    print(f'Secret: {name}')
    print(f'  Has certificate chain: no')
"
```

## Step 4: Verify Trust Domain

Both services need to be in the same trust domain for mTLS to work. Check the trust domain:

```bash
kubectl get configmap istio -n istio-system -o jsonpath='{.data.mesh}' | grep trustDomain
```

The default trust domain is `cluster.local`. In multi-cluster setups, if clusters have different trust domains and don't share a root CA, mTLS will fail between them.

## Step 5: Check DestinationRule TLS Settings

A DestinationRule can override the mTLS mode for specific traffic. If a DestinationRule sets `tls.mode: DISABLE`, the client won't use mTLS even if the server expects it:

```bash
kubectl get destinationrule -n production -o json | \
  python3 -c "
import sys, json
data = json.load(sys.stdin)
for item in data['items']:
  host = item['spec'].get('host', '')
  tls = item['spec'].get('trafficPolicy', {}).get('tls', {})
  if tls:
    print(f\"{item['metadata']['name']}: host={host}, tls={tls}\")
"
```

Check for DestinationRules in the client's namespace, the root namespace, and any namespace with `exportTo: "*"`.

A conflicting configuration would be:

```yaml
# Server wants STRICT mTLS
apiVersion: security.istio.io/v1beta1
kind: PeerAuthentication
metadata:
  name: strict-mtls
  namespace: production
spec:
  mtls:
    mode: STRICT

# But a DestinationRule disables TLS
apiVersion: networking.istio.io/v1beta1
kind: DestinationRule
metadata:
  name: no-tls
  namespace: production
spec:
  host: my-service.production.svc.cluster.local
  trafficPolicy:
    tls:
      mode: DISABLE  # This conflicts with STRICT!
```

Fix by setting the DestinationRule to ISTIO_MUTUAL:

```yaml
trafficPolicy:
  tls:
    mode: ISTIO_MUTUAL
```

## Step 6: Check Envoy Logs for TLS Errors

Enable debug logging on the server's proxy:

```bash
istioctl proxy-config log deploy/my-service -n production --level connection:debug,tls:debug
```

Send a request, then check the logs:

```bash
kubectl logs deploy/my-service -n production -c istio-proxy --tail=50 | grep -i tls
```

Common error messages:

- `TLS error: 268435581:SSL routines:OPENSSL_internal:CERTIFICATE_VERIFY_FAILED` - Certificate chain validation failed
- `TLS error: 268435703:SSL routines:OPENSSL_internal:TLSV1_ALERT_UNKNOWN_CA` - Client doesn't trust the server's CA
- `connection error: TLS handshake failed` - Generic TLS failure

Reset the log level after debugging:

```bash
istioctl proxy-config log deploy/my-service -n production --level connection:warning,tls:warning
```

## Step 7: Check for Port-Level mTLS Exceptions

PeerAuthentication can set different mTLS modes per port:

```yaml
apiVersion: security.istio.io/v1beta1
kind: PeerAuthentication
metadata:
  name: per-port-mtls
  namespace: production
spec:
  selector:
    matchLabels:
      app: my-service
  mtls:
    mode: STRICT
  portLevelMtls:
    8080:
      mode: PERMISSIVE  # This port accepts plaintext
    9090:
      mode: STRICT      # This port requires mTLS
```

Check if the port you're connecting to has a different mTLS mode:

```bash
kubectl get peerauthentication -n production -o yaml
```

## Step 8: Test mTLS Manually

Use istioctl to check the actual mTLS status between two services:

```bash
# Check how traffic is configured between frontend and my-service
istioctl proxy-config clusters deploy/frontend -n production \
  --fqdn my-service.production.svc.cluster.local -o json | \
  python3 -c "
import sys, json
data = json.load(sys.stdin)
for c in data:
  name = c.get('name', '')
  ts = c.get('transportSocket', {})
  if ts:
    typed_config = ts.get('typedConfig', {})
    sni = typed_config.get('sni', 'none')
    print(f'Cluster: {name}')
    print(f'  TLS: {ts.get(\"name\", \"none\")}')
    print(f'  SNI: {sni}')
  else:
    print(f'Cluster: {name}')
    print(f'  TLS: none (plaintext)')
"
```

You can also test with curl from inside the proxy:

```bash
# This calls the service through the sidecar (should use mTLS)
kubectl exec deploy/frontend -n production -c sleep -- \
  curl -v my-service.production:8080/health

# This bypasses the sidecar (won't use mTLS)
kubectl exec deploy/frontend -n production -c sleep -- \
  curl -v --resolve my-service.production:8080:$(kubectl get pod -l app=my-service -n production -o jsonpath='{.items[0].status.podIP}') my-service.production:8080/health
```

## Step 9: Check Certificate Rotation

Istio automatically rotates workload certificates. If rotation fails, certificates can expire. Check the SDS (Secret Discovery Service) state:

```bash
kubectl exec deploy/my-service -n production -c istio-proxy -- \
  pilot-agent request GET /stats | grep "sds\."
```

Look for:

- `sds.total_active_static_secrets`: Should be > 0
- `sds.key_rotation_failed`: Should be 0

## Quick Fix Checklist

If you need to get things working immediately:

```bash
# 1. Switch to PERMISSIVE mode (allows both mTLS and plaintext)
kubectl apply -f - <<EOF
apiVersion: security.istio.io/v1beta1
kind: PeerAuthentication
metadata:
  name: default
  namespace: production
spec:
  mtls:
    mode: PERMISSIVE
EOF

# 2. Remove any conflicting DestinationRules
kubectl delete destinationrule <name> -n production

# 3. Restart the affected pods
kubectl rollout restart deployment my-service -n production
kubectl rollout restart deployment frontend -n production
```

Then investigate the root cause and switch back to STRICT mode once everything is working.

mTLS debugging in Istio comes down to three questions: Do both sides have sidecars? Do the certificates share the same root CA? Is the mTLS mode consistent between PeerAuthentication and DestinationRule? Answer those three questions and you'll find the problem.
