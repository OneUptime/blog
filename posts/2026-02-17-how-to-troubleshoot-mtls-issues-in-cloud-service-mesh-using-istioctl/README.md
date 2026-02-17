# How to Troubleshoot mTLS Issues in Cloud Service Mesh Using istioctl

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: GCP, Cloud Service Mesh, mTLS, istioctl, Troubleshooting

Description: A practical troubleshooting guide for diagnosing and fixing mutual TLS issues in Cloud Service Mesh using istioctl commands and Envoy proxy debugging techniques.

---

mTLS issues in Cloud Service Mesh can be frustrating because the symptoms are often generic - connection refused, 503 errors, or requests that just hang. The underlying cause could be a misconfigured PeerAuthentication policy, an expired certificate, a missing sidecar, or a dozen other things. The istioctl CLI tool is your best friend for diagnosing these problems. It gives you visibility into what the mesh control plane is doing and what configuration each sidecar proxy has received.

This guide covers the most common mTLS issues and exactly how to diagnose and fix them.

## Setting Up istioctl

First, make sure you have istioctl installed and configured for your Cloud Service Mesh cluster.

```bash
# Install istioctl (if not already installed)
curl -L https://istio.io/downloadIstio | sh -

# Add to your PATH
export PATH=$PWD/istio-*/bin:$PATH

# Verify the connection to your cluster
istioctl version
```

For Cloud Service Mesh managed control plane, the istioctl version should be compatible with your mesh revision.

```bash
# Check the mesh revision
kubectl get controlplanerevision -n istio-system -o jsonpath='{.items[0].metadata.labels.istio\.io/rev}'
```

## Issue 1: Connection Refused Between Services

**Symptom**: Service A cannot reach Service B. Requests fail with "connection refused" or "upstream connect error."

### Diagnostic Steps

First, check if both services have sidecar proxies.

```bash
# Check if the source pod has a sidecar
istioctl proxy-status | grep "service-a"

# Check if the destination pod has a sidecar
istioctl proxy-status | grep "service-b"
```

If a pod does not appear in the proxy-status output, it does not have a sidecar and cannot participate in mTLS.

Next, check the mTLS configuration for the destination service.

```bash
# Check the PeerAuthentication policies affecting service-b
istioctl authn tls-check service-b.default.svc.cluster.local
```

This shows whether the destination is expecting STRICT mTLS, PERMISSIVE, or DISABLED. If it is STRICT and the source does not have a sidecar, connections will fail.

### Fix

If the source pod is missing a sidecar, enable injection for its namespace.

```bash
# Label the namespace for sidecar injection
kubectl label namespace source-ns istio.io/rev=asm-managed --overwrite

# Restart the deployment to inject the sidecar
kubectl rollout restart deployment service-a -n source-ns
```

If both pods have sidecars but connections still fail, check the DestinationRule.

```bash
# Check what DestinationRule applies to the destination
istioctl analyze -n default
```

## Issue 2: 503 Errors After Enabling Strict mTLS

**Symptom**: After applying a STRICT PeerAuthentication policy, some services start returning 503 errors.

### Diagnostic Steps

Check which services do not have sidecars in the affected namespace.

```bash
# List all pods and check for sidecar
kubectl get pods -n default -o jsonpath='{range .items[*]}{.metadata.name}{"\t"}{range .spec.containers[*]}{.name}{","}{end}{"\n"}{end}' | grep -v "istio-proxy"
```

Any pod without "istio-proxy" in its container list cannot send mTLS traffic.

Check the proxy configuration to see what TLS mode is being applied.

```bash
# Inspect the Envoy configuration for a specific pod
istioctl proxy-config listener service-b-pod-name -n default --port 8080 -o json | grep -A5 "transportSocket"
```

### Fix

If specific pods cannot have sidecars (like third-party tools or job pods), create a per-port exception.

```yaml
# Allow plaintext on a specific port while keeping mTLS on others
apiVersion: security.istio.io/v1beta1
kind: PeerAuthentication
metadata:
  name: service-b-exception
  namespace: default
spec:
  selector:
    matchLabels:
      app: service-b
  mtls:
    mode: STRICT
  portLevelMtls:
    8081:
      mode: PERMISSIVE
```

## Issue 3: Certificate Errors in Proxy Logs

**Symptom**: Envoy proxy logs show TLS handshake failures or certificate verification errors.

### Diagnostic Steps

Check the sidecar proxy logs for TLS-related errors.

```bash
# Get proxy logs with TLS errors
kubectl logs deploy/service-b -c istio-proxy | grep -i "tls\|ssl\|certificate"
```

Inspect the certificates the proxy is using.

```bash
# Check the certificate chain for a specific proxy
istioctl proxy-config secret service-b-pod-name -n default
```

This shows the certificate details including the issuer, expiration date, and SAN (Subject Alternative Name). Look for:

- **Expired certificates** - The "Not After" date should be in the future
- **Wrong SAN** - The SAN should match the service's identity
- **Certificate chain issues** - The root CA should be trusted

```bash
# Get detailed certificate information
istioctl proxy-config secret service-b-pod-name -n default -o json | python3 -m json.tool
```

