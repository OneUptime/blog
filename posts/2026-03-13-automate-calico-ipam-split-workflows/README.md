# Automating Calico IPAM Split Workflows

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Calico, Kubernetes, IPAM, Networking, Automation, IP Pools, CNI

Description: Automate Calico IPAM pool splitting operations with scripts that validate pre-split conditions, execute the split, and verify post-split IPAM consistency — reducing human error in large clusters.

---

## Introduction

Splitting a Calico IP pool is a precise operation. Done manually, it is easy to apply node selectors in the wrong order, forget to check IPAM consistency before and after, or miss the step that prevents existing allocations from falling outside the new sub-pool boundaries. Automation removes these risks by enforcing a consistent workflow every time.

This post shows how to build a scripted automation for Calico IPAM splits that validates prerequisites, executes the split, and verifies the result.

---

## Prerequisites

- Calico v3.x installed with the `projectcalico.org/v3` API
- `calicoctl` v3.x CLI installed and in your PATH
- `kubectl` access to the cluster
- Sufficient unallocated IP space in the pool being split
- A planned split design (source CIDR, destination sub-CIDRs, target node selectors)

---

## Step 1: Understand What the Split Does

A Calico IPAM split takes one IP pool and subdivides it into two or more smaller pools. After the split, new IP allocations on nodes matching each sub-pool's `nodeSelector` draw from that sub-pool. Existing allocations in the original pool remain valid and are not moved.

The critical prerequisite is that all currently allocated IPs must fit within one of the planned sub-pool CIDRs. If any allocated IP falls outside all sub-pool CIDRs, the split will create an inconsistent IPAM state.

---

## Step 2: Write a Pre-Split Validation Script

```bash
#!/bin/bash
# pre-split-validate.sh
# Validates that a Calico IPAM split is safe to execute
# Usage: ./pre-split-validate.sh 10.0.0.0/16 10.0.0.0/17 10.0.128.0/17

SOURCE_CIDR="$1"
SUB_POOL_A="$2"
SUB_POOL_B="$3"

echo "=== Calico IPAM Pre-Split Validation ==="
echo "Source pool: $SOURCE_CIDR"
echo "Target sub-pools: $SUB_POOL_A, $SUB_POOL_B"
echo ""

# Step 1: Check current IPAM consistency before making any changes
echo "Checking IPAM consistency..."
if ! calicoctl ipam check 2>&1 | grep -q "IPAM is consistent"; then
  echo "[FAIL] IPAM is not currently consistent. Fix existing issues before splitting."
  exit 1
fi
echo "[PASS] IPAM is consistent"

# Step 2: Verify the source pool exists
echo "Verifying source pool exists..."
if ! calicoctl get ippool --output=yaml 2>/dev/null | grep -q "$SOURCE_CIDR"; then
  echo "[FAIL] Source pool $SOURCE_CIDR does not exist"
  exit 1
fi
echo "[PASS] Source pool found"

# Step 3: Check current utilization
echo "Current IP utilization:"
calicoctl ipam show --show-blocks 2>/dev/null | grep -A2 "$SOURCE_CIDR" || true

echo ""
echo "[OK] Pre-split validation passed. Proceed with split."
```

---

## Step 3: Define the New IP Pools as YAML

Prepare the sub-pool definitions before executing the split. This allows you to review them before applying.

```yaml
# ippool-sub-a.yaml
# First sub-pool: assigned to nodes in zone-a
apiVersion: projectcalico.org/v3
kind: IPPool
metadata:
  name: prod-zone-a
spec:
  # First half of the original /16
  cidr: 10.0.0.0/17
  # Only nodes with this label will draw from this pool
  nodeSelector: "zone == 'zone-a'"
  # Use the same encapsulation as the original pool
  ipipMode: Never
  vxlanMode: Always
  # Block size controls how many IPs are pre-allocated per node
  blockSize: 26
  natOutgoing: true
  disabled: false
```

```yaml
# ippool-sub-b.yaml
# Second sub-pool: assigned to nodes in zone-b
apiVersion: projectcalico.org/v3
kind: IPPool
metadata:
  name: prod-zone-b
spec:
  cidr: 10.0.128.0/17
  nodeSelector: "zone == 'zone-b'"
  ipipMode: Never
  vxlanMode: Always
  blockSize: 26
  natOutgoing: true
  disabled: false
```

---

## Step 4: Write the Split Execution Script

```bash
#!/bin/bash
# execute-split.sh
# Executes an IPAM split: disables the source pool and creates sub-pools
# Run pre-split-validate.sh first

SOURCE_POOL_NAME="$1"   # e.g., default-ipv4-ippool
SUB_POOL_A_FILE="$2"    # e.g., ippool-sub-a.yaml
SUB_POOL_B_FILE="$3"    # e.g., ippool-sub-b.yaml

echo "=== Executing IPAM Split ==="
echo "Disabling source pool: $SOURCE_POOL_NAME"

# Step 1: Disable the source pool to stop new allocations from it
# Existing allocations are unaffected; only new pods stop using it
calicoctl patch ippool "$SOURCE_POOL_NAME" \
  --patch '{"spec":{"disabled":true}}'
echo "[OK] Source pool disabled"

# Step 2: Apply the new sub-pools
echo "Creating sub-pool A..."
calicoctl apply -f "$SUB_POOL_A_FILE"
echo "[OK] Sub-pool A created"

echo "Creating sub-pool B..."
calicoctl apply -f "$SUB_POOL_B_FILE"
echo "[OK] Sub-pool B created"

# Step 3: Run post-split consistency check
echo "Running post-split IPAM check..."
calicoctl ipam check

echo ""
echo "=== Split complete. Verify new pools with: calicoctl get ippool ==="
```

---

## Step 5: Verify the Split Result

```bash
# List all IP pools and their status
calicoctl get ippool -o wide

# Confirm IPAM is still consistent after the split
calicoctl ipam check

# Show block allocation distribution across the new pools
calicoctl ipam show --show-blocks
```

---

## Best Practices

- Always run `calicoctl ipam check` before and after every split; it is the definitive test of IPAM consistency.
- Never delete the source pool until all allocations from it have been released (all pods using it have been restarted onto sub-pool addresses).
- Use `disabled: true` on the source pool rather than deleting it immediately — this prevents new allocations while preserving the record of existing ones.
- Test the split script in a staging cluster before running it in production.
- Store the split plan (source CIDR, sub-CIDRs, node selectors) in version control alongside the cluster configuration.

---

## Conclusion

Automating Calico IPAM splits removes the risk of human error by enforcing a consistent workflow: pre-split consistency check, YAML-defined sub-pools for review, staged execution (disable then create), and post-split verification. With this automation in place, splits become a low-risk infrastructure operation rather than a manual procedure prone to omissions.

---

*Monitor IPAM utilization and get alerted on allocation failures with [OneUptime](https://oneuptime.com).*
