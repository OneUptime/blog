# Cilium Identity Management Mode: Configure, Troubleshoot, Validate, and Monitor

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Cilium, Kubernetes, Networking, eBPF, IPAM

Description: A deep dive into Cilium's identity management modes including CRD-based and kvstore-based allocation, how to configure the right mode for your cluster, and how to troubleshoot identity allocation...

---

## Introduction

Cilium's security model is built on the concept of identities - numeric labels assigned to groups of endpoints that share the same security-relevant labels. These identities are used by eBPF programs in the kernel to make fast allow/deny decisions without needing to look up policies for individual IP addresses. The way identities are allocated and stored - the identity allocation backend - significantly affects how Cilium operates and scales.

Cilium supports two steady-state identity allocation backends: **CRD-based** (the default since Cilium 1.9) where identities are stored as `CiliumIdentity` Kubernetes custom resources, and **kvstore-based** where identities are stored in an external etcd key-value store. The CRD mode is simpler to operate since it reuses the Kubernetes API server, while the kvstore mode provides better performance at very large scales (thousands of nodes) at the cost of additional infrastructure. This is separate from Cilium's identity management mode, which controls whether Cilium agents or the Cilium Operator create identities.

This guide covers how to configure identity allocation backends, troubleshoot identity allocation failures, validate correct identity operation, and monitor identity-related metrics.

## Prerequisites

- Cilium installed in Kubernetes
- `kubectl` with cluster admin access
- Helm 3.x for configuration
- Hubble CLI for flow verdict verification
- For kvstore mode: external etcd cluster (optional)

## Configure Identity Management

Configure CRD-based identity allocation (default):

```bash
# CRD-based allocation is the default - verify it's enabled

kubectl -n kube-system get configmap cilium-config -o yaml | grep identity-allocation-mode
# Should show: identity-allocation-mode: crd

# Explicitly set CRD mode via Helm
helm upgrade cilium cilium/cilium \
  --namespace kube-system \
  --reuse-values \
  --set identityAllocationMode=crd

# View current identities
kubectl get ciliumidentities
kubectl get ciliumidentities -o json | jq '.items[0] | {id: .metadata.name, labels: .["security-labels"]}'
```

Configure identity GC and allocation settings:

```bash
# Configure identity GC interval (cleanup unused identities)
helm upgrade cilium cilium/cilium \
  --namespace kube-system \
  --reuse-values \
  --set operator.identityGCInterval=15m \
  --set operator.identityHeartbeatTimeout=30m

# Configure identity change queue depth
kubectl -n kube-system get configmap cilium-config -o yaml | grep identity

# Set label patterns used for identity computation.
# The Helm value appends to Cilium's default label patterns.
helm upgrade cilium cilium/cilium \
  --namespace kube-system \
  --reuse-values \
  --set "labels=app role"
```

## Troubleshoot Identity Issues

Diagnose identity allocation failures:

```bash
# Check for identity allocation errors
kubectl -n kube-system logs deployment/cilium-operator | grep -i "identity\|allocation\|error"

# List all identities and check for anomalies
kubectl get ciliumidentities --no-headers | wc -l
# Very high count may indicate identity leak

# Find identities with no associated CiliumEndpoint
ACTIVE_IDS=$(mktemp)
kubectl get ciliumendpoints --all-namespaces -o json | \
  jq -r '.items[].status.identity.id // empty' | sort -u > "$ACTIVE_IDS"

kubectl get ciliumidentities -o json | jq -r '.items[] | .metadata.name' | while read id; do
  if ! grep -qx "$id" "$ACTIVE_IDS"; then
    echo "Orphaned identity: $id"
  fi
done
rm -f "$ACTIVE_IDS"

# Check if identity GC is running
kubectl -n kube-system logs deployment/cilium-operator | grep -i "identity gc\|gc interval"

# Investigate a specific identity
kubectl describe ciliumidentity <identity-id>
```

Fix common identity issues:

