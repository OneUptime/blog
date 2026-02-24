# How to Troubleshoot mTLS Connection Failures in Istio

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Istio, mTLS, Troubleshooting, Debugging, Kubernetes

Description: A systematic guide to diagnosing and fixing mutual TLS connection failures in Istio including certificate errors, policy mismatches, and proxy issues.

---

mTLS connection failures in Istio are some of the most cryptic errors you will encounter. The application sees a generic "connection refused" or "502 Bad Gateway," and the proxy logs show something about TLS handshake failures or upstream connection errors. Without knowing where to look, you can spend hours going in circles.

This guide provides a structured approach to finding and fixing mTLS failures.

## Symptoms of mTLS Failures

Before jumping into debugging, confirm that you are actually dealing with an mTLS issue. Common symptoms:

- HTTP 503 with response flag `UF` (upstream failure)
- Connection reset errors from the application
- "TLS error" or "SSL handshake" messages in proxy logs
- Services that worked before mTLS was enabled now fail
- One-directional failures (A can call B but B cannot call A)

## Step 1: Check the PeerAuthentication Policy

The first thing to verify is what mTLS policy applies to the destination service:

```bash
# List all PeerAuthentication policies in the destination namespace
kubectl get peerauthentication -n <destination-namespace>

# Check the mesh-wide policy
kubectl get peerauthentication -n istio-system
```

Understand the effective policy using describe:

```bash
istioctl x describe pod <destination-pod> -n <destination-namespace>
```

This output tells you the effective mTLS mode. If it says STRICT but the caller cannot provide mTLS, that is your problem.

## Step 2: Verify Sidecar Presence

Both the source and destination pods need sidecars for mTLS to work:

```bash
# Check source pod
kubectl get pod <source-pod> -n <source-namespace> -o jsonpath='{.spec.containers[*].name}'

# Check destination pod
kubectl get pod <dest-pod> -n <dest-namespace> -o jsonpath='{.spec.containers[*].name}'
```

Both should include `istio-proxy` in the list. If either one is missing, that is likely the cause.

A pod without a sidecar:
- Cannot send mTLS traffic (its connections are plain text)
- Cannot receive mTLS traffic (there is no proxy to handle TLS termination)

If the destination requires STRICT mTLS and the source has no sidecar, the connection will fail.

## Step 3: Check Sidecar Proxy Logs

The proxy logs on both sides contain critical information:

```bash
# Destination proxy logs
kubectl logs <dest-pod> -c istio-proxy -n <dest-namespace> --tail=100

# Source proxy logs
kubectl logs <source-pod> -c istio-proxy -n <source-namespace> --tail=100
```

Look for these patterns:

**"TLS error: 268435581:SSL routines:OPENSSL_internal:CERTIFICATE_VERIFY_FAILED"**
The client certificate presented by the source was not trusted. This usually means the certificates come from different root CAs (possibly after an Istio upgrade or CA rotation).

**"No matching filter chain found"**
The incoming connection does not match any configured listener filter chain. This can happen when the wrong port or protocol is used.

**Response flag "UF" (Upstream Failure)**
The proxy could not establish a connection to the upstream. For mTLS, this usually means the TLS handshake failed.

**Response flag "UC" (Upstream Connection Termination)**
The upstream closed the connection during the handshake.

## Step 4: Examine Certificates

mTLS uses X.509 certificates for authentication. Verify that the certificates are valid and match:

```bash
# Check the certificate on the source sidecar
istioctl proxy-config secret <source-pod> -n <source-namespace>
```

Sample output:

```
RESOURCE NAME     TYPE           STATUS     VALID CERT     SERIAL NUMBER     NOT AFTER              NOT BEFORE
default           Cert Chain     ACTIVE     true           abc123...         2026-02-25T10:00:00Z   2026-02-24T10:00:00Z
ROOTCA            CA             ACTIVE     true           def456...         2036-02-22T10:00:00Z   2026-02-24T10:00:00Z
```

Check:
- `VALID CERT` should be `true`
- `NOT AFTER` should be in the future (certificate not expired)
- Both source and destination should have the same ROOTCA

Check the destination too:

```bash
istioctl proxy-config secret <dest-pod> -n <dest-namespace>
```

If the ROOTCA serial numbers differ between source and destination, they are using different root CAs and will not trust each other.

## Step 5: Check for DestinationRule Conflicts

