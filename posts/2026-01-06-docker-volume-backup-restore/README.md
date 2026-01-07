# How to Back Up and Restore Docker Volumes

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Docker, Containers, DevOps, Backup, Storage, Reliability

Description: Implement volume snapshots using tar, restic, and borg integrations with scheduled backup patterns to protect your containerized data.

Docker volumes store your databases, uploads, and application state. Losing them means losing data. Unlike container images that can be rebuilt, volume data is unique and irreplaceable. A solid backup strategy is non-negotiable for production workloads.

---

## Understanding Volume Types

Before backing up, know what you're dealing with:

### Named Volumes (Docker-Managed)

Named volumes are the recommended approach for production data. Docker manages the storage location and lifecycle.

```bash
# Create a named volume that Docker will manage
docker volume create mydata

# Mount the named volume at /data inside the container
docker run -v mydata:/data myapp

# Location on host: /var/lib/docker/volumes/mydata/_data
```

### Bind Mounts (Host-Managed)

Bind mounts map a host directory directly into the container. You control the exact location on the host filesystem.

```bash
# Mount a specific host path into the container
docker run -v /host/path:/container/path myapp

# Data lives at /host/path - back it up like any directory
```

### Anonymous Volumes

Anonymous volumes lack a reference name, making them difficult to manage and back up. Avoid these in production.

```bash
# Creates an anonymous volume - hard to identify and backup
docker run -v /data myapp

# No external reference - difficult to back up, avoid in production
```

This guide focuses on named volumes, the Docker-recommended approach for persistent data.

---

## Basic Backup with tar

The universal method: mount the volume into a container and tar it.

### Backup a Volume

This approach uses a temporary Alpine container to create a compressed archive of your volume data. The read-only mount ensures backup consistency.

```bash
# Stop the container using the volume (recommended for consistency)
docker stop myapp

# Create backup using temporary Alpine container
docker run --rm \
  -v mydata:/source:ro \       # Mount source volume as read-only
  -v $(pwd)/backups:/backup \  # Mount local backup directory
  alpine tar czf /backup/mydata-$(date +%Y%m%d-%H%M%S).tar.gz -C /source .

# Restart container after backup completes
docker start myapp
```

### Restore a Volume

Restoring extracts the backup archive into the target volume. Optionally clear existing data first for a clean restore.

```bash
# Stop the container before restore
docker stop myapp

# Clear existing data (optional, for clean restore)
docker run --rm -v mydata:/target alpine sh -c "rm -rf /target/*"

# Restore from backup archive to target volume
docker run --rm \
  -v mydata:/target \           # Mount volume to restore into
  -v $(pwd)/backups:/backup:ro \ # Mount backup directory as read-only
  alpine tar xzf /backup/mydata-20240106-120000.tar.gz -C /target

# Start container with restored data
docker start myapp
```

### Backup Script

This reusable script backs up any volume with automatic old backup cleanup. It keeps the last 7 backups by default.

```bash
#!/bin/bash
# backup-volume.sh

VOLUME_NAME=$1                    # First argument: volume name to backup
BACKUP_DIR=${2:-./backups}        # Second argument: backup directory (default: ./backups)
TIMESTAMP=$(date +%Y%m%d-%H%M%S)  # Generate timestamp for unique backup name
BACKUP_FILE="${VOLUME_NAME}-${TIMESTAMP}.tar.gz"

# Create backup directory if it doesn't exist
mkdir -p "$BACKUP_DIR"

echo "Backing up volume: $VOLUME_NAME"

# Run backup using Alpine container with tar
docker run --rm \
  -v "${VOLUME_NAME}:/source:ro" \   # Source volume mounted read-only
  -v "${BACKUP_DIR}:/backup" \        # Backup destination
  alpine tar czf "/backup/${BACKUP_FILE}" -C /source .

echo "Backup created: ${BACKUP_DIR}/${BACKUP_FILE}"

# Cleanup old backups - keep only the 7 most recent
ls -t "${BACKUP_DIR}/${VOLUME_NAME}-"*.tar.gz 2>/dev/null | tail -n +8 | xargs -r rm

echo "Cleanup complete"
```

Usage:

```bash
# Backup mydata volume to ./backups directory
./backup-volume.sh mydata ./backups
```

---

## Online Backup (Without Stopping)

For services that can't tolerate downtime, but with consistency trade-offs:

### Database-Specific Dumps

More reliable than filesystem backups for databases:

