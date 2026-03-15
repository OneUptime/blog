# Rolling Back Safely After Using calicoctl label

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Calico, Calicoctl, Labels, Rollback, Kubernetes

Description: Learn safe procedures for reverting label changes made with calicoctl label, including strategies for undoing bulk label operations and restoring previous label states.

---

## Introduction

Label changes in Calico can have immediate and wide-reaching effects on network policy enforcement. If you apply an incorrect label, remove a critical label, or bulk-update labels with the wrong value, network traffic patterns can change instantly. Unlike Kubernetes deployments, there is no built-in rollback mechanism for label changes.

Rolling back labels safely requires preparation: taking snapshots before changes, understanding which policies depend on which labels, and having scripts ready to restore previous states. Without these precautions, reverting a bad label change can be as risky as the change itself.

This guide covers practical rollback strategies for `calicoctl label` operations, from single-resource fixes to fleet-wide label restoration.

## Prerequisites

- Kubernetes cluster with Calico installed
- `calicoctl` v3.25+ installed
- Understanding of your current label schema and network policies
- Backup of current Calico resource state (strongly recommended)

## Taking Label Snapshots Before Changes

Always capture the current state before making label changes:

```bash
#!/bin/bash
# snapshot-labels.sh
# Creates a snapshot of all Calico resource labels

SNAPSHOT_DIR="label-snapshots/$(date +%Y%m%d-%H%M%S)"
mkdir -p "$SNAPSHOT_DIR"

# Snapshot node labels
calicoctl get nodes -o json > "$SNAPSHOT_DIR/nodes.json"

# Snapshot host endpoint labels
calicoctl get hostendpoints -o json > "$SNAPSHOT_DIR/hostendpoints.json" 2>/dev/null

# Snapshot workload endpoint labels
calicoctl get workloadendpoints --all-namespaces -o json > "$SNAPSHOT_DIR/workloadendpoints.json" 2>/dev/null

echo "Snapshot saved to $SNAPSHOT_DIR"
echo "Files:"
ls -la "$SNAPSHOT_DIR"
```

## Rolling Back a Single Label Change

For a single node where you set the wrong label:

```bash
# You accidentally set the wrong environment
calicoctl label nodes worker-1 env=production --overwrite
# But worker-1 should be staging

# Fix: overwrite with the correct value
calicoctl label nodes worker-1 env=staging --overwrite

# Or remove the label entirely
calicoctl label nodes worker-1 env-
```

## Rolling Back a Removed Label

If you accidentally removed a label:

```bash
# Oops - removed the env label
calicoctl label nodes worker-1 env-

# Restore it
calicoctl label nodes worker-1 env=production
```

## Restoring Labels from a Snapshot

Use a previously taken snapshot to restore all labels:

```bash
#!/bin/bash
# restore-labels.sh
# Restores labels from a snapshot
# Usage: ./restore-labels.sh <snapshot-directory>

SNAPSHOT_DIR="$1"

if [ -z "$SNAPSHOT_DIR" ] || [ ! -d "$SNAPSHOT_DIR" ]; then
  echo "Usage: $0 <snapshot-directory>"
  echo "Available snapshots:"
  ls -d label-snapshots/*/ 2>/dev/null
  exit 1
fi

echo "Restoring labels from $SNAPSHOT_DIR"

# Restore node labels
if [ -f "$SNAPSHOT_DIR/nodes.json" ]; then
  echo "Restoring node labels..."
  
  python3 -c "
import json, subprocess, sys

with open('$SNAPSHOT_DIR/nodes.json') as f:
    data = json.load(f)

items = data.get('items', [data]) if 'items' in data else [data]

for node in items:
    name = node['metadata']['name']
    labels = node['metadata'].get('labels', {})
    
    print(f'Restoring labels for node {name}')
    for key, value in labels.items():
        # Skip system labels
        if key.startswith('projectcalico.org/'):
            continue
        cmd = ['calicoctl', 'label', 'nodes', name, f'{key}={value}', '--overwrite']
        result = subprocess.run(cmd, capture_output=True, text=True)
        if result.returncode != 0:
            print(f'  ERROR: {key}={value} - {result.stderr.strip()}')
        else:
            print(f'  OK: {key}={value}')
"
fi

# Restore host endpoint labels
if [ -f "$SNAPSHOT_DIR/hostendpoints.json" ]; then
  echo ""
  echo "Restoring host endpoint labels..."
  calicoctl apply -f "$SNAPSHOT_DIR/hostendpoints.json"
fi

echo ""
echo "Label restoration complete."
```

## Bulk Rollback Script

When you need to undo a bulk label operation:

```bash
#!/bin/bash
# rollback-bulk-label.sh
# Removes a specific label from all nodes
# Usage: ./rollback-bulk-label.sh <label-key>

LABEL_KEY="$1"

if [ -z "$LABEL_KEY" ]; then
  echo "Usage: $0 <label-key>"
  exit 1
fi

echo "Removing label '$LABEL_KEY' from all nodes..."

NODES=$(calicoctl get nodes -o jsonpath='{range .items[*]}{.metadata.name}{"\n"}{end}')

for NODE in $NODES; do
  echo "  Removing from $NODE..."
  calicoctl label nodes "$NODE" "${LABEL_KEY}-" 2>&1
done

echo "Bulk rollback complete."
```

## Emergency Rollback: Restoring Full Node Resources

In severe cases, restore the entire node resource from backup:

```bash
#!/bin/bash
# emergency-restore-nodes.sh
# Restores complete Calico node resources from backup

SNAPSHOT_DIR="$1"

if [ -z "$SNAPSHOT_DIR" ]; then
  echo "Usage: $0 <snapshot-directory>"
  exit 1
fi

echo "WARNING: This will restore complete node resources from backup."
echo "This includes labels, BGP config, and other node settings."
read -p "Continue? (yes/no): " CONFIRM

if [ "$CONFIRM" != "yes" ]; then
  echo "Aborted."
  exit 0
fi

# Apply the full node resources
calicoctl apply -f "$SNAPSHOT_DIR/nodes.json"

echo "Node resources restored. Verify with:"
echo "  calicoctl get nodes -o yaml"
```

## Verification

After a rollback, verify the labels are correct:

```bash
# Check all node labels
calicoctl get nodes -o yaml | grep -A10 "labels:"

# Verify policies still select correctly
calicoctl get globalnetworkpolicies -o yaml | grep "selector:"

# Test network connectivity
kubectl run test-conn --image=busybox --rm -it -- ping -c 3 <target-ip>
```

## Troubleshooting

- **Snapshot file is empty or corrupt**: Always verify snapshots right after creating them. Run `cat snapshot-dir/nodes.json | python3 -m json.tool` to validate JSON.
- **Cannot restore system labels**: Labels prefixed with `projectcalico.org/` are managed by Calico itself and should not be manually restored. Skip them during restoration.
- **Labels restored but policies still not working**: Felix may need a few seconds to recalculate policy rules after label changes. Check Felix logs if policies are not enforced after 30 seconds.
- **Partial rollback left inconsistent state**: Use the comprehensive restore script rather than manual fixes to ensure all nodes return to the snapshot state.

## Conclusion

Safe rollback of `calicoctl label` operations depends on proactive snapshot management. By capturing label state before changes, maintaining restoration scripts, and validating after rollback, you can confidently make label changes knowing you can revert if something goes wrong. Make label snapshots a mandatory part of your change management process.
