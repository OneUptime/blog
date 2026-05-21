# How to Debug PeerAuthentication Policy Issues in Istio

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Istio, PeerAuthentication, Debugging, mTLS, Troubleshooting

Description: Practical techniques for debugging PeerAuthentication policy issues in Istio including connection failures and mTLS mismatches.

---

PeerAuthentication issues in Istio usually show up as mysterious connection failures. A service that was working fine suddenly returns 503 errors or connection resets. The root cause is almost always an mTLS mismatch - one side expects encrypted traffic and the other sends plain text, or vice versa. Here's how to systematically debug these problems.

## Symptom: Connection Reset or 503 Errors

The most common symptom is a client getting a connection reset or a 503 error when calling a service. This happens when:

- The server requires STRICT mTLS but the client isn't sending it.
- The client tries mTLS but the server has DISABLE mode.
- There's a DestinationRule that overrides auto mTLS to the wrong mode.

## Step 1: Check What Policies Apply

Start by listing all PeerAuthentication policies that could affect the destination service:

```bash
# Mesh-wide policies

kubectl get peerauthentication -n istio-system

# Namespace policies
kubectl get peerauthentication -n <target-namespace>

# All policies in the namespace with details
kubectl get peerauthentication -n <target-namespace> -o yaml
```

Use `istioctl` for a cleaner view of what applies to a specific pod:

```bash
istioctl x describe pod <target-pod-name> -n <target-namespace>
```

This command outputs the effective PeerAuthentication mode and shows which policy is responsible.

## Step 2: Check the Predicted mTLS Status

Check what Istio predicts for traffic to the destination pod:

```bash
istioctl x describe pod <target-pod-name> -n <target-namespace>
```

Look for output like:

```text
Pilot reports that pod enforces mTLS and clients speak mTLS
```

or

```text
WARNING Pilot predicts TLS Conflict on <pod-name> port <port> (pod enforces mTLS, clients speak HTTP)
```

## Step 3: Check the Proxy Configuration

The Envoy proxy configuration tells you exactly what the sidecar is configured to do. Check the listener configuration on the destination pod:

```bash
istioctl proxy-config listener <target-pod-name> -n <target-namespace>
```

For detailed TLS settings:

```bash
istioctl proxy-config listener <target-pod-name> -n <target-namespace> -o json | \
  python3 -c "
import json, sys
data = json.load(sys.stdin)
for l in data:
    addr = l.get('address', {}).get('socketAddress', {})
    port = addr.get('portValue', 'unknown')
    for fc in l.get('filterChains', []):
        ts = fc.get('transportSocket', {})
        if ts:
            tc = ts.get('typedConfig') or ts.get('typed_config') or {}
            require_client_cert = tc.get('requireClientCertificate', tc.get('require_client_certificate', 'unknown'))
            print(f'Port {port}: {ts.get(\"name\", \"none\")} requireClientCertificate={require_client_cert}')
"
```

If an inbound workload port shows a `tls` transport socket with `requireClientCertificate=true`, that port is requiring client certificates and is effectively in STRICT mode.

## Step 4: Check the Client Side

The issue might be on the client side. Check if there's a DestinationRule that overrides auto mTLS:

```bash
kubectl get destinationrules --all-namespaces -o json | \
  jq '.items[] | select(.spec.host | contains("<target-service>")) | {name: .metadata.name, ns: .metadata.namespace, topLevelTls: .spec.trafficPolicy.tls, portLevelTls: [.spec.trafficPolicy.portLevelSettings[]?.tls]}'
```

If you find a DestinationRule with `tls.mode: DISABLE` while the server is STRICT, that's your problem. Either remove the TLS override from the DestinationRule or change it to `ISTIO_MUTUAL`.

Also check the client's proxy cluster configuration:

```bash
istioctl proxy-config cluster <source-pod-name> -n <source-namespace> | grep <target-service>
```

## Step 5: Look at Envoy Access Logs

Enable access logging if it's not already on, then check the logs on both sides.

On the destination (server) side:

```bash
kubectl logs <target-pod-name> -n <target-namespace> -c istio-proxy --tail=100
```

Look for entries with response flags like:

- `UC` (upstream connection termination)
- `UF` (upstream connection failure)
- `NR` (no route configured)
- `DC` (downstream connection termination)

On the source (client) side:

