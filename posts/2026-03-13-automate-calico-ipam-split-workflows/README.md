# Automating Calico IPAM Split Workflows

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Calico, Kubernetes, Networking, IPAM

Description: Automate Calico IPAM pool splitting operations with scripts that validate pre-split conditions, execute the split, and verify post-split IPAM consistency - reducing human error in large clusters.

---

## Introduction

Splitting a Calico IP pool is a precise operation. Done manually, it is easy to apply node selectors in the wrong order, forget to check IPAM consistency before and after, or miss the step that prevents existing allocations from falling outside the new sub-pool boundaries. Automation removes these risks by enforcing a consistent workflow every time.

This post shows how to build a scripted automation for Calico IPAM splits that validates prerequisites, executes the split, and verifies the result.

---

## Prerequisites

- Calico v3.x installed with the `projectcalico.org/v3` API
- `calicoctl` v3.x CLI installed and in your PATH
- `kubectl` access to the cluster
- A split count that is a power of 2
- A planned split design (source CIDR or pool name, equal-size destination sub-CIDRs, target node selectors)

---

## Step 1: Understand What the Split Does

A Calico IPAM split takes one IP pool and subdivides it into two or more smaller pools with `calicoctl ipam split`. Each child IP pool is the same size, and the split count must be a power of 2. After the split, new IP allocations on nodes matching each sub-pool's `nodeSelector` draw from that sub-pool. Existing allocations in the original pool remain valid and are not moved.

The critical prerequisite is that no IPAM data changes while the split is running. Calico requires the datastore to be locked before the split and unlocked after it completes.

---

## Step 2: Write a Pre-Split Validation Script

```bash
#!/bin/bash
# pre-split-validate.sh

# Validates that a Calico IPAM split is safe to execute
# Usage: ./pre-split-validate.sh 10.0.0.0/16 2

SOURCE_CIDR="$1"
SPLIT_COUNT="$2"

echo "=== Calico IPAM Pre-Split Validation ==="
echo "Source pool: $SOURCE_CIDR"
echo "Split count: $SPLIT_COUNT"
echo ""

if [[ -z "$SOURCE_CIDR" || -z "$SPLIT_COUNT" ]]; then
  echo "[FAIL] Usage: $0 <source-cidr> <split-count>"
  exit 1
fi

if ! [[ "$SPLIT_COUNT" =~ ^[0-9]+$ ]] || (( SPLIT_COUNT < 2 )) || (( SPLIT_COUNT & (SPLIT_COUNT - 1) )); then
  echo "[FAIL] Split count must be a power of 2"
  exit 1
fi

# Step 1: Check current IPAM consistency before making any changes
echo "Checking IPAM consistency..."
if ! calicoctl ipam check; then
  echo "[FAIL] IPAM is not currently consistent. Fix existing issues before splitting."
  exit 1
fi
echo "[PASS] IPAM is consistent"

# Step 2: Verify the source pool exists
echo "Verifying source pool exists..."
if ! calicoctl get ippool --output=yaml 2>/dev/null | grep -Fq "$SOURCE_CIDR"; then
  echo "[FAIL] Source pool $SOURCE_CIDR does not exist"
  exit 1
fi
echo "[PASS] Source pool found"

# Step 3: Check current utilization and confirm split support
echo "Current IP utilization:"
calicoctl ipam show --show-blocks 2>/dev/null | grep -A2 "$SOURCE_CIDR" || true

if ! calicoctl ipam split --help >/dev/null 2>&1; then
  echo "[FAIL] This calicoctl version does not support ipam split"
  exit 1
fi

echo ""
echo "[OK] Pre-split validation passed. Proceed with split."
```

---

## Step 3: Define the Post-Split Node Selector Patches

Prepare the node selector patches before executing the split. The split command creates the child pools; these patches apply the routing design after the child pool names are known.

```json
{
  "spec": {
    "nodeSelector": "zone == 'zone-a'"
  }
}
```

```json
{
  "spec": {
    "nodeSelector": "zone == 'zone-b'"
  }
}
```

---

## Step 4: Write the Split Execution Script

```bash
#!/bin/bash
# execute-split.sh
# Executes an IPAM split and applies node selectors to the new child pools
# Run pre-split-validate.sh first
set -euo pipefail

SOURCE_POOL_NAME="${1:-}"    # e.g., default-ipv4-ippool
SPLIT_COUNT="${2:-}"         # e.g., 2
SUB_POOL_A_NAME="${3:-}"     # child pool name from calicoctl get ippool
SUB_POOL_A_PATCH="${4:-}"    # e.g., zone-a-selector.json
SUB_POOL_B_NAME="${5:-}"     # child pool name from calicoctl get ippool
SUB_POOL_B_PATCH="${6:-}"    # e.g., zone-b-selector.json

echo "=== Executing IPAM Split ==="
echo "Source pool: $SOURCE_POOL_NAME"
echo "Split count: $SPLIT_COUNT"

if [[ -z "$SOURCE_POOL_NAME" || -z "$SPLIT_COUNT" ]]; then
  echo "[FAIL] Usage: $0 <source-pool-name> <split-count> [child-a-name child-a-patch child-b-name child-b-patch]"
  exit 1
fi

unlock_datastore() {
  if [[ "${LOCKED:-false}" == "true" ]]; then
    echo "Unlocking Calico datastore..."
    calicoctl datastore migrate unlock
  fi
}
trap unlock_datastore EXIT

# Step 1: Lock the datastore so IPAM data cannot change during the split
echo "Locking Calico datastore..."
calicoctl datastore migrate lock
LOCKED=true

# Step 2: Split the source pool into equal-size child pools
echo "Splitting source pool..."
calicoctl ipam split --name="$SOURCE_POOL_NAME" "$SPLIT_COUNT"
echo "[OK] Source pool split"

# Step 3: Apply node selectors to the child pools if patch files were supplied
if [[ -n "$SUB_POOL_A_NAME" && -n "$SUB_POOL_A_PATCH" ]]; then
  echo "Patching sub-pool A selector..."
  calicoctl patch ippool "$SUB_POOL_A_NAME" --patch "$(cat "$SUB_POOL_A_PATCH")"
  echo "[OK] Sub-pool A selector patched"
fi

if [[ -n "$SUB_POOL_B_NAME" && -n "$SUB_POOL_B_PATCH" ]]; then
  echo "Patching sub-pool B selector..."
  calicoctl patch ippool "$SUB_POOL_B_NAME" --patch "$(cat "$SUB_POOL_B_PATCH")"
  echo "[OK] Sub-pool B selector patched"
fi

# Step 4: Run post-split consistency check
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
- Always lock the datastore before `calicoctl ipam split` and unlock it immediately after the split completes.
- Use `calicoctl ipam split` instead of manually creating overlapping child IPPools. Calico validates overlapping CIDRs, and the split command performs the supported pool subdivision.
- Test the split script in a staging cluster before running it in production.
- Store the split plan (source CIDR, sub-CIDRs, node selectors) in version control alongside the cluster configuration.

---

## Conclusion

Automating Calico IPAM splits removes the risk of human error by enforcing a consistent workflow: pre-split consistency check, reviewed node selector patches, datastore locking, `calicoctl ipam split`, and post-split verification. With this automation in place, splits become a low-risk infrastructure operation rather than a manual procedure prone to omissions.

---

*Monitor IPAM utilization and get alerted on allocation failures with [OneUptime](https://oneuptime.com).*
