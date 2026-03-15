# How to Use calicoctl datastore migrate import with Practical Examples

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Calico, Calicoctl, Datastore, Migration, Kubernetes, etcd, Import, DevOps

Description: Learn how to use calicoctl datastore migrate import to import Calico configuration data into a new datastore during migration.

---

## Introduction

The `calicoctl datastore migrate import` command is used to load Calico configuration and state data into a target datastore. This is typically the second step in a datastore migration, following the export of data from the source datastore using `calicoctl datastore migrate export`.

The import command reads the exported YAML file and creates all the Calico resources in the target datastore. This enables migration between etcd and the Kubernetes API datastore or restoration from a backup. Proper execution of this command is critical to avoid data loss or configuration conflicts.

This guide covers how to use `calicoctl datastore migrate import` safely and effectively.

## Prerequisites

- Exported Calico data file from `calicoctl datastore migrate export`
- `calicoctl` configured to connect to the target datastore
- Target datastore is empty or has no conflicting Calico resources
- Source datastore is locked during migration to prevent changes

## Basic Import

Import Calico data into the target datastore:

```bash
calicoctl datastore migrate import -f calico-export.yaml
```

Successful output:

```text
Importing Calico data...
  Importing IPPool "default-ipv4-ippool"...
  Importing BGPConfiguration "default"...
  Importing FelixConfiguration "default"...
  Importing GlobalNetworkPolicy "allow-dns"...
  ...
Successfully imported 72 resources.
```

## Importing into a Kubernetes API Datastore

When migrating from etcd to the Kubernetes API datastore, configure `calicoctl` to point to the target:

```bash
export DATASTORE_TYPE=kubernetes
export KUBECONFIG=/path/to/kubeconfig

calicoctl datastore migrate import -f calico-export.yaml
```

## Importing into etcd

When migrating to an etcd datastore:

```bash
export DATASTORE_TYPE=etcdv3
export ETCD_ENDPOINTS=https://10.0.2.10:2379
export ETCD_CA_CERT_FILE=/etc/calico/certs/ca.pem
export ETCD_CERT_FILE=/etc/calico/certs/cert.pem
export ETCD_KEY_FILE=/etc/calico/certs/key.pem

calicoctl datastore migrate import -f calico-export.yaml
```

## Pre-Import Validation

Before importing, validate the export file and target datastore:

```bash
#!/bin/bash
EXPORT_FILE=$1

if [ -z "$EXPORT_FILE" ]; then
  echo "Usage: $0 <export-file>"
  exit 1
fi

echo "=== Pre-Import Validation ==="

# Check file exists and is not empty
if [ ! -s "$EXPORT_FILE" ]; then
  echo "FAIL: Export file is empty or does not exist"
  exit 1
fi
echo "File size: $(ls -lh "$EXPORT_FILE" | awk '{print $5}')"

# Count resources in the export
echo ""
echo "Resources to import:"
grep "^kind:" "$EXPORT_FILE" | sort | uniq -c

# Check target datastore connectivity
echo ""
echo "Testing target datastore connection..."
calicoctl get nodes --no-headers 2>/dev/null
if [ $? -eq 0 ]; then
  echo "Target datastore is accessible"
else
  echo "WARNING: Cannot reach target datastore"
fi

# Check for existing resources in target
echo ""
echo "Existing resources in target datastore:"
calicoctl get ippools --no-headers 2>/dev/null | wc -l
calicoctl get gnp --no-headers 2>/dev/null | wc -l
```

## Full Migration Workflow

The complete migration sequence:

```bash
#!/bin/bash
set -e

EXPORT_FILE="calico-migration-$(date +%Y%m%d).yaml"

echo "=== Step 1: Lock source datastore ==="
calicoctl datastore migrate lock
echo "Source datastore locked."

echo ""
echo "=== Step 2: Export from source ==="
calicoctl datastore migrate export > "$EXPORT_FILE"
EXPORTED=$(grep "^kind:" "$EXPORT_FILE" | wc -l)
echo "Exported $EXPORTED resources."

echo ""
echo "=== Step 3: Configure target datastore ==="
# Switch calicoctl to point to the target datastore
export DATASTORE_TYPE=kubernetes
export KUBECONFIG=/path/to/target-kubeconfig

echo ""
echo "=== Step 4: Import into target ==="
calicoctl datastore migrate import -f "$EXPORT_FILE"

echo ""
echo "=== Step 5: Verify import ==="
IMPORTED_POOLS=$(calicoctl get ippools --no-headers | wc -l)
IMPORTED_GNP=$(calicoctl get gnp --no-headers | wc -l)
echo "IP Pools in target: $IMPORTED_POOLS"
echo "Global Network Policies in target: $IMPORTED_GNP"

echo ""
echo "Migration complete. Review the imported resources before unlocking."
```

## Verifying the Import

After import, verify that all resources were created correctly:

```bash
# Compare resource counts
echo "=== Resource Count Comparison ==="
echo "Exported:"
grep "^kind:" calico-export.yaml | sort | uniq -c

echo ""
echo "In target datastore:"
echo "  IPPools: $(calicoctl get ippools --no-headers | wc -l)"
echo "  GlobalNetworkPolicies: $(calicoctl get gnp --no-headers | wc -l)"
echo "  NetworkPolicies: $(calicoctl get np -A --no-headers | wc -l)"
echo "  BGPPeers: $(calicoctl get bgppeers --no-headers | wc -l)"
echo "  FelixConfigurations: $(calicoctl get felixconfigurations --no-headers | wc -l)"
```

## Restoring from Backup

The import command also works for restoring from a backup:

```bash
# Decompress if backup was compressed
gunzip calico-backup-20260315-120000.yaml.gz

# Import the backup
calicoctl datastore migrate import -f calico-backup-20260315-120000.yaml
```

Note that restoring over existing resources may cause conflicts. Ensure the target datastore does not contain conflicting resources before importing.

## Verification

Run a comprehensive post-import check:

```bash
# Verify node connectivity
calicoctl node status

# Check IPAM state
calicoctl ipam show

# Verify policy enforcement
calicoctl get gnp -o wide
```

## Troubleshooting

- **Resource already exists**: The target datastore has existing Calico resources that conflict with the import. Clean the target datastore first or remove conflicting resources.
- **Permission denied on target**: Ensure `calicoctl` has write access to the target datastore. For Kubernetes, check RBAC permissions.
- **YAML parse error**: The export file may be corrupted or truncated. Re-export from the source datastore.
- **Partial import failure**: If the import fails partway through, some resources may have been created. Check which resources exist and either clean up or retry the failed resources individually.
- **Version mismatch**: Ensure the `calicoctl` version matches the Calico version on the target cluster.

## Conclusion

The `calicoctl datastore migrate import` command completes the data migration process by loading exported Calico configuration into a target datastore. Always validate the export file before importing, verify resource counts after import, and keep the source datastore locked until you confirm the migration was successful. This careful approach prevents data loss during the migration process.
