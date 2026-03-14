# How to Debug mTLS Handshake Failures in Istio

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Istio, MTLS, TLS Handshake, Debugging, Troubleshooting

Description: Step-by-step guide to diagnosing and resolving TLS handshake failures between services in Istio including certificate mismatches and protocol errors.

---

An mTLS handshake failure means two sidecars tried to establish a secure connection and something went wrong during the TLS negotiation. The symptoms are connection resets, 503 errors, or timeouts. The root cause could be anything from expired certificates to protocol mismatches to CA trust issues.

Handshake failures are particularly painful to debug because the error messages from Envoy are often cryptic and the actual TLS negotiation happens at a level below what most debugging tools expose. This guide shows you how to systematically track down handshake problems.

## Recognizing a Handshake Failure

Handshake failures show up differently depending on which side you are looking at.

### Source Side (Client)

In the source pod's proxy logs, you will see entries like:

```text
[2026-02-24T10:00:00.000Z] "- - -" 0 UF,URX upstream_reset_before_response_started{connection_failure,TLS_error:_268435581:SSL_routines:OPENSSL_internal:CERTIFICATE_VERIFY_FAILED} - "-" 0 0 5 - "-" "-" "-" "-" "10.244.1.15:8080" outbound|8080||my-service.production.svc.cluster.local - 10.244.1.15:8080 10.244.0.22:44100 - -
```

Key indicators:
- Response code `0` (no response received)
- Response flag `UF` (upstream failure)
- `TLS_error` in the failure reason
- `CERTIFICATE_VERIFY_FAILED` or similar SSL error

### Destination Side (Server)

On the destination proxy, you might see:

```text
[2026-02-24T10:00:00.000Z] "- - -" 0 - - - "-" 0 0 0 - "-" "-" "-" "-" "-" - - - - "-" - - - -
```

Or sometimes nothing at all, because the connection was rejected during the TLS handshake before any request was processed.

## Step 1: Identify the Error Type

Check Envoy's TLS statistics on the destination pod:

```bash
kubectl exec <dest-pod> -c istio-proxy -n <namespace> -- \
  pilot-agent request GET /stats | grep "ssl\." | grep -v "^0"
```

This filters for non-zero SSL stats. The key counters:

```text
listener.0.0.0.0_8080.ssl.connection_error: 15
listener.0.0.0.0_8080.ssl.fail_verify_cert_hash: 0
listener.0.0.0.0_8080.ssl.fail_verify_no_cert: 3
listener.0.0.0.0_8080.ssl.fail_verify_san: 2
listener.0.0.0.0_8080.ssl.handshake: 1200
```

What each counter means:

- **connection_error**: Generic TLS error during handshake
- **fail_verify_no_cert**: Client did not present a certificate (not mTLS capable)
- **fail_verify_cert_hash**: Client certificate hash mismatch
- **fail_verify_san**: Client certificate Subject Alternative Name mismatch
- **handshake**: Successful handshakes (for comparison)

Also check the source side:

```bash
kubectl exec <source-pod> -c istio-proxy -n <namespace> -- \
  pilot-agent request GET /stats | grep "cluster.outbound.*ssl"
```

## Step 2: Check Certificate Validity

### On Both Pods

```bash
# Source pod certificates
istioctl proxy-config secret <source-pod> -n <namespace>

# Destination pod certificates
istioctl proxy-config secret <dest-pod> -n <namespace>
```

Look for:
- `VALID CERT` should be `true` for both
- `NOT AFTER` should be in the future
- Both should have the same ROOTCA

### Detailed Certificate Information

```bash
# Source certificate details
istioctl proxy-config secret <source-pod> -n <namespace> -o json | \
  jq -r '.dynamicActiveSecrets[] | select(.name=="default") | .secret.tlsCertificate.certificateChain.inlineBytes' | \
  base64 -d | openssl x509 -text -noout
```

Check:
- **Issuer**: Should match your Istio CA
- **Subject**: Should contain the pod's SPIFFE identity
- **Subject Alternative Name**: Should include `spiffe://cluster.local/ns/<namespace>/sa/<service-account>`
- **Validity**: Not Before and Not After should be reasonable

## Step 3: Verify CA Trust

Both sidecars must trust the same root CA. If the CAs differ (for example, after an Istio upgrade or CA rotation), the handshake will fail.

```bash
# Get the root CA fingerprint from both pods
SOURCE_CA=$(istioctl proxy-config secret <source-pod> -n <namespace> -o json | \
  jq -r '.dynamicActiveSecrets[] | select(.name=="ROOTCA") | .secret.validationContext.trustedCa.inlineBytes' | \
  base64 -d | openssl x509 -fingerprint -noout)

DEST_CA=$(istioctl proxy-config secret <dest-pod> -n <namespace> -o json | \
  jq -r '.dynamicActiveSecrets[] | select(.name=="ROOTCA") | .secret.validationContext.trustedCa.inlineBytes' | \
  base64 -d | openssl x509 -fingerprint -noout)

echo "Source CA: $SOURCE_CA"
echo "Dest CA:   $DEST_CA"
```

If these fingerprints differ, you have a CA trust issue. The fix usually involves restarting pods to get fresh certificates from the current CA:

```bash
kubectl rollout restart deployment <deployment-name> -n <namespace>
```

## Step 4: Check for Protocol Mismatches

