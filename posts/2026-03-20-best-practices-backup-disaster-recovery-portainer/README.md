# Best Practices for Backup and Disaster Recovery with Portainer

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Portainer, Backup, Disaster Recovery, Docker, Best Practice, DevOps, Resilience

Description: Implement a comprehensive backup and disaster recovery strategy for Portainer itself and the containerized workloads it manages, including automated backup procedures and recovery runbooks.

---

A Portainer deployment without a backup strategy is a single point of failure. This guide covers backing up Portainer's configuration and the data volumes of your containerized applications, along with recovery procedures.

## What Needs to Be Backed Up

```bash
Portainer itself:
  - portainer_data volume (DB, configs, keys)
  - TLS certificates

Your workloads:
  - Named Docker volumes (database data, file uploads, etc.)
  - Stack definitions (best kept in Git)
  - Registry credentials
  - Environment variable configurations
```

## Backup Portainer's Data Volume

Portainer stores all configuration, user accounts, and environment data in the `portainer_data` volume. Back it up regularly:

```bash
#!/bin/bash
# backup-portainer.sh

BACKUP_DIR=/opt/backups/portainer
TIMESTAMP=$(date +%Y%m%d-%H%M%S)
mkdir -p "$BACKUP_DIR"

# Stop Portainer for a consistent backup

docker stop portainer

# Create a tarball of the volume
docker run --rm \
  -v portainer_data:/data:ro \
  -v "$BACKUP_DIR":/backups \
  alpine sh -c "cd /data && tar czf /backups/portainer-data-$TIMESTAMP.tar.gz ."

# Restart Portainer
docker start portainer

echo "Portainer backup completed: portainer-data-$TIMESTAMP.tar.gz"

# Keep only the last 30 backups
ls -t "$BACKUP_DIR"/portainer-data-*.tar.gz | tail -n +31 | xargs -r rm
```

## Backup Application Volumes

For each named volume used by your applications:

```bash
#!/bin/bash
# backup-volumes.sh

BACKUP_DIR=/opt/backups/volumes
TIMESTAMP=$(date +%Y%m%d-%H%M%S)
mkdir -p "$BACKUP_DIR"

# List of critical volumes to back up
VOLUMES=(
  "postgres-data"
  "wordpress-uploads"
  "redis-data"
  "app-config"
)

for VOLUME in "${VOLUMES[@]}"; do
  echo "Backing up volume: $VOLUME"
  docker run --rm \
    -v "$VOLUME":/data:ro \
    -v "$BACKUP_DIR":/backups \
    alpine sh -c "cd /data && tar czf /backups/$VOLUME-$TIMESTAMP.tar.gz ."
done

echo "All volume backups complete"
```

## Use Portainer's Built-In Backup

Portainer includes a built-in backup feature for configuration backups. Business Edition adds S3 storage and scheduled backups:

1. Go to **Settings > Back up Portainer**
2. For a local backup, click **Download backup**
3. In BE, select **Store in S3** to configure an S3 destination
4. In BE, enable scheduled backups and set a cron rule

This backs up Portainer's configuration database and stack files deployed through Portainer, but not your environment's containers or their data.

## Offsite Backup with Restic

Use Restic to back up volumes to Amazon S3 or another S3-compatible object store:

```bash
#!/bin/bash
# restic-backup.sh

export RESTIC_REPOSITORY="s3:s3.us-east-1.amazonaws.com/my-backup-bucket/portainer"
export AWS_ACCESS_KEY_ID="your-access-key"
export AWS_SECRET_ACCESS_KEY="your-secret-key"
export RESTIC_PASSWORD="your-restic-password"

# Initialize repository (first run only)
# docker run --rm \
#   -e RESTIC_REPOSITORY \
#   -e AWS_ACCESS_KEY_ID \
#   -e AWS_SECRET_ACCESS_KEY \
#   -e RESTIC_PASSWORD \
#   restic/restic:latest \
#   init

# Back up all critical volumes
docker run --rm \
  -v portainer_data:/backup/portainer:ro \
  -v postgres-data:/backup/postgres:ro \
  -e RESTIC_REPOSITORY \
  -e AWS_ACCESS_KEY_ID \
  -e AWS_SECRET_ACCESS_KEY \
  -e RESTIC_PASSWORD \
  restic/restic:latest \
  backup /backup --tag "daily"

# Prune old backups
docker run --rm \
  -e RESTIC_REPOSITORY \
  -e AWS_ACCESS_KEY_ID \
  -e AWS_SECRET_ACCESS_KEY \
  -e RESTIC_PASSWORD \
  restic/restic:latest \
  forget --keep-daily 7 --keep-weekly 4 --keep-monthly 3 --prune
```

## Recovery Runbook

Document and test your recovery procedure:

```bash
#!/bin/bash
# restore-portainer.sh

BACKUP_FILE="$1"
if [ -z "$BACKUP_FILE" ]; then
  echo "Usage: $0 /path/to/portainer-data-TIMESTAMP.tar.gz"
  exit 1
fi

BACKUP_BASENAME=$(basename "$BACKUP_FILE")

# Stop existing Portainer
docker stop portainer

# Clear existing data from the volume (WARNING: this deletes all Portainer config)
docker run --rm \
  -v portainer_data:/data \
  alpine sh -c 'rm -rf /data/* /data/.[!.]* /data/..?*'

# Restore from backup
docker run --rm \
  -v portainer_data:/data \
  -v "$(dirname "$BACKUP_FILE")":/backups:ro \
  alpine sh -c "cd /data && tar xzf \"/backups/$BACKUP_BASENAME\""

# Restart Portainer
docker start portainer

echo "Portainer restored from $BACKUP_FILE"
echo "Verify at https://$(hostname):9443"
```

## Testing Backups

Test your backup recovery process quarterly:
1. Spin up a separate test server
2. Restore the Portainer backup
3. Verify all environments, stacks, and users are present
4. Verify application deployments work after volume restore

## RTO and RPO Planning

Define your recovery targets:

| Component | RPO (Max Data Loss) | RTO (Max Downtime) |
|-----------|--------------------|--------------------|
| Portainer config | 24 hours | 30 minutes |
| Database volumes | 1 hour | 1 hour |
| Application state | 15 minutes | 2 hours |

Adjust backup frequency to meet your RPO targets.

## Summary

Backup and disaster recovery for Portainer requires backing up both Portainer's own data volume and your application data volumes. Keep stack definitions in Git for zero-RPO configuration recovery. Test your recovery procedures regularly - a backup you've never restored is just hope.
