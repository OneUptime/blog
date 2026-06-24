# How to Restore Portainer from an S3 Backup

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Portainer, Docker, Backup, S3, AWS, Restore, Recovery

Description: Restore Portainer Business Edition from an S3 backup using the built-in restore interface or manual S3 download and volume restoration process.

## Introduction

When Portainer Business Edition is configured for S3 backups, restoring is a streamlined process - identify the backup you want, then restore it on a fresh Portainer instance during initial setup. You can either download the backup from S3 and upload the `tar.gz` file, or retrieve the backup directly from S3 in the restore wizard. This guide covers both approaches.

## Prerequisites

- Access to the S3 bucket containing Portainer backups
- AWS CLI or S3-compatible CLI configured
- A fresh Portainer Business Edition instance with an empty data volume
- The backup password, if the backup was password protected

## Step 1: List Available Backups in S3

```bash
# List all Portainer backups in S3

aws s3 ls s3://my-portainer-backups/portainer/ --recursive

# List with human-readable sizes and sorted by date
aws s3 ls s3://my-portainer-backups/portainer/ \
  --recursive --human-readable \
  | sort -k 1,2

# Find the most recent backup
aws s3 ls s3://my-portainer-backups/portainer/ --recursive | \
  sort -k 1,2 | tail -1
```

## Step 2: Download the Backup from S3

```bash
# Download the most recent backup
LATEST=$(aws s3 ls s3://my-portainer-backups/portainer/ --recursive | \
  sort -k 1,2 | tail -1 | awk '{print $4}')

echo "Downloading: $LATEST"

aws s3 cp "s3://my-portainer-backups/$LATEST" /tmp/portainer-restore.tar.gz

# Verify download
ls -lh /tmp/portainer-restore.tar.gz
```

## Step 3: Restore via Portainer UI

If Portainer BE is freshly installed on the target server:

1. Open Portainer at `https://your-host:9443`
2. On the initial setup screen, expand **Restore Portainer from backup**
3. Upload the downloaded backup file
4. Enter the backup password if the backup was password protected
5. Click **Restore Portainer**

For an existing running Portainer BE:

1. Restoring from backup is only supported on a fresh instance during the initial installation
2. Deploy a new Portainer instance with an empty data volume, then restore from the initial setup screen

## Step 4: Restore Directly from S3

For Portainer Business Edition, you can restore directly from S3 during initial setup without downloading the backup locally:

1. Open Portainer at `https://your-host:9443`
2. On the initial setup screen, expand **Restore Portainer from backup**
3. Select **Retrieve from S3**
4. Enter the S3 access key ID, secret access key, region, bucket name, optional S3-compatible host, backup filename, and backup password if one was set
5. Click **Restore Portainer**

## Step 5: Handle Password-Protected Backups

If the backup was password protected when it was created, enter the same password during restore:

```bash
# Portainer handles password-protected backup restoration in the restore UI
# Use the same password that was configured when the backup was created
# This applies whether you upload a downloaded backup file or restore directly from S3
```

## Step 6: Restore Using AWS CLI Automation

```bash
#!/bin/bash
# prepare-portainer-s3-restore.sh

set -euo pipefail

S3_BUCKET="my-portainer-backups"
S3_PREFIX="portainer/"
PORTAINER_CONTAINER="portainer"
VOLUME_NAME="portainer_data"
TEMP_DIR="/tmp/portainer-restore"
PORTAINER_IMAGE="portainer/portainer-ee:lts"

echo "=== Portainer S3 Restore Preparation ==="

# Find latest backup
echo "Finding latest backup in S3..."
LATEST_KEY=$(aws s3 ls "s3://$S3_BUCKET/$S3_PREFIX" --recursive | \
  sort -k 1,2 | tail -1 | awk '{print $4}')

if [ -z "$LATEST_KEY" ]; then
  echo "ERROR: No backups found in s3://$S3_BUCKET/$S3_PREFIX"
  exit 1
fi

echo "Latest backup: $LATEST_KEY"

# Confirm preparation
read -r -p "Prepare a fresh Portainer instance for restore? (yes/no): " CONFIRM
if [ "$CONFIRM" != "yes" ]; then
  echo "Aborted."
  exit 0
fi

# Create temp directory
mkdir -p "$TEMP_DIR"

# Download backup
echo "Downloading backup..."
aws s3 cp "s3://$S3_BUCKET/$LATEST_KEY" "$TEMP_DIR/backup.tar.gz"

echo "Backup downloaded: $(du -sh "$TEMP_DIR/backup.tar.gz" | cut -f1)"

# Stop Portainer if it exists
echo "Stopping existing Portainer container if present..."
docker stop "$PORTAINER_CONTAINER" 2>/dev/null || true
docker rm "$PORTAINER_CONTAINER" 2>/dev/null || true

# Backup current data before overwriting
echo "Creating safety backup of current data..."
docker run --rm \
  -v "$VOLUME_NAME:/data" \
  -v "/tmp:/backup" \
  alpine tar czf /backup/portainer-pre-restore.tar.gz -C /data . 2>/dev/null || true

# Remove old volume
docker volume rm "$VOLUME_NAME" 2>/dev/null || true
docker volume create "$VOLUME_NAME" >/dev/null

# Start a fresh Portainer BE instance
echo "Starting a fresh Portainer BE instance..."
docker run -d \
  -p 8000:8000 \
  -p 9443:9443 \
  --name "$PORTAINER_CONTAINER" \
  --restart=always \
  -v /var/run/docker.sock:/var/run/docker.sock \
  -v "$VOLUME_NAME:/data" \
  "$PORTAINER_IMAGE"

echo "Preparation complete."
echo "Allow 10-15 seconds then access: https://$(hostname -I | awk '{print $1}'):9443"
echo "On the initial setup page, choose 'Restore Portainer from backup'"
echo "Then upload: $TEMP_DIR/backup.tar.gz"
```

## Step 7: Verify Restored Data

```bash
# Wait for Portainer to start after the restore completes
sleep 15

# Verify the container is running
docker ps --filter "name=portainer"

# Test login
TOKEN=$(curl -sk -X POST https://localhost:9443/api/auth \
  -H "Content-Type: application/json" \
  -d '{"Username":"admin","Password":"yourpassword"}' | jq -r .jwt)

# Check what was restored
echo "Environments:"
curl -sk -H "Authorization: Bearer $TOKEN" \
  https://localhost:9443/api/endpoints | jq '.[].Name'

echo "Stacks:"
curl -sk -H "Authorization: Bearer $TOKEN" \
  https://localhost:9443/api/stacks | jq '.[].Name'
```

## Conclusion

Restoring Portainer from an S3 backup is a two-step process: identify the backup you want and restore it on a fresh Portainer instance during initial setup, either by uploading the downloaded `tar.gz` file or retrieving it directly from S3 in Portainer BE. Always verify the restoration by testing authentication and confirming all environments and stacks are present. Keep your backup password stored securely and separately from the backups themselves.
