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
- Access to the `cilium-dbg` command inside Cilium pods

## Step 1: Verify CNI Chain Configuration File

Check that the CNI config file on nodes is correctly structured as a chain.

```bash
# Inspect the CNI config file - look for a "plugins" array

# The primary CNI plugin should be first, Cilium should follow
CILIUM_POD=$(kubectl -n kube-system get pods -l k8s-app=cilium \
  -o jsonpath='{.items[0].metadata.name}')

kubectl -n kube-system exec "$CILIUM_POD" -- sh -c '
  ls -1 /host/etc/cni/net.d
  for f in /host/etc/cni/net.d/*.conflist /host/etc/cni/net.d/*.conf; do
    [ -f "$f" ] && echo "--- $f" && sed -n "1,160p" "$f"
  done
'

# A valid chained config looks like:
# { "cniVersion": "0.3.1",
#   "name": "aws-cni",
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
# "generic-veth" - veth-based CNIs such as Azure CNI (legacy), Calico, Weave Net, or Flannel
# "portmap"      - HostPort support through the CNI portmap plugin

# Check the configured IPAM mode
kubectl -n kube-system get configmap cilium-config \
  -o jsonpath='{.data.ipam}'
# In chaining mode, pod IP allocation is still performed by the primary CNI.
# Do not change IPAM mode on a live cluster just for this validation.
```

## Step 3: Validate Endpoint Registration

Even in chaining mode, Cilium should register endpoints for non-hostNetwork pods that were created or restarted after the chaining configuration was installed.

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

# Confirm Kubernetes accepted the NetworkPolicy object
kubectl get networkpolicy test-chain-policy -n default

# Inspect endpoint policy enforcement from a Cilium agent
CILIUM_POD=$(kubectl -n kube-system get pods -l k8s-app=cilium \
  -o jsonpath='{.items[0].metadata.name}')
kubectl -n kube-system exec "$CILIUM_POD" -- cilium-dbg endpoint list
# Look for the selected server endpoint and verify ingress policy enforcement is Enabled.
```

## Step 5: Verify Primary CNI IP Allocation Is Unaffected

```bash
# Confirm pods are still receiving IPs from the primary CNI
kubectl get pods -A -o wide --no-headers | awk '{print $7}' | sort -u | head -10

# For AWS VPC CNI: IPs should be from VPC CIDR
# For Azure CNI: IPs should be from VNet subnet
# For Flannel: IPs should be from Flannel's podCIDR

# Verify multi-pool IPAM pools are not being used unless explicitly configured
kubectl get ciliumpodippools 2>/dev/null || echo "No CiliumPodIPPools found"
```

## Best Practices

- Test chained CNI behavior after every upgrade of either the primary CNI or Cilium
- Use `cilium-dbg monitor` inside a Cilium pod to observe whether policy drop events are fired correctly
- In chaining mode, some Cilium features (e.g., Layer 7 Policy and IPsec transparent encryption) may be limited - check documentation
- Ensure only one conflist file is active in `/etc/cni/net.d/` to avoid CNI selection ambiguity
- Consider migrating to native Cilium IPAM for simpler operations and full feature access

## Conclusion

Validating CNI chaining with Cilium requires checking the configuration at multiple layers: the CNI conflist file, Cilium's chaining mode setting, endpoint registration, and actual policy enforcement behavior. A correctly validated chained configuration provides Cilium's policy and observability benefits while preserving the IP allocation behavior of your existing primary CNI.
