# How to Use calicoctl datastore migrate export with Practical Examples

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Calico, Calicoctl, Datastore, Migration, Kubernetes, etcd, Backup, DevOps

Description: Learn how to use calicoctl datastore migrate export to export Calico configuration data for datastore migration or backup.

---

## Introduction

Calico stores its configuration and state data in a datastore, which can be either etcd or the Kubernetes API datastore. The `calicoctl datastore migrate export` command exports Calico data from an etcdv3 datastore into a portable format that can be imported into the Kubernetes API datastore.

This command is essential when migrating from an etcd-backed Calico installation to the Kubernetes API datastore. It is also useful for creating backups of Calico configuration stored in etcd that go beyond what standard Kubernetes resource backups capture.

This guide demonstrates how to use `calicoctl datastore migrate export` for etcd-to-Kubernetes migration and etcd backup scenarios.

## Prerequisites

- `calicoctl` configured to connect to the source etcdv3 datastore
- Access credentials for the source etcd datastore
- Sufficient disk space for the exported data
- Calico cluster in a stable state before export

## Basic Export

Export all Calico data from the etcdv3 datastore:

```bash
calicoctl datastore migrate export > calico-export.yaml
```

This writes all Calico resources to stdout in YAML format. The export includes:

- IP pools
- BGP peers
- BGP configurations
- Network policies
- Global network policies
- Global network sets
- Host endpoints
- Kube controllers configurations
- Felix configurations
- Node resources
- Network sets
- IP reservations
- BGP filters

## Exporting from etcd

When exporting from an etcd datastore, configure the connection parameters:

```bash
export DATASTORE_TYPE=etcdv3
export ETCD_ENDPOINTS=https://10.0.1.10:2379
export ETCD_CA_CERT_FILE=/etc/calico/certs/ca.pem
export ETCD_CERT_FILE=/etc/calico/certs/cert.pem
export ETCD_KEY_FILE=/etc/calico/certs/key.pem

calicoctl datastore migrate export > calico-export.yaml
```

## Using a Configuration File

You can also point the command at a calicoctl configuration file:

```bash
calicoctl datastore migrate export --config=/path/to/calicoctl.cfg > calico-export.yaml
```

## Verifying the Export

After export, verify the file contains the expected resources:

```bash
# Check file size

ls -lh calico-export.yaml

# Count resource types
grep "^kind:" calico-export.yaml | sort | uniq -c

# View the structure
head -50 calico-export.yaml
```

Expected output from the grep command:

```text
     3 kind: BGPConfiguration
     2 kind: BGPPeer
     5 kind: FelixConfiguration
    12 kind: GlobalNetworkPolicy
     2 kind: IPPool
    45 kind: NetworkPolicy
     4 kind: Node
```

## Creating Timestamped Backups

Use exports as regular backups:

```bash
#!/bin/bash
BACKUP_DIR="/var/backups/calico"
mkdir -p "$BACKUP_DIR"

TIMESTAMP=$(date +%Y%m%d-%H%M%S)
BACKUP_FILE="$BACKUP_DIR/calico-backup-$TIMESTAMP.yaml"

echo "Exporting Calico data to $BACKUP_FILE..."
calicoctl datastore migrate export > "$BACKUP_FILE"

if [ $? -eq 0 ]; then
  RESOURCE_COUNT=$(grep "^kind:" "$BACKUP_FILE" | wc -l)
  echo "Export successful: $RESOURCE_COUNT resources exported"

  # Compress the backup
  gzip "$BACKUP_FILE"
  echo "Compressed to ${BACKUP_FILE}.gz"
else
  echo "Export failed!"
  exit 1
fi

# Clean up backups older than 30 days
find "$BACKUP_DIR" -name "calico-backup-*.yaml.gz" -mtime +30 -delete
```

## Pre-Migration Checklist

Before using the export for a migration, validate the cluster state:

```bash
#!/bin/bash
echo "=== Pre-Migration Checklist ==="

echo "1. Checking Calico node status..."
calicoctl node status

echo ""
echo "2. Checking IPAM usage..."
calicoctl ipam show --show-blocks

echo ""
echo "3. Listing all IP pools..."
calicoctl get ippools -o wide

echo ""
echo "4. Counting all Calico resources..."
calicoctl datastore migrate export | grep "^kind:" | sort | uniq -c

echo ""
echo "5. Checking for active BGP peers..."
calicoctl get bgppeers -o wide
```

## Exporting as Part of a Migration Workflow

The full migration workflow uses lock, export, import, and unlock together:

```bash
# Step 1: Lock the etcd datastore so changes do not affect the cluster during migration
calicoctl datastore migrate lock

# Step 2: Export all data
calicoctl datastore migrate export > calico-migration-data.yaml

# Step 3: Verify the export
grep "^kind:" calico-migration-data.yaml | sort | uniq -c

# Step 4: Import into the new datastore (covered in the import guide)
# Step 5: Unlock the datastore after migration is complete
calicoctl datastore migrate unlock
```

## Verification

Verify the export is complete and valid:

```bash
# Ensure the file is valid YAML
python3 -c "import yaml; list(yaml.safe_load_all(open('calico-export.yaml')))" && echo "Valid YAML"

# Validate Calico resource structure
calicoctl validate -f calico-export.yaml

# Compare resource counts with live cluster
echo "Exported resources:"
grep "^kind:" calico-export.yaml | sort | uniq -c

echo ""
echo "Live resources:"
calicoctl get ippools -o go-template='{{range .}}{{len .Items}}{{"\n"}}{{end}}'
calicoctl get globalnetworkpolicy -o go-template='{{range .}}{{len .Items}}{{"\n"}}{{end}}'
calicoctl get networkpolicy -A -o go-template='{{range .}}{{len .Items}}{{"\n"}}{{end}}'
```

## Troubleshooting

- **Empty export file**: Verify datastore connection settings. Check that `DATASTORE_TYPE` and connection environment variables are correct.
- **Permission denied**: Ensure the credentials have read access to all Calico resources in the datastore.
- **Partial export**: If the export is interrupted, it may be incomplete. Always verify resource counts after export.
- **etcd timeout**: For large datastores, the export may take time. Check etcd connectivity, certificate configuration, and whether the etcd endpoint is healthy before retrying.

## Conclusion

The `calicoctl datastore migrate export` command is the first step in migrating Calico data from an etcdv3 datastore to the Kubernetes API datastore or creating backups of etcd-backed Calico configuration. Always verify exports by checking resource counts and YAML validity before proceeding with migration. Combining regular exports with a retention policy gives you reliable recovery points for your Calico configuration.
