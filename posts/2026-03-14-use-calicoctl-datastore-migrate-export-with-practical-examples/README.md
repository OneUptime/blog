# Using calicoctl datastore migrate export with Practical Examples

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Calico, Calicoctl, Datastore Migration, Kubernetes, etcd

Description: Learn how to export Calico configuration data from your current datastore using calicoctl datastore migrate export for safe migration to a new datastore backend.

---

## Introduction

Migrating Calico's datastore is a critical operation when transitioning from an etcdv3 datastore to the Kubernetes API datastore backend. The `calicoctl datastore migrate export` command plays a key role in this process, enabling you to export Calico configuration data from etcdv3 for later import into the Kubernetes datastore.

Datastore migration is most commonly performed when moving from a standalone etcd deployment to the Kubernetes API datastore (KDD mode), which simplifies operations by eliminating the need to maintain a separate etcd cluster for Calico.

This guide provides practical examples and step-by-step procedures for using `calicoctl datastore migrate export` effectively.

## Prerequisites

- A Calico cluster with the source datastore configured
- A `calicoctl` version that matches the Calico version running on your cluster
- Access to both source and target datastores
- A maintenance window (migration requires cluster coordination)
- Backup of all Calico resources

## Basic Usage

```bash
# Export supported Calico resources from the etcdv3 datastore

calicoctl datastore migrate export > calico-export.yaml
```

This exports supported Calico resources (nodes, IP pools, policies, BGP configurations, etc.) from the etcdv3 datastore into a YAML file that can be imported into the Kubernetes datastore. Workload endpoints and profiles are not exported because they should be generated.

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

## Export Resource Verification

```bash
# Verify specific resource types in the export
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

- **Permission errors**: Ensure calicoctl has the required access to the datastore used by the current migration step.
- **Connection timeouts**: Verify network connectivity to both etcd and Kubernetes API server.
- **Version mismatch**: Install a `calicoctl` version that matches the Calico version running on your cluster. The global `--allow-version-mismatch` flag only bypasses client/cluster version checks; it does not resolve resource conflicts.
- **Incomplete migration**: Always verify resource counts match between source and target.

## Conclusion

`calicoctl datastore migrate export` is a critical part of the Calico datastore migration workflow. By following proper procedures, validating at each step, and maintaining backups, you can safely migrate your Calico configuration from etcdv3 to the Kubernetes datastore with minimal risk.