```bash
kubectl logs <source-pod-name> -n <source-namespace> -c istio-proxy --tail=100
```

Look for 503 responses or connection reset entries.

## Step 6: Check SSL Handshake Stats

The Envoy proxy tracks SSL handshake success and failure counts:

```bash
# On the destination pod
kubectl exec <target-pod-name> -n <target-namespace> -c istio-proxy -- \
  curl -s localhost:15000/stats | grep ssl
```

Key metrics to look at:

- `ssl.handshake` - Successful handshakes
- `ssl.connection_error` - Connection errors
- `ssl.fail_verify_no_cert` - Client didn't present a certificate
- `ssl.fail_verify_error` - Client certificate verification failed

A high count of `fail_verify_no_cert` means clients are connecting without mTLS to a port that expects it.

## Step 7: Run istioctl analyze

The `istioctl analyze` command can catch configuration issues automatically:

```bash
istioctl analyze -n <namespace>
```

Or across all namespaces:

```bash
istioctl analyze --all-namespaces
```

This checks for common misconfigurations like conflicting policies or missing sidecars.

## Common Issues and Fixes

### Issue: Pod Without Sidecar Calling a STRICT Service

**Symptom:** Connection reset from a pod that doesn't have `istio-proxy`.

**Diagnosis:**

```bash
kubectl get pod <pod-name> -n <namespace> -o jsonpath='{.spec.containers[*].name}'
```

If `istio-proxy` is missing, the pod can't do mTLS.

**Fix:** Either add the sidecar (enable injection and restart) or change the target's PeerAuthentication to PERMISSIVE:

```yaml
apiVersion: security.istio.io/v1
kind: PeerAuthentication
metadata:
  name: allow-non-mesh
  namespace: backend
spec:
  selector:
    matchLabels:
      app: target-service
  mtls:
    mode: PERMISSIVE
```

### Issue: DestinationRule Overriding Auto mTLS

**Symptom:** Connections fail even though both pods have sidecars.

**Diagnosis:**

```bash
kubectl get destinationrules -n <source-namespace> -o yaml | grep -A5 "tls:"
```

**Fix:** Remove the explicit TLS settings or set them to `ISTIO_MUTUAL`:

```yaml
spec:
  trafficPolicy:
    tls:
      mode: ISTIO_MUTUAL
```

### Issue: Multiple Conflicting PeerAuthentication Policies

**Symptom:** Behavior doesn't match any single policy you've created.

**Diagnosis:**

```bash
kubectl get peerauthentication -n <namespace>
```

If you see multiple namespace-wide policies without selectors, or multiple workload-specific policies with overlapping selectors, that's likely the problem. Istio uses the narrowest matching policy first, and if more than one workload-specific policy matches, it picks the oldest one.

**Fix:** Delete duplicate policies. Keep one namespace-wide policy and avoid overlapping selectors.

### Issue: Port-Level Override Not Working

**Symptom:** A specific port should be PERMISSIVE but connections still fail.

**Diagnosis:** Check if a workload-specific policy is overriding the namespace policy:

```bash
kubectl get peerauthentication -n <namespace> -o yaml
```

Remember that port-level overrides from a lower-precedence policy don't carry over when a higher-precedence policy takes effect.

**Fix:** Add the port-level override to the workload-specific policy.

## Quick Debugging Checklist

Here is a condensed checklist for when things break:

```bash
# 1. What policies exist?
kubectl get peerauthentication -n <namespace>
kubectl get peerauthentication -n istio-system

# 2. What's the effective policy for the target pod?
istioctl x describe pod <target-pod> -n <namespace>

# 3. Does the source pod have a sidecar?
kubectl get pod <source-pod> -n <namespace> -o jsonpath='{.spec.containers[*].name}'

# 4. Any conflicting DestinationRules?
kubectl get destinationrules -n <source-namespace> -o yaml

# 5. What do the proxy logs say?
kubectl logs <target-pod> -c istio-proxy --tail=50
kubectl logs <source-pod> -c istio-proxy --tail=50

# 6. SSL stats
kubectl exec <target-pod> -c istio-proxy -- curl -s localhost:15000/stats | grep ssl

# 7. Automated analysis
istioctl analyze -n <namespace>
```

Work through these in order and you'll find the issue. Nine times out of ten, it's either a missing sidecar, a DestinationRule conflict, or overlapping policies.
