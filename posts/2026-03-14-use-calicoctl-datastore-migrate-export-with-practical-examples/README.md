# Using calicoctl datastore migrate export with Practical Examples

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Calico, calicoctl, Datastore Migration, Kubernetes, etcd

Description: Learn how to export Calico configuration data from your current datastore using calicoctl datastore migrate export for safe migration to a new datastore backend.

---

## Introduction

Migrating Calico's datastore is a critical operation when transitioning between etcd and Kubernetes API datastore backends. The `calicoctl datastore migrate export` command plays a key role in this process, enabling you to safely move Calico configuration data between datastore types.

Datastore migration is most commonly performed when moving from a standalone etcd deployment to the Kubernetes API datastore (KDD mode), which simplifies operations by eliminating the need to maintain a separate etcd cluster for Calico.

This guide provides practical examples and step-by-step procedures for using `calicoctl datastore migrate export` effectively.

## Prerequisites

- A Calico cluster with the source datastore configured
- `calicoctl` v3.25+ installed
- Access to both source and target datastores
- A maintenance window (migration requires cluster coordination)
- Backup of all Calico resources

## Basic Usage

```bash
# Export all Calico resources from the current datastore
calicoctl datastore migrate export > calico-export.yaml
```

This exports all Calico resources (nodes, IP pools, policies, BGP configurations, etc.) into a YAML file that can be imported into a different datastore.

## Step-by-Step Export Process

### Step 1: Verify Current Datastore

```bash
# Check which datastore is configured
calicoctl version
echo "DATASTORE_TYPE=$DATASTORE_TYPE"
```

### Step 2: Create Pre-Export Backup

```bash
#!/bin/bash
# pre-export-backup.sh
BACKUP_DIR="pre-export-backup-$(date +%Y%m%d-%H%M%S)"
mkdir -p "$BACKUP_DIR"

for resource in nodes ippools globalnetworkpolicies networkpolicies \
  bgpconfigurations bgppeers felixconfigurations globalnetworksets \
  hostendpoints profiles; do
  calicoctl get "$resource" -o yaml > "$BACKUP_DIR/${resource}.yaml" 2>/dev/null
done
echo "Backup saved to $BACKUP_DIR"
```

### Step 3: Execute the Export

```bash
# Export to a file
calicoctl datastore migrate export > calico-export.yaml

# Verify the export file
wc -l calico-export.yaml
head -20 calico-export.yaml
```

### Step 4: Validate the Export

```bash
# Count resources in the export
grep "kind:" calico-export.yaml | sort | uniq -c

# Verify critical resources are included
grep "kind: IPPool" calico-export.yaml
grep "kind: BGPConfiguration" calico-export.yaml
grep "kind: GlobalNetworkPolicy" calico-export.yaml
```

## Export with Specific Resource Filtering

```bash
# Export and verify specific resource types
echo "=== Export Verification ==="
EXPORT_FILE="calico-export.yaml"

echo "Nodes: $(grep -c 'kind: Node' $EXPORT_FILE)"
echo "IP Pools: $(grep -c 'kind: IPPool' $EXPORT_FILE)"
echo "Global Policies: $(grep -c 'kind: GlobalNetworkPolicy' $EXPORT_FILE)"
echo "Network Policies: $(grep -c 'kind: NetworkPolicy' $EXPORT_FILE)"
echo "BGP Configs: $(grep -c 'kind: BGPConfiguration' $EXPORT_FILE)"
echo "BGP Peers: $(grep -c 'kind: BGPPeer' $EXPORT_FILE)"
echo "Felix Configs: $(grep -c 'kind: FelixConfiguration' $EXPORT_FILE)"
```


## Verification

After running `calicoctl datastore migrate export`:

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

`calicoctl datastore migrate export` is a critical part of the Calico datastore migration workflow. By following proper procedures, validating at each step, and maintaining backups, you can safely migrate your Calico configuration between datastore types with minimal risk.