Database dumps are transactionally consistent, unlike filesystem-level backups. Use the native dump tools for each database engine.

```bash
# PostgreSQL - creates consistent SQL dump of entire database
docker exec postgres pg_dump -U postgres dbname > backup.sql

# MySQL - dump with credentials from environment variable
docker exec mysql mysqldump -u root -p${MYSQL_ROOT_PASSWORD} dbname > backup.sql

# MongoDB - create compressed archive backup inside container
docker exec mongodb mongodump --archive=/backup/dump.archive --gzip
```

### Combined Approach

This setup runs a sidecar container that performs daily database dumps automatically. The backup container connects to the database over the internal network.

```yaml
# docker-compose.yml
services:
  postgres:
    image: postgres:16
    volumes:
      - postgres-data:/var/lib/postgresql/data  # Database storage
      - ./backups:/backups  # Backup output directory

  backup:
    image: postgres:16  # Use same image for pg_dump compatibility
    depends_on:
      - postgres  # Ensure database starts first
    volumes:
      - ./backups:/backups  # Mount backup directory
    entrypoint: >
      sh -c "while true; do
        pg_dump -h postgres -U postgres mydb | gzip > /backups/db-$$(date +%Y%m%d-%H%M%S).sql.gz
        sleep 86400
      done"
    environment:
      PGPASSWORD: password  # Database password for pg_dump

volumes:
  postgres-data:  # Named volume for database files
```

---

## Restic Integration

Restic provides encrypted, deduplicated backups with multiple backend support.

### Setup Restic Backup Container

This Dockerfile creates a custom Restic container with an automated backup script.

```dockerfile
# Dockerfile.restic
FROM restic/restic:latest

# Add bash for script execution
RUN apk add --no-cache bash

# Copy backup script into container
COPY backup.sh /backup.sh
RUN chmod +x /backup.sh

ENTRYPOINT ["/backup.sh"]
```

The backup script handles repository initialization, backup creation, and retention policy enforcement.

```bash
#!/bin/bash
# backup.sh

# Initialize repository if it doesn't exist, otherwise list snapshots
restic snapshots || restic init

# Perform backup with identifying tags
restic backup /data --tag docker-volume --tag ${VOLUME_NAME:-unknown}

# Apply retention policy: keep 7 daily, 4 weekly, 6 monthly backups
restic forget --keep-daily 7 --keep-weekly 4 --keep-monthly 6 --prune

# Verify repository integrity
restic check
```

### Docker Compose with Restic

This configuration backs up your application data to S3 with encryption. Restic handles deduplication, so incremental backups are fast and storage-efficient.

```yaml
services:
  app:
    image: myapp
    volumes:
      - appdata:/data  # Application data volume

  backup:
    build:
      context: .
      dockerfile: Dockerfile.restic
    volumes:
      - appdata:/data:ro  # Mount volume read-only for backup
    environment:
      - RESTIC_REPOSITORY=s3:s3.amazonaws.com/mybucket/backups  # S3 backend
      - RESTIC_PASSWORD=your-encryption-password  # Encryption key
      - AWS_ACCESS_KEY_ID=xxx  # AWS credentials
      - AWS_SECRET_ACCESS_KEY=xxx
      - VOLUME_NAME=appdata  # Tag for identifying backups
    # Run backup daily - sleep between runs
    entrypoint: >
      sh -c "while true; do /backup.sh; sleep 86400; done"

volumes:
  appdata:
```

### Restore with Restic

These commands demonstrate how to list available backups and restore from a specific snapshot.

```bash
# List all available snapshots in the repository
docker run --rm \
  -e RESTIC_REPOSITORY=s3:s3.amazonaws.com/mybucket/backups \
  -e RESTIC_PASSWORD=your-encryption-password \
  -e AWS_ACCESS_KEY_ID=xxx \
  -e AWS_SECRET_ACCESS_KEY=xxx \
  restic/restic snapshots

# Restore specific snapshot (abc123) to the data volume
docker run --rm \
  -v appdata:/data \  # Volume to restore into
  -e RESTIC_REPOSITORY=s3:s3.amazonaws.com/mybucket/backups \
  -e RESTIC_PASSWORD=your-encryption-password \
  restic/restic restore abc123 --target /data
```

---

## Borg Backup Integration

Borg offers excellent compression and deduplication.

### Borg Backup Container

This configuration uses the Borg backup image with environment-based configuration. It automatically handles backup creation and retention.

