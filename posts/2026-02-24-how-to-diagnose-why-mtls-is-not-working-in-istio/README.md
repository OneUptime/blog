# How to Diagnose Why mTLS is Not Working in Istio

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Istio, mTLS, Security, Troubleshooting, Certificate, PeerAuthentication

Description: A practical debugging guide for diagnosing and fixing mutual TLS problems in Istio service mesh deployments.

---

Mutual TLS is one of Istio's most important features - it encrypts all traffic between services and verifies identity on both ends. When it works, it is invisible. When it breaks, you get mysterious connection failures that are hard to track down because the error messages are often vague. Here is how to systematically diagnose and fix mTLS issues.

## Understanding Istio mTLS Modes

Istio supports three mTLS modes through PeerAuthentication:

- **PERMISSIVE** (default) - Accepts both plaintext and mTLS traffic. This is the default mode and usually "just works."
- **STRICT** - Only accepts mTLS traffic. Plaintext connections are rejected.
- **DISABLE** - Turns off mTLS entirely. Traffic is sent in plaintext.

Most mTLS problems happen when switching from PERMISSIVE to STRICT, or when there is a mismatch between what the client expects and what the server requires.

## Quick Health Check

Start by checking the overall mTLS status of your mesh:

```bash
# Check mTLS status for a specific service
istioctl authn tls-check <source-pod>.<namespace> <destination-service>

# Example
istioctl authn tls-check sleep-pod.default httpbin.default.svc.cluster.local
```

The output shows the effective TLS mode and whether client and server agree. Look for `CONFLICT` in the status column.

## Checking PeerAuthentication Policies

List all PeerAuthentication policies, since they can be applied at mesh, namespace, or workload level:

```bash
# Mesh-wide policy (in istio-system namespace)
kubectl get peerauthentication -n istio-system

# Namespace-level policies
kubectl get peerauthentication -n my-namespace -o yaml

# All policies across namespaces
kubectl get peerauthentication -A
```

Policies are applied in order of specificity: workload-level overrides namespace-level, which overrides mesh-level. A common problem is having conflicting policies at different levels.

```yaml
# Example: Mesh-wide STRICT
apiVersion: security.istio.io/v1
kind: PeerAuthentication
metadata:
  name: default
  namespace: istio-system
spec:
  mtls:
    mode: STRICT
---
# But a namespace overrides to PERMISSIVE
apiVersion: security.istio.io/v1
kind: PeerAuthentication
metadata:
  name: default
  namespace: my-namespace
spec:
  mtls:
    mode: PERMISSIVE
```

## Common Symptom: Connection Reset or Refused

When a client without a sidecar tries to connect to a service with STRICT mTLS, the connection fails with a reset or refused error. The client is sending plaintext, but the server expects TLS.

To diagnose:

```bash
# Check if the source pod has a sidecar
kubectl get pod source-pod -n source-namespace -o jsonpath='{.spec.containers[*].name}'

# If istio-proxy is not in the list, there is no sidecar
```

Without a sidecar, the client cannot participate in mTLS. Your options are:

1. Inject a sidecar into the source pod
2. Change the destination to PERMISSIVE mode
3. Create a workload-specific PeerAuthentication that disables mTLS for that port

```yaml
apiVersion: security.istio.io/v1
kind: PeerAuthentication
metadata:
  name: allow-plaintext-port
  namespace: my-namespace
spec:
  selector:
    matchLabels:
      app: my-service
  portLevelMtls:
    8080:
      mode: DISABLE
```

## Checking Certificate Health

mTLS requires valid certificates on both sides. If certificates are expired or not provisioned, mTLS fails:

```bash
# Check the certificates on a proxy
istioctl proxy-config secret deploy/my-service -n my-namespace
```

Look at the `VALID CERT` column. If it shows `false`, the certificate is not valid.

You can also check the certificate details:

```bash
kubectl exec deploy/my-service -n my-namespace -c istio-proxy -- \
  cat /var/run/secrets/istio/cert-chain.pem | openssl x509 -noout -text -dates
```

If the certificate is expired, check if Istiod is healthy and if certificate rotation is working:

