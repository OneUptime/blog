# Validate CNI Chaining with Cilium

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Cilium, Kubernetes, CNI Chaining, Migration, eBPF

Description: Learn how to validate CNI chaining configurations where Cilium operates as a chained plugin alongside another primary CNI, ensuring both CNI plugins coexist correctly and policy enforcement works...

---

## Introduction

CNI chaining allows multiple CNI plugins to work together, each handling a different aspect of pod networking. In a chained configuration, the primary CNI plugin sets up pod network interfaces and assigns IP addresses, while Cilium acts as a secondary chained plugin to provide eBPF-based network policy enforcement, observability, and optional bandwidth management.

This pattern is common when organizations want Cilium's advanced capabilities without fully replacing their existing CNI (e.g., AWS VPC CNI, Azure CNI, or Flannel). The chained setup requires careful validation because two CNI plugins are active simultaneously, and issues in either plugin can affect pod networking.

This guide covers the validation steps for Cilium in CNI chaining mode, from checking the chained configuration to verifying that Cilium correctly enforces policies on pods whose IPs are managed by the primary CNI.

## Prerequisites

- Kubernetes cluster with a primary CNI (AWS VPC CNI, Azure CNI, Flannel, or similar)
- Cilium deployed in CNI chaining mode (not as the primary CNI)
- `kubectl` cluster-admin access
- `cilium` CLI installed

## Step 1: Verify CNI Chain Configuration File

Check that the CNI config file on nodes is correctly structured as a chain.

```bash
# Inspect the CNI config file - look for a "plugins" array
# The primary CNI plugin should be first, Cilium should follow
kubectl -n kube-system exec -it \
  $(kubectl -n kube-system get pods -l k8s-app=cilium -o name | head -1) -- \
  cat /host/etc/cni/net.d/05-cilium.conf 2>/dev/null || \
  ls /host/etc/cni/net.d/

# A valid chained config looks like:
# { "cniVersion": "0.3.1",
#   "name": "portmap",
#   "plugins": [
#     { "type": "aws-cni" },   <- Primary CNI
#     { "type": "cilium-cni" } <- Chained Cilium
#   ]}
```

## Step 2: Confirm Cilium Chaining Mode Setting

```bash
# Verify Cilium is configured for CNI chaining
kubectl -n kube-system get configmap cilium-config \
  -o jsonpath='{.data.cni-chaining-mode}'

# Supported chaining modes:
# "aws-cni"      - AWS VPC CNI
# "azure-vnet"   - Azure CNI
# "flannel"      - Flannel
# "portmap"      - Generic portmap chaining

# Verify IPAM is set to delegate (primary CNI handles IPs)
kubectl -n kube-system get configmap cilium-config \
  -o jsonpath='{.data.ipam}'
# Expected: "delegated-plugin" or "cluster-pool" depending on mode
```

## Step 3: Validate Endpoint Registration

Even in chaining mode, Cilium should register endpoints for all non-hostNetwork pods.

```bash
# Check Cilium endpoints - these should exist for all regular pods
kubectl get ciliumendpoints -A | head -20

# Count endpoints vs. running pods (should be similar)
ENDPOINTS=$(kubectl get ciliumendpoints -A --no-headers | wc -l)
echo "Cilium endpoints: $ENDPOINTS"

# Check a specific endpoint status
kubectl describe ciliumendpoint <endpoint-name> -n <namespace> | \
  grep -A 5 "Status"
```

## Step 4: Test Network Policy Enforcement via Chained Cilium

```yaml
# chain-policy-test.yaml - test that Cilium enforces policy in chaining mode
apiVersion: networking.k8s.io/v1
kind: NetworkPolicy
metadata:
  name: test-chain-policy
  namespace: default
spec:
  podSelector:
    matchLabels:
      role: server
  policyTypes:
    - Ingress
  ingress:
    - from:
        - podSelector:
            matchLabels:
              role: client
      ports:
        - protocol: TCP
          port: 80
```

```bash
# Apply the policy and test enforcement
kubectl apply -f chain-policy-test.yaml

# Confirm Cilium loaded the policy (even in chaining mode, it reads NetworkPolicy)
cilium policy get | grep test-chain-policy
```

## Step 5: Verify Primary CNI IP Allocation Is Unaffected

```bash
# Confirm pods are still receiving IPs from the primary CNI
kubectl get pods -A -o wide --no-headers | awk '{print $7}' | sort -u | head -10

# For AWS VPC CNI: IPs should be from VPC CIDR
# For Azure CNI: IPs should be from VNet subnet
# For Flannel: IPs should be from Flannel's podCIDR

# Verify no IP pools are active in Cilium (primary CNI owns IPAM)
kubectl get ciliumippools 2>/dev/null || echo "No Cilium IP pools (expected in chaining mode)"
```

## Best Practices

- Test chained CNI behavior after every upgrade of either the primary CNI or Cilium
- Use `cilium monitor` to observe whether policy drop events are fired correctly
- In chaining mode, some Cilium features (e.g., BPF NodePort) may be limited - check documentation
- Ensure only one conflist file is active in `/etc/cni/net.d/` to avoid CNI selection ambiguity
- Consider migrating to native Cilium IPAM for simpler operations and full feature access

## Conclusion

Validating CNI chaining with Cilium requires checking the configuration at multiple layers: the CNI conflist file, Cilium's chaining mode setting, endpoint registration, and actual policy enforcement behavior. A correctly validated chained configuration provides Cilium's policy and observability benefits while preserving the IP allocation behavior of your existing primary CNI.