A common handshake failure occurs when one side expects mTLS and the other sends plain text. Check the effective TLS configuration on both sides:

```bash
# Destination: what TLS mode is configured for inbound?
istioctl proxy-config listener <dest-pod> -n <namespace> --port 8080 -o json | \
  jq '.[].filterChains[].transportSocket'
```

```bash
# Source: what TLS mode is configured for outbound to destination?
istioctl proxy-config cluster <source-pod> -n <namespace> \
  --fqdn <dest-service>.<dest-namespace>.svc.cluster.local -o json | \
  jq '.[].transportSocket'
```

If the destination has a TLS transport socket (expecting mTLS) but the source does not (sending plain text), the handshake will fail.

## Step 5: Enable Debug Logging

For more detailed TLS error information, temporarily increase the log level on the sidecar:

```bash
# Enable debug logging for TLS on the destination
kubectl exec <dest-pod> -c istio-proxy -- \
  pilot-agent request POST 'logging?connection=debug&tls=debug'
```

Then trigger the failing connection and check the logs:

```bash
kubectl logs <dest-pod> -c istio-proxy --tail=200
```

You will see detailed TLS handshake messages including the exact step where the failure occurs.

Reset the log level when done:

```bash
kubectl exec <dest-pod> -c istio-proxy -- \
  pilot-agent request POST 'logging?connection=warning&tls=warning'
```

## Step 6: Check for DestinationRule Conflicts

DestinationRules can override TLS settings and cause mismatches:

```bash
kubectl get destinationrule --all-namespaces -o yaml | \
  grep -B 20 "mode:" | grep -E "(host:|mode:|name:)"
```

Look for DestinationRules that set `tls.mode: DISABLE` or `tls.mode: SIMPLE` for mesh-internal services. These will prevent the source sidecar from using mTLS even if the destination requires it.

The fix:

```yaml
apiVersion: networking.istio.io/v1
kind: DestinationRule
metadata:
  name: fix-tls
  namespace: <source-namespace>
spec:
  host: <dest-service>.<dest-namespace>.svc.cluster.local
  trafficPolicy:
    tls:
      mode: ISTIO_MUTUAL
```

## Common Handshake Failure Scenarios

### Scenario 1: Expired Workload Certificate

Symptoms: All connections from a specific pod fail. Other pods can connect to the same destination.

Diagnosis:
```bash
istioctl proxy-config secret <failing-pod> -n <namespace>
# Check NOT AFTER date
```

Fix:
```bash
kubectl delete pod <failing-pod> -n <namespace>
# New pod gets a fresh certificate
```

### Scenario 2: CA Rotation In Progress

Symptoms: Some pod-to-pod connections fail, others work. Pattern seems random.

Diagnosis: Check CA fingerprints across pods. Some have the old CA, some have the new one.

Fix: Restart all pods to ensure they all have certificates from the current CA:
```bash
kubectl rollout restart deployment --all -n <namespace>
```

### Scenario 3: istiod Not Issuing Certificates

Symptoms: New pods fail to communicate. Existing pods might work until their certificates expire.

Diagnosis:
```bash
kubectl logs -n istio-system -l app=istiod --tail=100 | grep -i "error\|fail\|cert"
```

Fix: Check istiod health and restart if needed:
```bash
kubectl rollout restart deployment istiod -n istio-system
```

### Scenario 4: TLS Version Mismatch

Symptoms: Handshake fails with protocol error.

Diagnosis: Check if the source and destination support the same TLS versions:
```bash
kubectl exec <pod> -c istio-proxy -- pilot-agent request GET /stats | grep "ssl.versions"
```

Fix: Ensure consistent TLS version configuration across the mesh.

## Quick Diagnostic Script

Here is a script that checks the most common handshake failure causes between two pods:

```bash
#!/bin/bash
SOURCE_POD=$1
DEST_POD=$2
NAMESPACE=${3:-default}

echo "=== Checking source pod: $SOURCE_POD ==="
echo "Sidecar present:"
kubectl get pod $SOURCE_POD -n $NAMESPACE -o jsonpath='{.spec.containers[*].name}' | grep -c istio-proxy

echo ""
echo "Source certificates:"
istioctl proxy-config secret $SOURCE_POD -n $NAMESPACE 2>/dev/null

echo ""
echo "=== Checking destination pod: $DEST_POD ==="
echo "Sidecar present:"
kubectl get pod $DEST_POD -n $NAMESPACE -o jsonpath='{.spec.containers[*].name}' | grep -c istio-proxy

echo ""
echo "Destination certificates:"
istioctl proxy-config secret $DEST_POD -n $NAMESPACE 2>/dev/null

echo ""
echo "=== TLS errors on destination ==="
kubectl exec $DEST_POD -n $NAMESPACE -c istio-proxy -- \
  pilot-agent request GET /stats 2>/dev/null | grep "ssl\." | grep -v ":0$"

echo ""
echo "=== Effective PeerAuthentication ==="
istioctl x describe pod $DEST_POD -n $NAMESPACE 2>/dev/null | grep -A 5 "PeerAuthentication"
```

Usage:

```bash
chmod +x debug-handshake.sh
./debug-handshake.sh source-pod-abc123 dest-pod-def456 production
```

This script covers 90% of handshake failure investigations. Run it, read the output, and the problem usually reveals itself in one of the checks.