```bash
# Check Istiod logs for cert errors
kubectl logs deploy/istiod -n istio-system | grep -i "cert\|error\|fail"

# Check CSR metrics
kubectl exec deploy/istiod -n istio-system -- \
  curl -s localhost:15014/metrics | grep citadel_server
```

## Diagnosing with Envoy Logs

Enable debug logging on the proxy to see TLS handshake details:

```bash
kubectl exec deploy/my-service -c istio-proxy -- \
  pilot-agent request POST 'logging?connection=debug&tls=debug'
```

Then send a request and check the logs:

```bash
kubectl logs deploy/my-service -c istio-proxy --tail=50
```

Look for messages like:
- `TLS error` - Something wrong with the TLS handshake
- `ssl handshake failure` - Client and server could not agree on TLS parameters
- `upstream connect error` - The connection to the upstream failed (could be TLS related)

## DestinationRule TLS Settings

The DestinationRule controls what TLS mode the client uses when connecting to a service. This needs to match the PeerAuthentication on the server side:

```bash
kubectl get destinationrule -A -o yaml | grep -A10 "trafficPolicy"
```

A common problem is having a DestinationRule that sets `DISABLE` while the server expects STRICT:

```yaml
# This will fail if the server requires mTLS
apiVersion: networking.istio.io/v1
kind: DestinationRule
metadata:
  name: my-service
spec:
  host: my-service
  trafficPolicy:
    tls:
      mode: DISABLE  # Sends plaintext to a STRICT mTLS server
```

For services in the mesh, you usually want `ISTIO_MUTUAL`:

```yaml
apiVersion: networking.istio.io/v1
kind: DestinationRule
metadata:
  name: my-service
spec:
  host: my-service
  trafficPolicy:
    tls:
      mode: ISTIO_MUTUAL
```

Or simply do not set a DestinationRule TLS mode and let Istio auto-detect (which works in most cases).

## Testing mTLS End to End

Verify that mTLS is actually working by checking the connection from inside a proxy:

```bash
# From a pod with a sidecar, check the response headers
kubectl exec deploy/sleep -c sleep -- \
  curl -s -o /dev/null -w "%{http_code}" http://my-service.my-namespace:8080/

# Check if the traffic is encrypted
kubectl exec deploy/my-service -c istio-proxy -- \
  pilot-agent request GET stats | grep ssl
```

You can also verify mTLS by looking at Envoy access logs. When mTLS is active, the downstream TLS version and peer certificate info are populated in the log entry.

## Namespace-Level mTLS Issues

When enabling STRICT mTLS at the namespace level, every pod in that namespace must have a sidecar. Check for pods without sidecars:

```bash
# Find pods without istio-proxy
kubectl get pods -n my-namespace -o json | \
  jq -r '.items[] | select(.spec.containers[].name != "istio-proxy") | .metadata.name'
```

A simpler approach:

```bash
kubectl get pods -n my-namespace -o jsonpath='{range .items[*]}{.metadata.name}{"\t"}{.spec.containers[*].name}{"\n"}{end}' | grep -v istio-proxy
```

Any pods without sidecars will break under STRICT mTLS because they cannot present a certificate.

## Using istioctl analyze

The analysis tool catches many mTLS misconfigurations:

```bash
istioctl analyze -n my-namespace
```

It will warn you about things like:
- DestinationRules that override mesh-wide mTLS settings
- Services with conflicting TLS configurations
- Missing sidecar injection on pods affected by STRICT policies

## Debugging Checklist

When mTLS is not working, run through this list:

1. Check PeerAuthentication policies at all levels (mesh, namespace, workload)
2. Check DestinationRule TLS settings for the destination service
3. Verify both source and destination have sidecars injected
4. Check certificate validity on both sides
5. Check Istiod health and certificate signing capability
6. Look at Envoy access logs for TLS error flags
7. Run `istioctl analyze` to catch configuration issues
8. Enable debug logging for TLS on the proxy if needed

Most mTLS issues come down to a mismatch between what the client sends and what the server expects. Once you identify which side is misconfigured, the fix is usually straightforward.
