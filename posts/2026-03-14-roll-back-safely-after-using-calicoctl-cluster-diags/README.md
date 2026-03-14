# Rolling Back Safely After Using calicoctl cluster diags

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Calico, calicoctl, Cluster Diagnostics, Rollback, Kubernetes

Description: Understand that calicoctl cluster diags is a read-only command and learn how to use collected diagnostics to guide safe rollback of cluster-wide Calico changes.

---

## Introduction

The `calicoctl cluster diags` command is entirely read-only. It collects information from the Calico datastore without modifying any resources. There is nothing to roll back from running this command.

However, cluster diagnostics are frequently collected as part of change management. By comparing diagnostic bundles taken before and after changes, you can identify exactly what changed and roll back specific resources if needed.

## Prerequisites

- Pre-change and post-change diagnostic bundles
- `calicoctl` access to the cluster
- Understanding of what was changed

## Using Diagnostics to Guide Rollback

### Comparing Bundles

```bash
#!/bin/bash
# compare-cluster-diags.sh

BEFORE="$1"
AFTER="$2"

BEFORE_DIR=$(mktemp -d)
AFTER_DIR=$(mktemp -d)

tar xzf "$BEFORE" -C "$BEFORE_DIR"
tar xzf "$AFTER" -C "$AFTER_DIR"

echo "=== Cluster Configuration Changes ==="

# Compare each resource file
for AFTER_FILE in $(find "$AFTER_DIR" -name "*.yaml"); do
  RESOURCE=$(basename "$AFTER_FILE")
  BEFORE_FILE=$(find "$BEFORE_DIR" -name "$RESOURCE")
  
  if [ -n "$BEFORE_FILE" ]; then
    CHANGES=$(diff "$BEFORE_FILE" "$AFTER_FILE" | head -20)
    if [ -n "$CHANGES" ]; then
      echo "--- Changed: $RESOURCE ---"
      echo "$CHANGES"
      echo ""
    fi
  else
    echo "--- New: $RESOURCE ---"
  fi
done

rm -rf "$BEFORE_DIR" "$AFTER_DIR"
```

### Restoring from Diagnostics

```bash
# Extract the pre-change resources
BEFORE_DIR=$(mktemp -d)
tar xzf before-change-diags.tar.gz -C "$BEFORE_DIR"

# Apply the pre-change state for a specific resource
calicoctl apply -f "$BEFORE_DIR/globalnetworkpolicies.yaml"
calicoctl apply -f "$BEFORE_DIR/bgpconfigurations.yaml"
```

## Verification

After rollback, collect fresh diagnostics and compare with the pre-change baseline:

```bash
calicoctl cluster diags
./compare-cluster-diags.sh before-change-diags.tar.gz calico-cluster-diags-*.tar.gz
```

The output should show minimal or no differences.

## Troubleshooting

- **Cannot apply old resources**: Resource schema may have changed between Calico versions. Manually edit the YAML if needed.
- **Some resources cannot be restored**: System-managed resources may reject manual modifications. Focus on user-created resources.

## Conclusion

While `calicoctl cluster diags` is read-only, the diagnostic bundles it produces are essential for change management. By collecting diagnostics before and after changes and using the comparison to guide rollback, you maintain a safety net for all cluster-wide Calico modifications.