```yaml
services:
  borg-backup:
    image: pschiffe/borg-backup
    volumes:
      - appdata:/source:ro  # Source data mounted read-only
      - borg-repo:/repo     # Local repository for backups
      - ./borg-config:/config:ro  # Optional configuration files
    environment:
      - BORG_REPO=/repo  # Path to Borg repository
      - BORG_PASSPHRASE=your-passphrase  # Encryption passphrase
      - BACKUP_DIRS=/source  # Directories to backup
      - PRUNE_PREFIX=auto-  # Prefix for automatic backup naming
      - PRUNE_KEEP_DAILY=7   # Keep 7 daily backups
      - PRUNE_KEEP_WEEKLY=4  # Keep 4 weekly backups
      - PRUNE_KEEP_MONTHLY=6 # Keep 6 monthly backups

volumes:
  appdata:
  borg-repo:  # Persistent storage for Borg repository
```

### Manual Borg Operations

These commands demonstrate manual Borg operations for initialization, backup, listing, and restoration.

```bash
# Initialize new encrypted repository
docker run --rm \
  -v borg-repo:/repo \
  -e BORG_PASSPHRASE=secret \
  pschiffe/borg-backup \
  borg init --encryption=repokey /repo  # repokey stores encryption key in repo

# Create a new backup archive with dated name
docker run --rm \
  -v appdata:/source:ro \  # Source data
  -v borg-repo:/repo \      # Repository location
  -e BORG_PASSPHRASE=secret \
  pschiffe/borg-backup \
  borg create /repo::backup-$(date +%Y%m%d) /source

# List all backup archives in repository
docker run --rm \
  -v borg-repo:/repo \
  -e BORG_PASSPHRASE=secret \
  pschiffe/borg-backup \
  borg list /repo

# Restore specific backup archive to target volume
docker run --rm \
  -v appdata:/target \  # Destination for restored files
  -v borg-repo:/repo \
  -e BORG_PASSPHRASE=secret \
  pschiffe/borg-backup \
  borg extract /repo::backup-20240106 --target /target
```

---

## Scheduled Backups

### Using Cron on Host

This cron job triggers the backup script daily at 2 AM. Output is logged for monitoring and troubleshooting.

```bash
# /etc/cron.d/docker-backups
# Run backup script daily at 2 AM as root user
0 2 * * * root /opt/scripts/backup-volumes.sh >> /var/log/docker-backup.log 2>&1
```

This script iterates through multiple volumes and backs them all up to S3 in a single run.

```bash
#!/bin/bash
# /opt/scripts/backup-volumes.sh

# List of volumes to backup
VOLUMES="postgres-data redis-data uploads"
BACKUP_DIR="/backups"

# Backup each volume
for vol in $VOLUMES; do
  echo "$(date): Backing up $vol"
  docker run --rm \
    -v "${vol}:/source:ro" \
    -v "${BACKUP_DIR}:/backup" \
    alpine tar czf "/backup/${vol}-$(date +%Y%m%d).tar.gz" -C /source .
done

# Upload all backups to S3, remove files not in source (sync)
aws s3 sync "$BACKUP_DIR" s3://mybucket/docker-backups/ --delete
```

### Using Ofelia (Docker-Native Scheduler)

Ofelia is a Docker-native job scheduler that reads schedules from container labels. No host cron configuration required.

```yaml
services:
  ofelia:
    image: mcuadros/ofelia:latest
    volumes:
      - /var/run/docker.sock:/var/run/docker.sock  # Access to control other containers
      - ./ofelia.ini:/etc/ofelia/config.ini:ro     # Optional config file
    depends_on:
      - backup

  backup:
    image: alpine
    volumes:
      - appdata:/source:ro
      - ./backups:/backup
    labels:
      ofelia.enabled: "true"  # Enable Ofelia scheduling
      ofelia.job-exec.backup.schedule: "0 0 2 * * *"  # Run at 2 AM daily
      ofelia.job-exec.backup.command: "tar czf /backup/app-$(date +%Y%m%d).tar.gz -C /source ."
    command: tail -f /dev/null  # Keep container running for scheduled jobs

volumes:
  appdata:
```

---

## Backup Verification

Backups are worthless if they can't be restored. Test regularly.

### Automated Restore Testing

This script creates a temporary volume, restores a backup, and verifies the contents. Use it to validate backups regularly.

