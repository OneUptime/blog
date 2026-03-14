# Troubleshooting Calico IPAM Split Failures

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Calico, Kubernetes, IPAM, Troubleshooting, Networking, IP Pools, CNI

Description: Diagnose and resolve the most common Calico IPAM split failures — from pods getting IPs from the wrong pool to IPAM inconsistencies that appear after a split — using calicoctl diagnostic commands.

---

## Introduction

IPAM splits are largely irreversible once pods are running on the new sub-pools. When something goes wrong — pods failing to get IPs, `calicoctl ipam check` reporting inconsistency, or pods landing on the wrong sub-pool — you need to diagnose the problem quickly and precisely before attempting any corrective action.

This post covers the diagnostic commands and remediation steps for each common IPAM split failure mode.

---

## Prerequisites

- Calico v3.x with `calicoctl` v3.x installed
- `kubectl` cluster-admin access
- A recently completed (or in-progress) IPAM split
- Familiarity with the `setup` and `avoid-mistakes` posts in this series

---

## Step 1: Diagnose Pods Getting IPs from the Wrong Pool

If a pod on a zone-a node gets an IP from the zone-b CIDR, the node selector is not matching correctly.

```bash
# Check the node labels for the node hosting the misallocated pod
NODE=$(kubectl get pod <pod-name> -n <namespace> -o jsonpath='{.spec.nodeName}')
kubectl get node "$NODE" --show-labels | grep zone

# Check the IPPool node selector for the expected pool
calicoctl get ippool prod-pool-zone-a -o yaml | grep nodeSelector

# Verify the pool is not disabled
calicoctl get ippool prod-pool-zone-a -o yaml | grep disabled
```

The most common cause is the node not having the correct label. Apply the correct label:

```bash
# Re-apply the correct zone label to the misallocated node
kubectl label node "$NODE" zone=zone-a --overwrite

# The existing pod IP will not change, but the next pod on this node
# will get an IP from the correct pool
```

---

## Step 2: Diagnose IPAM Inconsistency After Split

If `calicoctl ipam check` reports inconsistency after a split:

```bash
# Run a detailed IPAM check with verbose output
calicoctl ipam check --show-all-ips 2>/dev/null > /tmp/ipam-check-output.txt
cat /tmp/ipam-check-output.txt

# Common inconsistency: allocation records reference a deleted pool
# Look for "no matching pool" messages
grep "no matching pool" /tmp/ipam-check-output.txt

# List all current pools to compare against referenced pools
calicoctl get ippool -o wide
```

If the inconsistency is due to allocation records that reference the disabled original pool, check whether those allocations still have running pods:

```bash
# Find all pods still using IPs from the original pool CIDR (e.g., 10.0.0.0/16)
# that are NOT in either sub-pool CIDR
kubectl get pods --all-namespaces -o json \
  | jq -r '.items[] | select(.status.podIP != null) | "\(.metadata.namespace)/\(.metadata.name): \(.status.podIP)"' \
  | grep "10.0." | head -30
```

---

## Step 3: Diagnose Pods Failing to Get IP Addresses

If new pods are stuck in `ContainerCreating` with events showing IP allocation failures:

```bash
# Check pod events for IP allocation errors
kubectl describe pod <stuck-pod-name> -n <namespace> | grep -A5 "Events:"

# Common error: "no IP addresses available in block"
# Check block utilization for the affected node's pool
STUCK_NODE=$(kubectl get pod <stuck-pod-name> -n <namespace> \
  -o jsonpath='{.spec.nodeName}')
NODE_ZONE=$(kubectl get node "$STUCK_NODE" \
  -o jsonpath='{.metadata.labels.topology\.kubernetes\.io/zone}')
echo "Node zone: $NODE_ZONE"

# Check pool utilization for this zone
calicoctl ipam show --show-blocks | grep "$NODE_ZONE"

# If the pool is exhausted, check if the original pool is still enabled
# (it should be disabled but not deleted during the transition)
calicoctl get ippool -o wide | grep disabled
```

If the pool for this zone is exhausted, either expand it by creating a larger replacement or add a temporary fallback pool:

```yaml
# emergency-fallback-pool.yaml
# Emergency fallback pool when a zone pool is exhausted
apiVersion: projectcalico.org/v3
kind: IPPool
metadata:
  name: emergency-fallback
spec:
  # Use a separate CIDR not overlapping with existing pools
  cidr: 10.2.0.0/16
  # No nodeSelector — available to all nodes
  ipipMode: Never
  vxlanMode: Always
  blockSize: 26
  natOutgoing: true
  disabled: false
```

```bash
calicoctl apply -f emergency-fallback-pool.yaml
```

---

## Step 4: Diagnose Node With No Matching Pool

If a node does not match any pool's `nodeSelector`, new pods on that node cannot get IPs:

```bash
# Find nodes that don't match any zone-specific selector
kubectl get nodes -o json | jq -r \
  '.items[] | select(.metadata.labels.zone == null) | .metadata.name'

# For each unlabeled node, check if pods are failing to get IPs
for node in $(kubectl get nodes -o json | jq -r \
    '.items[] | select(.metadata.labels.zone == null) | .metadata.name'); do
  echo "=== Unlabeled node: $node ==="
  kubectl get pods --all-namespaces \
    --field-selector spec.nodeName=$node \
    | grep -v Running
done

# Label the node with the correct zone
kubectl label node <unlabeled-node> zone=zone-a --overwrite
```

---

## Step 5: Recover from a Partial Split

If the split was interrupted partway through (e.g., sub-pools created but node labels not yet applied):

```bash
# Check current state of all pools
calicoctl get ippool -o wide

# Check node label coverage
kubectl get nodes --show-labels | grep -v "zone=" | grep -v NAME | awk '{print $1}'

# Option 1: Complete the split by labeling remaining nodes
kubectl label nodes <unlabeled-nodes> zone=zone-a

# Option 2: Roll back by re-enabling the original pool
# (only if no allocations have been made from sub-pools yet)
calicoctl patch ippool default-ipv4-ippool \
  --patch '{"spec":{"disabled":false}}'
```

---

## Best Practices

- When diagnosing IPAM issues, always run `calicoctl ipam check` first — it identifies the category of problem before you investigate individual symptoms.
- Never delete an IP pool to "fix" an inconsistency; deleting a pool with active allocations makes the situation worse.
- Keep the pre-split IPAM state snapshot (`calicoctl ipam show --show-blocks` output) as a reference during troubleshooting.
- If you cannot determine the root cause of an inconsistency, re-enable the original pool and engage Calico support before proceeding.
- Use `kubectl describe pod` to find the exact error message from the Calico IP allocation driver — this is the fastest path to identifying the specific failure mode.

---

## Conclusion

IPAM split troubleshooting always starts with `calicoctl ipam check` and ends with verifying that new pod allocations go to the correct pool. The most common problems — wrong node label, exhausted pool, missing pool for unlabeled nodes — all have straightforward diagnostic commands and clear remediation steps. Avoid deleting resources until you understand exactly what went wrong.

---

*Get alerted on pod IP allocation failures and IPAM health degradation with [OneUptime](https://oneuptime.com).*
