# Rolling Back Safely After Using calicoctl node diags

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Calico, Calicoctl, Diagnostics, Rollback, Kubernetes

Description: Understand that calicoctl node diags is read-only and learn how to use diagnostic data to inform safe rollback decisions for Calico configuration changes.

---

## Introduction

The `calicoctl node diags` command is a read-only diagnostic collection tool. It does not modify any cluster state, configurations, or running processes. Therefore, there is nothing to "roll back" from the command itself.

However, diagnostic data collected by this command is frequently used to inform rollback decisions. When diagnostics reveal problems caused by recent changes, you need to use that data to plan and execute a safe rollback of whatever change caused the issue.

This guide focuses on using diagnostic bundle analysis to guide rollback decisions and procedures.

## Prerequisites

- Diagnostic bundles collected before and after changes
- `calicoctl` and `kubectl` access
- Understanding of recent changes made to the cluster

## Using Diagnostics to Identify What to Roll Back

### Step 1: Compare Before and After Bundles

```bash
#!/bin/bash
# analyze-for-rollback.sh
# Compares diagnostic bundles to identify what changed

BEFORE_BUNDLE="$1"
AFTER_BUNDLE="$2"

BEFORE_DIR=$(mktemp -d)
AFTER_DIR=$(mktemp -d)

tar xzf "$BEFORE_BUNDLE" -C "$BEFORE_DIR" 2>/dev/null
tar xzf "$AFTER_BUNDLE" -C "$AFTER_DIR" 2>/dev/null

echo "=== Changes Detected ==="

# Compare iptables
echo "--- iptables Changes ---"
BEFORE_CHAINS=$(grep -c "^:" $(find "$BEFORE_DIR" -name iptables) 2>/dev/null || echo 0)
AFTER_CHAINS=$(grep -c "^:" $(find "$AFTER_DIR" -name iptables) 2>/dev/null || echo 0)
echo "Chains: $BEFORE_CHAINS -> $AFTER_CHAINS"

# Compare routes
echo "--- Route Changes ---"
diff <(sort $(find "$BEFORE_DIR" -name ip-route) 2>/dev/null) \
     <(sort $(find "$AFTER_DIR" -name ip-route) 2>/dev/null) | head -20

# Compare error rates in logs
echo "--- Error Rate Changes ---"
BEFORE_ERRORS=$(find "$BEFORE_DIR" -type f -exec grep -ci "error" {} + 2>/dev/null | awk -F: '{sum+=$NF} END {print sum}')
AFTER_ERRORS=$(find "$AFTER_DIR" -type f -exec grep -ci "error" {} + 2>/dev/null | awk -F: '{sum+=$NF} END {print sum}')
echo "Errors: ${BEFORE_ERRORS:-0} -> ${AFTER_ERRORS:-0}"

rm -rf "$BEFORE_DIR" "$AFTER_DIR"
```

### Step 2: Identify the Root Cause

Common findings and their rollback actions:

| Diagnostic Finding | Likely Cause | Rollback Action |
|-------------------|-------------|----------------|
| New DROP rules in iptables | Network policy change | Revert the policy |
| Missing routes | BGP config change | Restore BGP settings |
| Increased error count in Felix logs | Configuration change | Revert Felix config |
| Changed IP pool entries | IP pool modification | Restore original pool |

### Step 3: Execute the Rollback

Based on diagnostics, revert the specific change:

```bash
# Example: Rollback a network policy that caused issues
calicoctl delete globalnetworkpolicy problematic-policy

# Example: Restore a BGP configuration
calicoctl apply -f backup/bgp-configuration.yaml

# Example: Revert Felix configuration
calicoctl apply -f backup/felix-configuration.yaml
```

### Step 4: Collect Post-Rollback Diagnostics

```bash
# Collect new diagnostics to confirm the rollback worked
sudo calicoctl node diags

# Compare with the "before" (working) state
./analyze-for-rollback.sh before-change-diags.tar.gz post-rollback-diags.tar.gz
```

## Best Practice: Always Collect Before Changes

```bash
#!/bin/bash
# pre-change-diags.sh
# Always run before making Calico changes

CHANGE_ID="${1:-unknown}"
DIAG_DIR="change-diags/$CHANGE_ID"
mkdir -p "$DIAG_DIR"

echo "Collecting pre-change diagnostics for change: $CHANGE_ID"

sudo calicoctl node diags
mv /tmp/calico-diags-*.tar.gz "$DIAG_DIR/before.tar.gz"

echo "Pre-change diagnostics saved to $DIAG_DIR/before.tar.gz"
echo "After making changes, run:"
echo "  sudo calicoctl node diags && mv /tmp/calico-diags-*.tar.gz $DIAG_DIR/after.tar.gz"
```

## Verification

After rollback, verify the system matches the pre-change state:

```bash
# Collect post-rollback diagnostics
sudo calicoctl node diags

# Compare with pre-change baseline
./analyze-for-rollback.sh change-diags/before.tar.gz /tmp/calico-diags-*.tar.gz
```

## Troubleshooting

- **No pre-change diagnostics available**: Use the current diagnostics to identify issues, but you will not have a comparison baseline. Focus on error messages in logs.
- **Rollback did not resolve all issues**: Some changes have cascading effects. Check for dependent resources that also need to be reverted.
- **Diagnostics show same issues before and after**: The problem may pre-date your change. Expand the investigation scope.

## Conclusion

While `calicoctl node diags` is purely a data collection tool, the information it provides is essential for making informed rollback decisions. By collecting diagnostics before and after every change, comparing the bundles systematically, and using the findings to guide precise rollbacks, you maintain a safe and auditable change management process for your Calico deployment.
