# Setting Up Calico IPAM Split Workflows

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Calico, Kubernetes, IPAM, Networking, IP Pools, Setup, CNI

Description: Configure Calico IPAM pool splits from scratch — creating zone-specific IP pools with node selectors, disabling the original pool, and verifying that new pod IP allocations flow to the correct sub-pool.

---

## Introduction

Calico IPAM split workflows divide a single IP pool into multiple smaller pools, each assigned to a subset of nodes via `nodeSelector`. The most common use case is zone-specific pools for multi-region clusters, where you want pods in each availability zone to get IPs from a CIDR that is routable only within that zone.

This post walks through the complete setup process: planning the CIDR split, creating sub-pools, labeling nodes, disabling the original pool, and verifying the result.

---

## Prerequisites

- Calico v3.x installed with `calicoctl` v3.x configured
- `kubectl` cluster-admin access
- Sufficient contiguous IP space in the original pool to subdivide
- Nodes labeled with the labels you plan to use for `nodeSelector`
- Pre-split IPAM consistency confirmed (`calicoctl ipam check`)

---

## Step 1: Inspect the Current IP Pool State

Before making any changes, document the current IPAM state:

```bash
# List all IP pools with their CIDRs, block sizes, and selectors
calicoctl get ippool -o wide

# Show current block allocation — note which IPs are already in use
calicoctl ipam show --show-blocks

# Confirm IPAM is consistent before starting
calicoctl ipam check
```

---

## Step 2: Plan the Split

For a cluster with nodes spread across two availability zones (`zone-a` and `zone-b`) using the default pool `10.0.0.0/16`:

- Sub-pool A: `10.0.0.0/17` — for nodes labeled `zone=zone-a` (IPs 10.0.0.0 – 10.0.127.255)
- Sub-pool B: `10.0.128.0/17` — for nodes labeled `zone=zone-b` (IPs 10.0.128.0 – 10.0.255.255)

Confirm all existing pod IPs fall within one planned sub-pool range before proceeding. If pods have IPs in both halves, you must drain and restart them first.

---

## Step 3: Create the Sub-Pool IP Pools

```yaml
# ippool-zone-a.yaml
# IP pool for availability zone A
apiVersion: projectcalico.org/v3
kind: IPPool
metadata:
  name: prod-pool-zone-a
spec:
  # First half of the original /16 pool
  cidr: 10.0.0.0/17
  # Only nodes in zone-a will draw IPs from this pool
  nodeSelector: "zone == 'zone-a'"
  # Match the encapsulation mode of the original pool
  ipipMode: Never
  vxlanMode: Always
  # Block size: each node gets a /26 block (64 IPs, 62 usable)
  blockSize: 26
  natOutgoing: true
  disabled: false
```

```yaml
# ippool-zone-b.yaml
# IP pool for availability zone B
apiVersion: projectcalico.org/v3
kind: IPPool
metadata:
  name: prod-pool-zone-b
spec:
  cidr: 10.0.128.0/17
  nodeSelector: "zone == 'zone-b'"
  ipipMode: Never
  vxlanMode: Always
  blockSize: 26
  natOutgoing: true
  disabled: false
```

```bash
# Apply both sub-pools
calicoctl apply -f ippool-zone-a.yaml
calicoctl apply -f ippool-zone-b.yaml

# Confirm both pools are created and enabled
calicoctl get ippool -o wide | grep -E "zone-a|zone-b"
```

---

## Step 4: Label the Nodes

After the sub-pools exist, label nodes to match the `nodeSelector` in each pool:

```bash
# Apply zone labels to nodes
# Zone A nodes
kubectl label node worker-01 worker-02 worker-03 zone=zone-a

# Zone B nodes
kubectl label node worker-04 worker-05 worker-06 zone=zone-b

# Verify labels applied correctly
kubectl get nodes --show-labels | grep "zone="
```

---

## Step 5: Disable the Original Pool

Disabling the original pool stops new pod IP allocations from using it. Existing pod IPs in the original pool remain valid and routable.

```bash
# Disable the original pool — new allocations will use sub-pools
calicoctl patch ippool default-ipv4-ippool \
  --patch '{"spec":{"disabled":true}}'

# Confirm the pool is now disabled
calicoctl get ippool default-ipv4-ippool -o yaml | grep disabled
```

---

## Step 6: Verify New Pods Get IPs from Sub-Pools

Create a test pod on each zone and confirm its IP falls within the expected sub-pool CIDR:

```bash
# Create a test pod scheduled to zone-a
kubectl run test-zone-a \
  --image=busybox \
  --restart=Never \
  --overrides='{"spec":{"nodeSelector":{"zone":"zone-a"}}}' \
  -- sleep 60

# Check the assigned IP
kubectl get pod test-zone-a -o jsonpath='{.status.podIP}'
# Expected: IP in range 10.0.0.0 – 10.0.127.255

# Create a test pod scheduled to zone-b
kubectl run test-zone-b \
  --image=busybox \
  --restart=Never \
  --overrides='{"spec":{"nodeSelector":{"zone":"zone-b"}}}' \
  -- sleep 60

# Check the assigned IP
kubectl get pod test-zone-b -o jsonpath='{.status.podIP}'
# Expected: IP in range 10.0.128.0 – 10.0.255.255

# Run post-split IPAM consistency check
calicoctl ipam check

# Clean up test pods
kubectl delete pod test-zone-a test-zone-b
```

---

## Best Practices

- Use CIDR boundaries that align with natural binary splits (e.g., /16 into two /17s) to make routing rules and IPAM debugging simpler.
- Set `blockSize` consistently across all sub-pools; mixing block sizes in the same cluster complicates IPAM block affinity management.
- Match the `ipipMode` and `vxlanMode` of sub-pools to the original pool unless you are intentionally changing encapsulation as part of the split.
- Keep a fallback pool with no `nodeSelector` during the transition period to catch any unlabeled nodes.
- Run `calicoctl ipam check` after every step — not just at the end.

---

## Conclusion

Setting up Calico IPAM split workflows is a straightforward multi-step process: create sub-pools, label nodes, disable the source pool, and verify. The key to success is doing the steps in the right order (pools before labels) and running IPAM consistency checks at each stage. Once the split is verified, you have zone-specific IP pools that enable zone-aware routing and policy enforcement.

---

*Monitor post-split IPAM utilization and detect exhaustion before it impacts workloads with [OneUptime](https://oneuptime.com).*