### Fix

If certificates are expired, the control plane may have issues issuing new ones. Check the istiod (or managed control plane) status.

```bash
# For managed control plane, check the control plane status
gcloud container fleet mesh describe --project=YOUR_PROJECT_ID

# Check if there are certificate signing issues
kubectl get events -n istio-system --sort-by='.lastTimestamp' | grep -i cert
```

Force a certificate refresh by restarting the affected pods.

```bash
# Restart the deployment to get fresh certificates
kubectl rollout restart deployment service-b -n default
```

## Issue 4: Mixed mTLS and Plaintext Traffic

**Symptom**: Some requests succeed and some fail intermittently. This happens when some pods have sidecars and some do not, or when the mTLS mode is PERMISSIVE.

### Diagnostic Steps

Use istioctl analyze to find configuration issues.

```bash
# Run a comprehensive analysis
istioctl analyze --all-namespaces
```

This command checks for common misconfigurations including:

- Services with mixed sidecar/non-sidecar pods
- Conflicting PeerAuthentication policies
- DestinationRules that conflict with PeerAuthentication
- Missing DestinationRules

Check the proxy configuration to see what TLS mode each cluster is using.

```bash
# Check outbound TLS configuration for a source pod
istioctl proxy-config cluster service-a-pod-name -n default -o json | \
    python3 -c "
import json, sys
clusters = json.load(sys.stdin)
for c in clusters:
    name = c.get('name', 'unknown')
    tls = c.get('transportSocket', {}).get('name', 'none')
    if 'service-b' in name:
        print(f'{name}: {tls}')
"
```

### Fix

Ensure consistency. Either all pods for a service have sidecars or none do. Mixed deployments cause intermittent failures.

```bash
# Check for pods without sidecars in injection-enabled namespaces
for ns in $(kubectl get ns -l istio.io/rev -o jsonpath='{.items[*].metadata.name}'); do
    echo "=== $ns ==="
    kubectl get pods -n $ns -o jsonpath='{range .items[*]}{.metadata.name}: {range .spec.containers[*]}{.name} {end}{"\n"}{end}' | grep -v istio-proxy
done
```

## Issue 5: Health Check Failures After Enabling mTLS

**Symptom**: Kubernetes liveness and readiness probes fail after enabling strict mTLS, causing pods to restart.

### Diagnostic Steps

Check if the pod is restarting due to failed health checks.

```bash
# Check restart count and last state
kubectl describe pod service-b-pod-name -n default | grep -A5 "Restart\|Liveness\|Readiness"
```

### Fix

Istio automatically rewrites HTTP health probes to go through the sidecar. Verify this is working.

```bash
# Check if probe rewriting is enabled
kubectl get cm istio -n istio-system -o jsonpath='{.data.mesh}' | grep rewriteAppHTTP
```

If probe rewriting is not enabled, enable it.

```yaml
# Enable probe rewriting in mesh config
apiVersion: v1
kind: ConfigMap
metadata:
  name: istio
  namespace: istio-system
data:
  mesh: |-
    defaultConfig:
      holdApplicationUntilProxyStarts: true
    enablePrometheusMerge: true
```

Alternatively, use TCP probes or gRPC probes instead of HTTP probes, which are not affected by mTLS.

## Issue 6: Cross-Namespace mTLS Failures

**Symptom**: Services can communicate within the same namespace but not across namespaces.

### Diagnostic Steps

```bash
# Check PeerAuthentication policies in both namespaces
kubectl get peerauthentication -n namespace-a
kubectl get peerauthentication -n namespace-b

# Check if both namespaces have injection enabled
kubectl get ns namespace-a namespace-b --show-labels | grep istio
```

Check the authorization policies, which can also block cross-namespace traffic.

```bash
# Check AuthorizationPolicies
kubectl get authorizationpolicy -n namespace-b
```

### Fix

If AuthorizationPolicies are restricting cross-namespace communication, update them to allow traffic from the source namespace.

```yaml
# Allow cross-namespace communication
apiVersion: security.istio.io/v1beta1
kind: AuthorizationPolicy
metadata:
  name: allow-namespace-a
  namespace: namespace-b
spec:
  action: ALLOW
  rules:
  - from:
    - source:
        namespaces: ["namespace-a"]
```

## General Debugging Workflow

When you hit an mTLS issue, follow this systematic approach:

1. **Check proxy-status** - Verify both pods have sidecars and are synced with the control plane
2. **Run istioctl analyze** - Catch configuration problems automatically
3. **Check PeerAuthentication** - Verify the mTLS mode is what you expect
4. **Check DestinationRules** - Verify client-side TLS configuration matches
5. **Inspect certificates** - Verify certificates are valid and have the correct identity
6. **Check proxy logs** - Look for specific TLS errors in the Envoy logs
7. **Test connectivity** - Use `istioctl proxy-config` to see the actual Envoy configuration

Following this workflow will diagnose the vast majority of mTLS issues in Cloud Service Mesh. The key is using istioctl to see what the mesh is actually doing, rather than guessing from symptoms alone.
