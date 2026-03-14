# Using calicoctl datastore migrate import with Practical Examples

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Calico, Calicoctl, Datastore Migration, Kubernetes, etcd

Description: Import Calico configuration data into a new datastore backend using calicoctl datastore migrate import for completing datastore migrations.

---

## Introduction

Migrating Calico's datastore is a critical operation when transitioning between etcd and Kubernetes API datastore backends. The `calicoctl datastore migrate import` command plays a key role in this process, enabling you to safely move Calico configuration data between datastore types.

Datastore migration is most commonly performed when moving from a standalone etcd deployment to the Kubernetes API datastore (KDD mode), which simplifies operations by eliminating the need to maintain a separate etcd cluster for Calico.

This guide provides practical examples and step-by-step procedures for using `calicoctl datastore migrate import` effectively.

## Prerequisites

- A Calico cluster with the source datastore configured
- `calicoctl` v3.25+ installed
- Access to both source and target datastores
- A maintenance window (migration requires cluster coordination)
- Backup of all Calico resources

## Basic Usage

```bash
# Import Calico resources into the target datastore
calicoctl datastore migrate import -f calico-export.yaml
```

This reads the exported YAML file and creates all Calico resources in the currently configured datastore.

## Step-by-Step Import Process

### Step 1: Configure Target Datastore

```bash
# Switch to the target datastore
# For Kubernetes datastore (KDD):
export DATASTORE_TYPE=kubernetes
export KUBECONFIG=/path/to/kubeconfig

# Verify connectivity to target
calicoctl version
kubectl cluster-info
```

### Step 2: Verify Target is Clean

```bash
# Check that the target datastore does not have conflicting resources
calicoctl get nodes 2>/dev/null | wc -l
calicoctl get ippools 2>/dev/null | wc -l
calicoctl get globalnetworkpolicies 2>/dev/null | wc -l
```

### Step 3: Execute the Import

```bash
# Import the exported data
calicoctl datastore migrate import -f calico-export.yaml

# Check for errors
echo "Exit code: $?"
```

### Step 4: Validate the Import

```bash
#!/bin/bash
# validate-import.sh
EXPORT_FILE="calico-export.yaml"

echo "=== Import Validation ==="
echo ""

# Compare resource counts
echo "Resource count comparison (export vs import):"
for KIND in Node IPPool GlobalNetworkPolicy NetworkPolicy BGPConfiguration BGPPeer FelixConfiguration; do
  EXPORT_COUNT=$(grep -c "kind: $KIND" "$EXPORT_FILE" || echo 0)
  
  # Map Kind to calicoctl resource name
  case $KIND in
    Node) RESOURCE="nodes" ;;
    IPPool) RESOURCE="ippools" ;;
    GlobalNetworkPolicy) RESOURCE="globalnetworkpolicies" ;;
    NetworkPolicy) RESOURCE="networkpolicies" ;;
    BGPConfiguration) RESOURCE="bgpconfigurations" ;;
    BGPPeer) RESOURCE="bgppeers" ;;
    FelixConfiguration) RESOURCE="felixconfigurations" ;;
  esac
  
  IMPORT_COUNT=$(calicoctl get "$RESOURCE" 2>/dev/null | tail -n +2 | wc -l || echo 0)
  
  if [ "$EXPORT_COUNT" = "$IMPORT_COUNT" ]; then
    echo "  $KIND: OK ($EXPORT_COUNT)"
  else
    echo "  $KIND: MISMATCH (export=$EXPORT_COUNT, import=$IMPORT_COUNT)"
  fi
done
```

## Handling Import Conflicts

```bash
# If resources already exist, you may need to clean them first
# WARNING: Only do this on a fresh/empty target datastore
for r in globalnetworkpolicies networkpolicies bgppeers; do
  calicoctl delete "$r" --all 2>/dev/null
done

# Then retry the import
calicoctl datastore migrate import -f calico-export.yaml
```


## Verification

After running `calicoctl datastore migrate import`:

```bash
# Verify Calico version and connectivity
calicoctl version

# Check node status
calicoctl get nodes -o wide

# Verify resources are intact
calicoctl get globalnetworkpolicies
calicoctl get ippools
calicoctl get bgpconfigurations
```

## Troubleshooting

- **Permission errors**: Ensure calicoctl has read/write access to both source and target datastores.
- **Connection timeouts**: Verify network connectivity to both etcd and Kubernetes API server.
- **Resource conflicts**: If resources already exist in the target datastore, use the `--allow-version-mismatch` flag cautiously.
- **Incomplete migration**: Always verify resource counts match between source and target.

## Conclusion

`calicoctl datastore migrate import` is a critical part of the Calico datastore migration workflow. By following proper procedures, validating at each step, and maintaining backups, you can safely migrate your Calico configuration between datastore types with minimal risk.
