# How to Use calicoctl datastore migrate import with Practical Examples

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Calico, Calicoctl, Datastore, Migration, Kubernetes, etcd, Import, DevOps

Description: Learn how to use calicoctl datastore migrate import to import Calico configuration data into a new datastore during migration.

---

## Introduction

The `calicoctl datastore migrate import` command is used to load exported Calico data into the Kubernetes API datastore during an etcdv3-to-Kubernetes datastore migration. This is typically run after locking the etcdv3 datastore and exporting data from it using `calicoctl datastore migrate export`.

The import command reads the exported YAML file and creates the Calico resources in the Kubernetes datastore. Proper execution of this command is critical to avoid data loss or configuration conflicts.

This guide covers how to use `calicoctl datastore migrate import` safely and effectively.

## Prerequisites

- Exported Calico data file from `calicoctl datastore migrate export`
- `calicoctl` configured to connect to the Kubernetes API datastore
- Kubernetes datastore has no conflicting Calico resources
- etcdv3 datastore is locked during migration to prevent changes

## Basic Import

Import Calico data into the Kubernetes datastore:

```bash
calicoctl datastore migrate import -f calico-export.yaml
```

The command exits successfully when the file has been imported.

## Importing into a Kubernetes API Datastore

When migrating from etcd to the Kubernetes API datastore, configure `calicoctl` to point to the Kubernetes datastore before running the import:

```bash
export DATASTORE_TYPE=kubernetes
export KUBECONFIG=/path/to/kubeconfig

calicoctl datastore migrate import -f calico-export.yaml
```

## Importing from an etcd Export

The migrate import command is for storing and converting exported etcdv3 data into the Kubernetes datastore. Configure etcd access for the export step, then switch `calicoctl` to the Kubernetes datastore before import:

```bash
export DATASTORE_TYPE=etcdv3
export ETCD_ENDPOINTS=https://10.0.2.10:2379
export ETCD_CA_CERT_FILE=/etc/calico/certs/ca.pem
export ETCD_CERT_FILE=/etc/calico/certs/cert.pem
export ETCD_KEY_FILE=/etc/calico/certs/key.pem

calicoctl datastore migrate export > calico-export.yaml

export DATASTORE_TYPE=kubernetes
export KUBECONFIG=/path/to/kubeconfig

calicoctl datastore migrate import -f calico-export.yaml
```

## Pre-Import Validation

Before importing, validate the export file and Kubernetes datastore:

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

# Check Kubernetes datastore connectivity
echo ""
echo "Testing Kubernetes datastore connection..."
calicoctl get nodes >/dev/null 2>&1
if [ $? -eq 0 ]; then
  echo "Kubernetes datastore is accessible"
else
  echo "WARNING: Cannot reach Kubernetes datastore"
fi

# Check for existing resources in target
echo ""
echo "Existing resources in Kubernetes datastore:"
calicoctl get ippool -o yaml 2>/dev/null | awk '/^- apiVersion:/ {count++} END {print count+0}'
calicoctl get globalnetworkpolicy -o yaml 2>/dev/null | awk '/^- apiVersion:/ {count++} END {print count+0}'
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
echo "=== Step 3: Configure Kubernetes datastore ==="
# Switch calicoctl to point to the Kubernetes datastore
export DATASTORE_TYPE=kubernetes
export KUBECONFIG=/path/to/target-kubeconfig

echo ""
echo "=== Step 4: Import into Kubernetes datastore ==="
calicoctl datastore migrate import -f "$EXPORT_FILE"

echo ""
echo "=== Step 5: Verify import ==="
IMPORTED_POOLS=$(calicoctl get ippool -o yaml | awk '/^- apiVersion:/ {count++} END {print count+0}')
IMPORTED_GNP=$(calicoctl get globalnetworkpolicy -o yaml | awk '/^- apiVersion:/ {count++} END {print count+0}')
echo "IP Pools in target: $IMPORTED_POOLS"
echo "Global Network Policies in target: $IMPORTED_GNP"

echo ""
echo "=== Step 6: Configure Calico to use the Kubernetes datastore ==="
kubectl apply -f calico.yaml
kubectl rollout status daemonset calico-node -n kube-system

echo ""
echo "=== Step 7: Unlock datastore after migration ==="
calicoctl datastore migrate unlock

echo ""
echo "Migration complete."
```

## Verifying the Import

After import, verify that all resources were created correctly:

```bash
# Compare resource counts
echo "=== Resource Count Comparison ==="
echo "Exported:"
grep "^kind:" calico-export.yaml | sort | uniq -c

echo ""
echo "In Kubernetes datastore:"
echo "  IPPools: $(calicoctl get ippool -o yaml | awk '/^- apiVersion:/ {count++} END {print count+0}')"
echo "  GlobalNetworkPolicies: $(calicoctl get globalnetworkpolicy -o yaml | awk '/^- apiVersion:/ {count++} END {print count+0}')"
echo "  NetworkPolicies: $(calicoctl get networkpolicy --all-namespaces -o yaml | awk '/^- apiVersion:/ {count++} END {print count+0}')"
echo "  BGPPeers: $(calicoctl get bgppeer -o yaml | awk '/^- apiVersion:/ {count++} END {print count+0}')"
echo "  FelixConfigurations: $(calicoctl get felixconfiguration -o yaml | awk '/^- apiVersion:/ {count++} END {print count+0}')"
```

## Importing from a Saved Export

The import command can read a saved export file. Use it as part of the documented etcdv3-to-Kubernetes datastore migration flow:

```bash
# Decompress if backup was compressed
gunzip calico-backup-20260315-120000.yaml.gz

# Import the saved export into the Kubernetes datastore
calicoctl datastore migrate import -f calico-backup-20260315-120000.yaml
```

Note that importing over existing resources may cause conflicts. Ensure the Kubernetes datastore does not contain conflicting Calico resources before importing.

## Verification

Run a comprehensive post-import check:

```bash
# Verify node connectivity
calicoctl node status

# Check IPAM state
calicoctl ipam show

# Verify policy enforcement
calicoctl get globalnetworkpolicy -o wide
```

## Troubleshooting

- **Resource already exists**: The Kubernetes datastore has existing Calico resources that conflict with the import. Clean the Kubernetes datastore first or remove conflicting resources.
- **Permission denied on target**: Ensure `calicoctl` has write access to the Kubernetes datastore. Check RBAC permissions.
- **YAML parse error**: The export file may be corrupted or truncated. Re-export from the source datastore.
- **Partial import failure**: If the import fails partway through, some resources may have been created. Check which resources exist and either clean up or retry the failed resources individually.
- **Version mismatch**: Ensure the `calicoctl` version matches the Calico version on the target cluster.

## Conclusion

The `calicoctl datastore migrate import` command completes the data import step by loading exported Calico configuration into the Kubernetes datastore. Always validate the export file before importing, verify resource counts after import, and keep the etcdv3 datastore locked until Calico has been configured to use the Kubernetes datastore and the migration has been confirmed. This careful approach prevents data loss during the migration process.