```bash
#!/bin/bash
# test-restore.sh

BACKUP_FILE=$1  # Backup file to test
TEST_VOLUME="restore-test-$(date +%s)"  # Unique volume name using timestamp

# Create temporary test volume
docker volume create "$TEST_VOLUME"

# Restore backup to test volume
docker run --rm \
  -v "${TEST_VOLUME}:/target" \
  -v "$(pwd)/backups:/backup:ro" \
  alpine tar xzf "/backup/${BACKUP_FILE}" -C /target

# Verify contents (customize verification for your data)
docker run --rm \
  -v "${TEST_VOLUME}:/data:ro" \
  alpine sh -c "ls -la /data && echo 'Restore verification passed'"

# Cleanup test volume
docker volume rm "$TEST_VOLUME"

echo "Restore test completed successfully"
```

### Checksum Verification

Generate checksums during backup to detect corruption before attempting restore.

```bash
# Generate checksum during backup for integrity verification
docker run --rm \
  -v mydata:/source:ro \
  -v $(pwd)/backups:/backup \
  alpine sh -c "
    tar czf /backup/mydata.tar.gz -C /source . &&
    sha256sum /backup/mydata.tar.gz > /backup/mydata.tar.gz.sha256
  "

# Verify checksum before restore to detect corruption
sha256sum -c backups/mydata.tar.gz.sha256
```

---

## Complete Backup Solution

This production-ready example combines database dumps, file backups, S3 uploads, and automatic cleanup into a single solution.

```yaml
# docker-compose.yml
services:
  app:
    image: myapp
    volumes:
      - appdata:/app/data  # Application data
    depends_on:
      db:
        condition: service_healthy  # Wait for healthy database

  db:
    image: postgres:16
    volumes:
      - postgres-data:/var/lib/postgresql/data  # Database storage
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U postgres"]  # PostgreSQL readiness check
      interval: 10s
      timeout: 5s
      retries: 5

  backup:
    image: alpine
    volumes:
      - appdata:/source/app:ro       # App data for file backup
      - postgres-data:/source/db:ro  # DB data (not used directly, pg_dump preferred)
      - ./backups:/backup            # Local backup storage
      - /var/run/docker.sock:/var/run/docker.sock  # Docker access
    entrypoint: >
      sh -c "
        apk add --no-cache docker-cli postgresql-client aws-cli &&
        while true; do
          echo 'Starting backup at' $$(date)

          # Database dump (transactionally consistent)
          PGPASSWORD=password pg_dump -h db -U postgres mydb | gzip > /backup/db-$$(date +%Y%m%d-%H%M%S).sql.gz

          # File backup for application data
          tar czf /backup/app-$$(date +%Y%m%d-%H%M%S).tar.gz -C /source/app .

          # Upload to S3 for off-site storage
          aws s3 sync /backup/ s3://mybucket/backups/ --delete

          # Cleanup local backups older than 3 days
          find /backup -type f -mtime +3 -delete

          echo 'Backup completed at' $$(date)
          sleep 86400  # Sleep 24 hours
        done
      "

volumes:
  appdata:
  postgres-data:
```

---

## Quick Reference

These essential commands cover the most common backup and restore operations.

```bash
# Backup named volume to compressed archive
docker run --rm -v mydata:/source:ro -v $(pwd):/backup alpine tar czf /backup/mydata.tar.gz -C /source .

# Restore from archive to named volume
docker run --rm -v mydata:/target -v $(pwd):/backup alpine tar xzf /backup/mydata.tar.gz -C /target

# List volume contents without modifying
docker run --rm -v mydata:/data alpine ls -la /data

# Copy entire volume to another volume
docker run --rm -v source:/from:ro -v target:/to alpine cp -a /from/. /to/

# Database dump (PostgreSQL) with compression
docker exec postgres pg_dump -U postgres dbname | gzip > backup.sql.gz

# Database restore (PostgreSQL) from compressed dump
gunzip -c backup.sql.gz | docker exec -i postgres psql -U postgres dbname
```

---

## Summary

- Named volumes are the standard for persistent Docker data
- Use tar for simple, universal backups
- Database dumps are more reliable than filesystem backups for databases
- Restic/Borg provide encryption, deduplication, and cloud backends
- Schedule backups with cron or Ofelia
- Test restores regularly - untested backups aren't backups
- Combine database dumps with filesystem backups for complete coverage
- Upload backups off-server (S3, remote storage) for disaster recovery

Data loss is permanent. Invest in backups before you need them.