```bash
# Issue: Too many identities (identity leak)
# Reduce identity GC interval
helm upgrade cilium cilium/cilium \
  --namespace kube-system \
  --reuse-values \
  --set operator.identityGCInterval=5m

# Issue: Identity not created for new pods
kubectl -n kube-system exec ds/cilium -- \
  cilium-dbg monitor --type agent | grep -i "endpoint"

# Check endpoint status
kubectl get ciliumendpoints --all-namespaces

# Issue: Identity conflicting across namespaces
# Check if labels are namespace-qualified
kubectl get ciliumidentities -l 'app=backend' -o json | \
  jq '.items[] | {id: .metadata.name, labels: .["security-labels"]}'
# Should show separate identities for different namespaces
```

## Validate Identity Management

Confirm identity management is working correctly:

```bash
# Verify pods get identities
kubectl get pod my-pod -o wide
kubectl get ciliumendpoint my-pod -o jsonpath='{.status.identity.id}{"\n"}'
# Should print the endpoint's identity ID

# Verify identity matches expected labels
IDENTITY_ID=$(kubectl get ciliumendpoint my-pod -o jsonpath='{.status.identity.id}')
kubectl get ciliumidentity "$IDENTITY_ID" -o json | jq '.["security-labels"]'

# Test that identity-based policy works
kubectl apply -f - <<EOF
apiVersion: cilium.io/v2
kind: CiliumNetworkPolicy
metadata:
  name: identity-test-policy
spec:
  endpointSelector:
    matchLabels:
      app: backend
  ingress:
  - fromEndpoints:
    - matchLabels:
        app: frontend
EOF

# Verify selector-to-identity mappings and observe live policy verdicts
kubectl -n kube-system exec ds/cilium -- \
  cilium-dbg policy selectors -o json | jq '.'

hubble observe --from-label app=frontend --to-label app=backend --verdict DROPPED
```

## Monitor Identity Management

```mermaid
graph TD
    A[Pod with labels] -->|Computed from labels| B[Cilium Identity]
    B -->|CRD mode| C[CiliumIdentity K8s object]
    B -->|kvstore mode| D[etcd entry]
    C -->|Synced to| E[Cilium Agents]
    D -->|Synced to| E
    E -->|Programs| F[eBPF Identity Maps]
    F -->|Policy enforcement| G[Allow/Deny decisions]
    H[Operator GC] -->|Removes unused| C
    H -->|Removes unused| D
```

Monitor identity metrics:

```bash
# Watch identity count over time
watch -n30 "kubectl get ciliumidentities --no-headers | wc -l"

# Monitor identity metrics
kubectl -n kube-system port-forward deployment/cilium-operator 9963:9963 &
curl -s http://localhost:9963/metrics | grep identity

# Key PromQL queries
# cilium_identity - number of identities currently allocated
# delta(cilium_identity[5m]) - recent change in allocated identities

# Alert before cluster-local identity pressure becomes a problem
# Alert on identity leak (count growing without corresponding pod growth)
kubectl apply -f - <<EOF
apiVersion: monitoring.coreos.com/v1
kind: PrometheusRule
metadata:
  name: cilium-identity-alerts
  namespace: kube-system
spec:
  groups:
  - name: cilium-identity
    rules:
    - alert: CiliumIdentityCountHigh
      expr: max(cilium_identity) > 10000
      for: 10m
      labels:
        severity: warning
      annotations:
        summary: "High Cilium identity count may indicate a leak"
EOF
```

## Conclusion

Cilium's identity management is the core of its security model, translating Kubernetes labels into numeric identifiers that eBPF programs use for fast policy enforcement. CRD-based allocation is the right choice for most clusters, providing simplicity and reliability by leveraging the Kubernetes API server. Monitor identity counts to detect leaks early, tune the GC interval to clean up stale identities promptly, and validate that new pods receive correct identities by checking their Cilium endpoint status after deployment. Selector-to-identity inspection and Hubble policy verdicts are invaluable for debugging why traffic is unexpectedly allowed or denied between services.
