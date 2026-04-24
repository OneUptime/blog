# How to Back Up Portainer Data Before an Upgrade - Backup

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Portainer, Backup, Disaster-recovery, Upgrade, Data-protection

Description: A comprehensive guide to backing up Portainer CE and Business Edition data before upgrades, covering volume backups, database exports, and automated backup strategies.

## Overview

Creating a backup before upgrading Portainer is essential for ensuring you can roll back if an issue occurs. Portainer stores its configuration under the container's `/data` directory, typically in the Docker volume `portainer_data` or a Kubernetes PVC. This guide covers multiple backup methods to protect your Portainer configuration before any upgrade.

## Understanding Portainer Data

Portainer stores the following in its data directory:
- User accounts and authentication data
- Environment/endpoint configurations
- Stack configurations
- Registry credentials
- SSL certificates (if uploaded)
- License key (BE)
- Settings and preferences

Primary database: `/data/portainer.db` (BoltDB). On Docker installs this is typically inside the `portainer_data` volume; on Kubernetes it lives on the Portainer PVC. Additional Portainer-managed files are stored elsewhere under `/data` (for example stack files and certificates).

## Method 1: Docker Volume Backup (tar archive)

The most reliable backup method:

```bash
# Stop Portainer for a clean backup (optional but recommended)

docker stop portainer

# Create a tar archive of the data volume
docker run --rm \
  -v portainer_data:/data \
  -v "$(pwd)":/backup \
  alpine \
  tar czf /backup/portainer-backup-$(date +%Y%m%d-%H%M%S).tar.gz \
  -C /data .

# Restart Portainer
docker start portainer

# Verify backup was created
ls -lh portainer-backup-*.tar.gz
```

## Method 2: Copy BoltDB File Directly (database only)

This captures only the BoltDB database file and does not include other files stored under `/data` such as stack files or certificates.

```bash
# Stop Portainer (required for consistent copy)
docker stop portainer

# Copy the database file
docker run --rm \
  -v portainer_data:/data \
  -v "$(pwd)":/backup \
  alpine cp /data/portainer.db /backup/portainer-$(date +%Y%m%d).db

# Restart Portainer
docker start portainer
```

## Method 3: Portainer Built-in Backup

Portainer includes a built-in backup download. S3 backup and scheduled backups are Business Edition features.

### Via UI

```text
Portainer UI → Settings → Back up Portainer → Download backup
```

This downloads a `tar.gz` backup containing:
- Database (portainer.db)
- Stack files deployed using Portainer
- TLS certificates and Portainer-managed configuration files

### Via API

```bash
# Export backup via Portainer API
TOKEN=$(curl -s -k \
  -X POST https://portainer:9443/api/auth \
  -H "Content-Type: application/json" \
  -d '{"username":"admin","password":"yourpassword"}' \
  | jq -r '.jwt')

# Download backup
curl -s -k \
  -H "Authorization: Bearer ${TOKEN}" \
  -X POST "https://portainer:9443/api/backup" \
  -H "Content-Type: application/json" \
  -d '{"password": "encryption-password"}' \
  -OJ
```

## Method 4: Kubernetes PVC Snapshot

For Kubernetes deployments, snapshot the PVC that backs Portainer's `/data` directory if your CSI driver supports `VolumeSnapshot`:

```bash
# Identify the PVC used by Portainer
kubectl get pvc -n portainer

# Snapshot the Portainer PVC (replace names to match your cluster)
kubectl apply -f - << 'EOF'
apiVersion: snapshot.storage.k8s.io/v1
kind: VolumeSnapshot
metadata:
  name: portainer-backup
  namespace: portainer
spec:
  volumeSnapshotClassName: <your-snapshot-class>
  source:
    persistentVolumeClaimName: portainer
EOF
```

## Automated Pre-Upgrade Backup Script

```bash
#!/bin/bash
# pre-upgrade-backup.sh

set -euo pipefail

BACKUP_DIR="${BACKUP_DIR:-$HOME/portainer-backups}"
mkdir -p "${BACKUP_DIR}"

BACKUP_FILE="${BACKUP_DIR}/portainer-backup-$(date +%Y%m%d-%H%M%S).tar.gz"

cleanup() {
  docker start portainer >/dev/null 2>&1 || true
}

echo "Stopping Portainer for a consistent backup..."
docker stop portainer >/dev/null
trap cleanup EXIT

echo "Creating pre-upgrade backup..."

# Create backup
docker run --rm \
  -v portainer_data:/data \
  -v "${BACKUP_DIR}:/backup" \
  alpine \
  tar czf "/backup/$(basename "${BACKUP_FILE}")" -C /data .

docker start portainer >/dev/null
trap - EXIT

echo "Backup created: ${BACKUP_FILE}"
echo "Backup size: $(ls -lh "${BACKUP_FILE}" | awk '{print $5}')"

# Keep only last 5 backups
ls -t "${BACKUP_DIR}"/portainer-backup-*.tar.gz | tail -n +6 | xargs -r rm
echo "Old backups cleaned up. Current backups:"
ls -lh "${BACKUP_DIR}"/portainer-backup-*.tar.gz
```

## Backup Verification

```bash
# Replace with the backup file you want to verify
BACKUP_FILE=portainer-backup-20260320-120000.tar.gz

# Verify the backup is valid
docker run --rm \
  -v "$(pwd)":/backup \
  alpine \
  tar tzf "/backup/${BACKUP_FILE}" | head -20

# Should list files including portainer.db
```

## Offsite Backup

```bash
# Replace with the backup file you want to upload
BACKUP_FILE=portainer-backup-20260320-120000.tar.gz

# Copy backup to S3 (requires aws CLI)
aws s3 cp "${BACKUP_FILE}" \
  s3://my-backups/portainer/

# Or use rclone for multi-cloud backup
rclone copy "${BACKUP_FILE}" \
  remote:portainer-backups/
```

## Conclusion

Always create a backup before upgrading Portainer, regardless of the upgrade method. The tar-based volume backup is the most reliable and universally compatible approach. Store backups in at least two locations (local + remote) and verify backup integrity by listing the archive contents. Portainer's built-in backup UI/API provides a convenient additional backup method with optional encryption, and Business Edition can also store backups in S3.
