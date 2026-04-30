# How to Back Up Harvester Configuration

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Harvester, Kubernetes, Virtualization, HCI, Backup, Configuration, DR

Description: Learn how to back up Harvester cluster configuration, including Kubernetes resources, etcd data, and custom settings for disaster recovery.

## Introduction

Backing up Harvester configuration goes beyond just backing up VM data. A comprehensive configuration backup includes the Kubernetes resource definitions (VMs, networks, settings), etcd snapshots (the cluster's source of truth), and custom configurations (users, certificates, network settings). This allows you to document cluster state, selectively recreate resources, and restore the cluster from scratch after a catastrophic failure, even on different hardware.

## What to Back Up

| Component | Location | Method |
|---|---|---|
| etcd data | In-cluster | RKE2 etcd snapshots |
| Kubernetes resources | Cluster API | kubectl get -o yaml |
| Harvester settings | Cluster API | kubectl get -o yaml |
| Network configs | Cluster API | kubectl get -o yaml |
| VM image metadata | Cluster API | kubectl get -o yaml |
| TLS certificate settings | Cluster API | kubectl get -o yaml |
| SSH keys | Cluster API | kubectl get -o yaml |

## Step 1: Configure Automatic etcd Snapshots

RKE2 (the Kubernetes distribution in Harvester) supports automated etcd snapshots. Scheduled snapshots are enabled by default, and you can adjust the schedule or enable S3 replication if needed:

```yaml
# rke2-server-config.yaml

# Configure RKE2 etcd snapshots on each server node
# /etc/rancher/rke2/config.yaml

# etcd snapshot configuration
etcd-snapshot-schedule-cron: "0 */6 * * *"    # Every 6 hours
etcd-snapshot-retention: 10                    # Keep 10 snapshots
etcd-snapshot-dir: /var/lib/rancher/rke2/server/db/snapshots

# Optional: Store snapshots in S3
etcd-s3: true
etcd-s3-endpoint: "s3.amazonaws.com"
etcd-s3-access-key: "AKIAIOSFODNN7EXAMPLE"
etcd-s3-secret-key: "wJalrXUtnFEMI/K7MDENG"
etcd-s3-bucket: "my-harvester-etcd-backups"
etcd-s3-region: "us-east-1"
etcd-s3-folder: "harvester-etcd"
```

```bash
# Apply the configuration (requires RKE2 restart)
sudo systemctl restart rke2-server

# Manually trigger an etcd snapshot
sudo rke2 etcd-snapshot save \
    --name manual-backup

# List existing snapshots
sudo rke2 etcd-snapshot ls

# Expected output:
# Snapshot names include the base name, the node name, and a UNIX timestamp
# For example:
# etcd-snapshot-server-0-1704345600
# manual-backup-server-0-1704349200
```

## Step 2: Export Kubernetes Resources

Export all Harvester-specific Kubernetes resources for documentation and selective recovery. `kubectl get -o yaml` captures live objects with server-managed fields, so sanitize the manifests before re-applying them to a rebuilt cluster:

```bash
#!/bin/bash
# backup-k8s-resources.sh
# Export all Harvester Kubernetes resources

BACKUP_DATE=$(date +%Y%m%d)
BACKUP_DIR="/backup/harvester-config-${BACKUP_DATE}"
mkdir -p "${BACKUP_DIR}"

export KUBECONFIG=/etc/rancher/rke2/rke2.yaml

echo "Exporting Kubernetes resources to ${BACKUP_DIR}..."

# ===== HARVESTER SETTINGS =====
echo "Exporting Harvester settings..."
kubectl get settings.harvesterhci.io -o yaml \
    > "${BACKUP_DIR}/harvester-settings.yaml"

# ===== VM IMAGES =====
echo "Exporting VM image definitions..."
kubectl get virtualmachineimages -A -o yaml \
    > "${BACKUP_DIR}/vm-images.yaml"

# ===== VM TEMPLATES =====
echo "Exporting VM templates..."
kubectl get virtualmachinetemplates -A -o yaml \
    > "${BACKUP_DIR}/vm-templates.yaml"

kubectl get virtualmachinetemplateversions -A -o yaml \
    > "${BACKUP_DIR}/vm-template-versions.yaml"

# ===== VIRTUAL MACHINES =====
echo "Exporting VM definitions..."
kubectl get virtualmachines -A -o yaml \
    > "${BACKUP_DIR}/virtual-machines.yaml"

# ===== NETWORKS =====
echo "Exporting network configurations..."
kubectl get clusternetworks -o yaml \
    > "${BACKUP_DIR}/cluster-networks.yaml"

kubectl get network-attachment-definitions -A -o yaml \
    > "${BACKUP_DIR}/vm-networks.yaml"

kubectl get nodenetworks -o yaml \
    > "${BACKUP_DIR}/node-networks.yaml"

# ===== SSH KEYPAIRS =====
echo "Exporting SSH keypairs..."
kubectl get keypairs -A -o yaml \
    > "${BACKUP_DIR}/ssh-keypairs.yaml"

# ===== NAMESPACES =====
echo "Exporting namespace configurations..."
kubectl get namespaces -o yaml \
    > "${BACKUP_DIR}/namespaces.yaml"

# ===== RBAC =====
echo "Exporting RBAC configuration..."
kubectl get clusterroles -o yaml > "${BACKUP_DIR}/rbac-clusterroles.yaml"
kubectl get clusterrolebindings -o yaml > "${BACKUP_DIR}/rbac-clusterrolebindings.yaml"
kubectl get roles -A -o yaml > "${BACKUP_DIR}/rbac-roles.yaml"
kubectl get rolebindings -A -o yaml > "${BACKUP_DIR}/rbac-rolebindings.yaml"

# ===== STORAGE CLASSES =====
echo "Exporting storage classes..."
kubectl get storageclasses -o yaml > "${BACKUP_DIR}/storage-classes.yaml"

# ===== CERTIFICATES =====
echo "Backing up TLS certificates..."
mkdir -p "${BACKUP_DIR}/certs"

# Harvester UI/API certificate setting
kubectl get settings.harvesterhci.io ssl-certificates -o yaml \
    > "${BACKUP_DIR}/certs/ssl-certificates.yaml" 2>/dev/null || true

# ===== BACKUP CONFIGS =====
echo "Exporting backup target configuration..."
kubectl get settings.harvesterhci.io backup-target -o yaml \
    > "${BACKUP_DIR}/backup-target.yaml"

# ===== VM BACKUPS (just metadata) =====
echo "Exporting VM backup metadata..."
kubectl get virtualmachinebackups -A -o yaml \
    > "${BACKUP_DIR}/vm-backup-metadata.yaml"

# Create an archive
tar czf "/backup/harvester-config-${BACKUP_DATE}.tar.gz" \
    -C /backup "harvester-config-${BACKUP_DATE}/"

echo "Backup complete: /backup/harvester-config-${BACKUP_DATE}.tar.gz"

# List backup size
ls -lh "/backup/harvester-config-${BACKUP_DATE}.tar.gz"
```

```bash
chmod +x backup-k8s-resources.sh

# Run the backup
./backup-k8s-resources.sh

# Schedule daily backups
sudo install -D -m 0755 backup-k8s-resources.sh /opt/scripts/backup-k8s-resources.sh
(crontab -l 2>/dev/null; echo "0 2 * * * /opt/scripts/backup-k8s-resources.sh >> /var/log/harvester-backup.log 2>&1") | \
    crontab -
```

## Step 3: Back Up Node Configuration Files

```bash
#!/bin/bash
# backup-node-config.sh
# Back up OS-level configuration files on each node

BACKUP_DATE=$(date +%Y%m%d)
BACKUP_DIR="/backup/node-config-${BACKUP_DATE}"
mkdir -p "${BACKUP_DIR}"

for NODE in 192.168.1.11 192.168.1.12 192.168.1.13; do
    NODE_NAME=$(ssh rancher@${NODE} hostname)
    ssh rancher@${NODE} "sudo tar czf - --ignore-failed-read \
        /etc/rancher/rke2/config.yaml \
        /etc/rancher/rke2/registries.yaml \
        /etc/sysconfig/network \
        /etc/modprobe.d \
        /etc/sysctl.d \
        /etc/systemd/system/sriov-vfs.service \
        /etc/chrony.conf \
        /etc/hosts \
        /var/lib/rancher/rke2/server/token" \
        > "${BACKUP_DIR}/${NODE_NAME}.tar.gz" || true

    echo "Backed up: ${NODE_NAME}"
done

tar czf "/backup/node-config-${BACKUP_DATE}.tar.gz" \
    -C /backup "node-config-${BACKUP_DATE}/"
```

## Step 4: Upload Backups to External Storage

```bash
#!/bin/bash
# upload-backups.sh - Upload configuration backups to S3

BACKUP_DATE=$(date +%Y%m%d)
S3_BUCKET="s3://my-harvester-config-backups"
AWS_REGION="us-east-1"

# Upload Kubernetes resource backup
aws s3 cp /backup/harvester-config-${BACKUP_DATE}.tar.gz \
    ${S3_BUCKET}/config/${BACKUP_DATE}/harvester-config.tar.gz

# Upload node configuration backup
aws s3 cp /backup/node-config-${BACKUP_DATE}.tar.gz \
    ${S3_BUCKET}/node-config/${BACKUP_DATE}/node-config.tar.gz

# Upload etcd snapshots (they're already in S3 if configured above)
# Or sync the local snapshot directory from each server node
# if you are not using RKE2's built-in S3 uploads:
aws s3 sync \
    /var/lib/rancher/rke2/server/db/snapshots/ \
    ${S3_BUCKET}/etcd-snapshots/ \
    --region ${AWS_REGION}

# List recent backups
aws s3 ls ${S3_BUCKET}/config/ --recursive | tail -20

echo "Backup upload complete"
```

## Step 5: Restore Configuration from Backup

To restore from an etcd snapshot after catastrophic failure or onto replacement hardware, you must also have the original RKE2 server token:

```bash
# On a fresh Harvester installation (single server node to start)
# Restore the etcd snapshot

# 1. Stop RKE2
sudo systemctl stop rke2-server

# 2. Copy the etcd snapshot to the node
scp backup-server:/backup/manual-backup-server-0-1704349200 \
    /var/lib/rancher/rke2/server/db/snapshots/

# 3. Restore from the snapshot
sudo rke2 server --cluster-reset \
    --cluster-reset-restore-path=/var/lib/rancher/rke2/server/db/snapshots/manual-backup-server-0-1704349200 \
    --token="<BACKED-UP-TOKEN-VALUE>"

# If etcd S3 is configured in /etc/rancher/rke2/config.yaml and you are
# restoring a local snapshot file, add: --etcd-s3=false

# 4. Start RKE2
sudo systemctl start rke2-server

# 5. Verify the restore
export KUBECONFIG=/etc/rancher/rke2/rke2.yaml
kubectl get nodes
kubectl get virtualmachines -A

# On additional server nodes from the old cluster, remove the old etcd data
# before starting rke2-server so they can rejoin the restored cluster
sudo rm -rf /var/lib/rancher/rke2/server/db/
```

## Step 6: Verify Backup Integrity

```bash
#!/bin/bash
# verify-backup.sh - Verify backup integrity

BACKUP_FILE="$1"
EXTRACT_DIR="/tmp/backup-verify-$(date +%s)"

mkdir -p "${EXTRACT_DIR}"

echo "Verifying backup: ${BACKUP_FILE}"

# Extract and check content
tar xzf "${BACKUP_FILE}" -C "${EXTRACT_DIR}"

# Check key files exist
KEY_FILES=(
    "harvester-settings.yaml"
    "vm-images.yaml"
    "virtual-machines.yaml"
    "cluster-networks.yaml"
)

for FILE in "${KEY_FILES[@]}"; do
    if ls "${EXTRACT_DIR}"/*/"${FILE}" 2>/dev/null | head -1 > /dev/null; then
        echo "[OK] ${FILE} found"
    else
        echo "[MISSING] ${FILE} not found in backup!"
    fi
done

# Count resources in backup
echo ""
echo "Resource counts:"
grep -hE '^kind: |^  kind: ' "${EXTRACT_DIR}"/*/*.yaml | \
    awk '{print $2}' | grep -v '^List$' | sort | uniq -c | sort -rn

# Cleanup
rm -rf "${EXTRACT_DIR}"
```

## Conclusion

A complete Harvester configuration backup strategy combines etcd snapshots (for rapid cluster recovery), exported Kubernetes resource definitions (for documentation and partial recovery), and node-level configuration files (for OS-level recovery). Store all backups in an external location - preferably S3 or another cloud storage - separate from the Harvester cluster itself. Test your restore procedures regularly; a backup that has never been tested is of uncertain value. With comprehensive configuration backups in place, you can confidently recover from hardware failures, misconfiguration events, or complete cluster loss.
