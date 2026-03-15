# How to Operationalize Calicoctl etcd Configuration

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Calico, calicoctl, etcd, Operations, Backup, Disaster Recovery

Description: Operationalize calicoctl etcd configuration with backup strategies, disaster recovery plans, and production runbooks.

---

## Introduction

Running calicoctl against an etcd datastore in production requires operational processes beyond initial setup. Without backups, change tracking, and recovery procedures, a single etcd failure or misconfiguration can leave your cluster without network policy enforcement.

Operationalizing this configuration means establishing routines for data backup, certificate lifecycle management, capacity planning, and incident response. These processes reduce mean time to recovery and prevent data loss.

This guide covers production-grade operational patterns for managing calicoctl etcd datastore configurations.

## Prerequisites

- Calico cluster using etcd as the datastore
- `calicoctl` binary installed (v3.25+)
- `etcdctl` for backup and maintenance operations
- Dedicated backup storage (local disk, S3, or similar)
- Access to etcd TLS certificates

## Backing Up Calico Data from etcd

Create a full etcd snapshot that includes all Calico data:

```bash
#!/bin/bash
# calico-etcd-backup.sh

BACKUP_DIR="/var/backups/calico"
TIMESTAMP=$(date +%Y%m%d-%H%M%S)
BACKUP_FILE="${BACKUP_DIR}/etcd-snapshot-${TIMESTAMP}.db"

mkdir -p "$BACKUP_DIR"

etcdctl --endpoints="$ETCD_ENDPOINTS" \
  --cacert="$ETCD_CA_CERT_FILE" \
  --cert="$ETCD_CERT_FILE" \
  --key="$ETCD_KEY_FILE" \
  snapshot save "$BACKUP_FILE"

etcdctl snapshot status "$BACKUP_FILE" --write-out=table

# Keep only last 7 days of backups
find "$BACKUP_DIR" -name "etcd-snapshot-*.db" -mtime +7 -delete

echo "Backup saved: ${BACKUP_FILE}"
```

Schedule daily backups via cron:

```bash
echo "0 3 * * * /usr/local/bin/calico-etcd-backup.sh >> /var/log/calico-backup.log 2>&1" | crontab -
```

## Exporting Calico Resources as YAML

Back up Calico resources in human-readable format for review and selective restore:

```bash
#!/bin/bash
# export-calico-resources.sh

EXPORT_DIR="/var/backups/calico/yaml-$(date +%Y%m%d)"
mkdir -p "$EXPORT_DIR"

RESOURCES=(
  "ippools"
  "globalnetworkpolicies"
  "networkpolicies --all-namespaces"
  "hostendpoints"
  "bgppeers"
  "bgpconfigurations"
  "felixconfigurations"
  "globalnetworksets"
  "networksets --all-namespaces"
)

for RES in "${RESOURCES[@]}"; do
  NAME=$(echo "$RES" | awk '{print $1}')
  echo "Exporting ${NAME}..."
  calicoctl get $RES -o yaml > "${EXPORT_DIR}/${NAME}.yaml" 2>/dev/null
done

echo "Export complete: ${EXPORT_DIR}"
ls -la "$EXPORT_DIR"
```

## Restoring from etcd Snapshot

Restore an etcd snapshot in a disaster recovery scenario:

```bash
# Stop etcd on all members first

# Restore on each member with its specific configuration
etcdctl snapshot restore /var/backups/calico/etcd-snapshot-latest.db \
  --name etcd1 \
  --data-dir /var/lib/etcd-restore \
  --initial-cluster "etcd1=https://etcd1:2380,etcd2=https://etcd2:2380,etcd3=https://etcd3:2380" \
  --initial-advertise-peer-urls "https://etcd1:2380"

# Replace data directory and restart etcd
# sudo mv /var/lib/etcd /var/lib/etcd.bak
# sudo mv /var/lib/etcd-restore /var/lib/etcd
# sudo systemctl restart etcd
```

## Restoring Individual Calico Resources

Restore specific resources from YAML backups:

```bash
# Restore all global network policies
calicoctl apply -f /var/backups/calico/yaml-20260315/globalnetworkpolicies.yaml

# Restore a specific IP pool
calicoctl apply -f /var/backups/calico/yaml-20260315/ippools.yaml
```

## Certificate Lifecycle Management

Track and rotate certificates on a schedule:

```bash
#!/bin/bash
# cert-lifecycle.sh

CERT_DIR="/etc/calico/certs"
ROTATION_THRESHOLD=30  # days before expiry

for CERT in "${CERT_DIR}"/*.pem; do
  if openssl x509 -in "$CERT" -noout 2>/dev/null; then
    EXPIRY=$(openssl x509 -in "$CERT" -noout -enddate | cut -d= -f2)
    EXPIRY_EPOCH=$(date -d "$EXPIRY" +%s 2>/dev/null || date -j -f "%b %d %T %Y %Z" "$EXPIRY" +%s)
    NOW_EPOCH=$(date +%s)
    DAYS_LEFT=$(( (EXPIRY_EPOCH - NOW_EPOCH) / 86400 ))

    if [ "$DAYS_LEFT" -lt "$ROTATION_THRESHOLD" ]; then
      echo "ACTION REQUIRED: ${CERT} expires in ${DAYS_LEFT} days"
    else
      echo "OK: ${CERT} - ${DAYS_LEFT} days remaining"
    fi
  fi
done
```

## etcd Compaction and Defragmentation

Maintain etcd performance with regular compaction:

```bash
#!/bin/bash
# etcd-maintenance.sh

# Get current revision
REV=$(etcdctl --endpoints="$ETCD_ENDPOINTS" \
  --cacert="$ETCD_CA_CERT_FILE" \
  --cert="$ETCD_CERT_FILE" \
  --key="$ETCD_KEY_FILE" \
  endpoint status --write-out=json | jq '.[0].Status.header.revision')

# Compact old revisions
etcdctl --endpoints="$ETCD_ENDPOINTS" \
  --cacert="$ETCD_CA_CERT_FILE" \
  --cert="$ETCD_CERT_FILE" \
  --key="$ETCD_KEY_FILE" \
  compact "$REV"

# Defragment each member
etcdctl --endpoints="$ETCD_ENDPOINTS" \
  --cacert="$ETCD_CA_CERT_FILE" \
  --cert="$ETCD_CERT_FILE" \
  --key="$ETCD_KEY_FILE" \
  defrag

echo "Compaction and defragmentation complete at revision ${REV}"
```

## Verification

Confirm operational procedures work:

```bash
# Verify backup integrity
etcdctl snapshot status /var/backups/calico/etcd-snapshot-latest.db --write-out=table

# Verify YAML exports are complete
ls -la /var/backups/calico/yaml-$(date +%Y%m%d)/

# Test calicoctl connectivity
calicoctl get nodes -o wide
```

## Troubleshooting

- **Snapshot restore fails with "member already bootstrapped"**: The data directory must be empty or nonexistent before restore. Remove or rename the existing data directory.
- **YAML restore conflicts with existing resources**: Use `calicoctl apply` (not `create`) to update existing resources or `calicoctl replace` for strict replacement.
- **etcd compaction errors**: Compaction requires a valid revision number. Ensure the revision is obtained from the current cluster state.
- **Backup cron not generating files**: Check that the backup script has execute permissions and the backup directory is writable.

## Conclusion

Operationalizing calicoctl etcd configuration ensures your Calico deployment can survive etcd failures, certificate expirations, and accidental configuration deletions. Regular backups, YAML exports, certificate tracking, and etcd maintenance form the operational foundation for production Calico clusters backed by etcd.