A DestinationRule can override the TLS mode for outbound connections. If a DestinationRule sets `tls.mode: DISABLE` for a destination that requires mTLS, the connection will fail:

```bash
kubectl get destinationrule --all-namespaces -o yaml | grep -A 5 "tls:"
```

Look for DestinationRules that target the failing service and check their TLS mode:

```bash
istioctl proxy-config cluster <source-pod> -n <source-namespace> \
  --fqdn <dest-service>.<dest-namespace>.svc.cluster.local -o json
```

In the output, check the `transportSocket` field. If it is absent, TLS is not being used for outbound connections to that service.

## Step 6: Verify Auto mTLS

Auto mTLS is the feature that automatically detects whether a destination supports mTLS and configures the client accordingly. If auto mTLS is disabled, sidecars will not automatically use mTLS:

```bash
kubectl get configmap istio -n istio-system -o jsonpath='{.data.mesh}' | grep enableAutoMtls
```

If this returns `false`, auto mTLS is disabled. Either enable it or create explicit DestinationRules with `tls.mode: ISTIO_MUTUAL` for each service.

## Step 7: Check Envoy TLS Statistics

Envoy tracks detailed TLS stats:

```bash
# On the destination (server-side stats)
kubectl exec <dest-pod> -c istio-proxy -n <dest-namespace> -- \
  pilot-agent request GET /stats | grep "ssl"
```

Key metrics:

```
listener.0.0.0.0_8080.ssl.connection_error: 15
listener.0.0.0.0_8080.ssl.handshake: 1200
listener.0.0.0.0_8080.ssl.no_certificate: 3
listener.0.0.0.0_8080.ssl.fail_verify_cert_hash: 0
listener.0.0.0.0_8080.ssl.fail_verify_san: 0
```

- `connection_error`: General TLS errors
- `no_certificate`: Client did not present a certificate (non-mTLS client)
- `fail_verify_cert_hash` or `fail_verify_san`: Certificate validation failures

On the source (client-side stats):

```bash
kubectl exec <source-pod> -c istio-proxy -n <source-namespace> -- \
  pilot-agent request GET /stats | grep "cluster.outbound.*ssl"
```

## Step 8: Test with curl

Sometimes a direct test helps isolate the issue:

```bash
# From a pod with a sidecar (should use mTLS automatically)
kubectl exec <source-pod> -c <app-container> -n <source-namespace> -- \
  curl -v http://<dest-service>.<dest-namespace>.svc.cluster.local:<port>/health
```

The `-v` flag shows connection details. If the connection fails, the error message gives hints about what went wrong.

To test without mTLS (bypassing the sidecar):

```bash
# From a pod, connect directly to the destination pod IP (bypasses both sidecars)
DEST_IP=$(kubectl get pod <dest-pod> -n <dest-namespace> -o jsonpath='{.status.podIP}')
kubectl exec <source-pod> -c <app-container> -- curl -v http://$DEST_IP:<container-port>/health
```

If this works in STRICT mode, something is off because direct pod-IP connections should not be going through the sidecar's mTLS handling.

## Common Fixes

### Fix 1: Add Missing Sidecar

```bash
# Ensure namespace has injection enabled
kubectl label namespace <namespace> istio-injection=enabled

# Restart the deployment to inject sidecars
kubectl rollout restart deployment <deployment-name> -n <namespace>
```

### Fix 2: Fix DestinationRule TLS Mode

```yaml
apiVersion: networking.istio.io/v1
kind: DestinationRule
metadata:
  name: fix-tls-mode
  namespace: <source-namespace>
spec:
  host: <dest-service>.<dest-namespace>.svc.cluster.local
  trafficPolicy:
    tls:
      mode: ISTIO_MUTUAL
```

### Fix 3: Restart Pods to Refresh Certificates

If certificates are stale or corrupted:

```bash
kubectl rollout restart deployment <deployment-name> -n <namespace>
```

This forces new certificates to be issued.

### Fix 4: Create a Permissive Exception

If you need the connection to work now and will fix the root cause later:

```yaml
apiVersion: security.istio.io/v1
kind: PeerAuthentication
metadata:
  name: temp-permissive
  namespace: <dest-namespace>
spec:
  selector:
    matchLabels:
      app: <dest-app>
  mtls:
    mode: PERMISSIVE
```

Follow this systematic approach and you will find the root cause. Most mTLS failures come down to missing sidecars, conflicting DestinationRules, or certificate trust issues.
