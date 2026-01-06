# How to Back Up and Restore Docker Volumes

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Docker, Containers, DevOps, Backup, Storage, Reliability

Description: Implement volume snapshots using tar, restic, and borg integrations with scheduled backup patterns to protect your containerized data.

Docker volumes store your databases, uploads, and application state. Losing them means losing data. Unlike container images that can be rebuilt, volume data is unique and irreplaceable. A solid backup strategy is non-negotiable for production workloads.

---

## Understanding Volume Types

Before backing up, know what you're dealing with:

### Named Volumes (Docker-Managed)

```bash
docker volume create mydata
docker run -v mydata:/data myapp

# Location: /var/lib/docker/volumes/mydata/_data
```

### Bind Mounts (Host-Managed)

```bash
docker run -v /host/path:/container/path myapp

# Data lives at /host/path - back it up like any directory
```

### Anonymous Volumes

```bash
docker run -v /data myapp

# No external reference - difficult to back up, avoid in production
```

This guide focuses on named volumes, the Docker-recommended approach for persistent data.

---

## Basic Backup with tar

The universal method: mount the volume into a container and tar it.

### Backup a Volume

```bash
# Stop the container using the volume (recommended for consistency)
docker stop myapp

# Create backup
docker run --rm \
  -v mydata:/source:ro \
  -v $(pwd)/backups:/backup \
  alpine tar czf /backup/mydata-$(date +%Y%m%d-%H%M%S).tar.gz -C /source .

# Restart container
docker start myapp
```

### Restore a Volume

```bash
# Stop the container
docker stop myapp

# Clear existing data (optional, for clean restore)
docker run --rm -v mydata:/target alpine sh -c "rm -rf /target/*"

# Restore from backup
docker run --rm \
  -v mydata:/target \
  -v $(pwd)/backups:/backup:ro \
  alpine tar xzf /backup/mydata-20240106-120000.tar.gz -C /target

# Start container
docker start myapp
```

### Backup Script

```bash
#!/bin/bash
# backup-volume.sh

VOLUME_NAME=$1
BACKUP_DIR=${2:-./backups}
TIMESTAMP=$(date +%Y%m%d-%H%M%S)
BACKUP_FILE="${VOLUME_NAME}-${TIMESTAMP}.tar.gz"

mkdir -p "$BACKUP_DIR"

echo "Backing up volume: $VOLUME_NAME"

docker run --rm \
  -v "${VOLUME_NAME}:/source:ro" \
  -v "${BACKUP_DIR}:/backup" \
  alpine tar czf "/backup/${BACKUP_FILE}" -C /source .

echo "Backup created: ${BACKUP_DIR}/${BACKUP_FILE}"

# Cleanup old backups (keep last 7)
ls -t "${BACKUP_DIR}/${VOLUME_NAME}-"*.tar.gz 2>/dev/null | tail -n +8 | xargs -r rm

echo "Cleanup complete"
```

Usage:
```bash
./backup-volume.sh mydata ./backups
```

---

## Online Backup (Without Stopping)

For services that can't tolerate downtime, but with consistency trade-offs:

### Database-Specific Dumps

More reliable than filesystem backups for databases:

```bash
# PostgreSQL
docker exec postgres pg_dump -U postgres dbname > backup.sql

# MySQL
docker exec mysql mysqldump -u root -p${MYSQL_ROOT_PASSWORD} dbname > backup.sql

# MongoDB
docker exec mongodb mongodump --archive=/backup/dump.archive --gzip
```

### Combined Approach

```yaml
# docker-compose.yml
services:
  postgres:
    image: postgres:16
    volumes:
      - postgres-data:/var/lib/postgresql/data
      - ./backups:/backups

  backup:
    image: postgres:16
    depends_on:
      - postgres
    volumes:
      - ./backups:/backups
    entrypoint: >
      sh -c "while true; do
        pg_dump -h postgres -U postgres mydb | gzip > /backups/db-$$(date +%Y%m%d-%H%M%S).sql.gz
        sleep 86400
      done"
    environment:
      PGPASSWORD: password

volumes:
  postgres-data:
```

---

## Restic Integration

Restic provides encrypted, deduplicated backups with multiple backend support.

### Setup Restic Backup Container

```dockerfile
# Dockerfile.restic
FROM restic/restic:latest

RUN apk add --no-cache bash

COPY backup.sh /backup.sh
RUN chmod +x /backup.sh

ENTRYPOINT ["/backup.sh"]
```

```bash
#!/bin/bash
# backup.sh

# Initialize repo if needed
restic snapshots || restic init

# Backup
restic backup /data --tag docker-volume --tag ${VOLUME_NAME:-unknown}

# Prune old backups
restic forget --keep-daily 7 --keep-weekly 4 --keep-monthly 6 --prune

# Verify
restic check
```

### Docker Compose with Restic

```yaml
services:
  app:
    image: myapp
    volumes:
      - appdata:/data

  backup:
    build:
      context: .
      dockerfile: Dockerfile.restic
    volumes:
      - appdata:/data:ro
    environment:
      - RESTIC_REPOSITORY=s3:s3.amazonaws.com/mybucket/backups
      - RESTIC_PASSWORD=your-encryption-password
      - AWS_ACCESS_KEY_ID=xxx
      - AWS_SECRET_ACCESS_KEY=xxx
      - VOLUME_NAME=appdata
    # Run daily at 2 AM
    # Use external scheduler or:
    entrypoint: >
      sh -c "while true; do /backup.sh; sleep 86400; done"

volumes:
  appdata:
```

### Restore with Restic

```bash
# List snapshots
docker run --rm \
  -e RESTIC_REPOSITORY=s3:s3.amazonaws.com/mybucket/backups \
  -e RESTIC_PASSWORD=your-encryption-password \
  -e AWS_ACCESS_KEY_ID=xxx \
  -e AWS_SECRET_ACCESS_KEY=xxx \
  restic/restic snapshots

# Restore specific snapshot
docker run --rm \
  -v appdata:/data \
  -e RESTIC_REPOSITORY=s3:s3.amazonaws.com/mybucket/backups \
  -e RESTIC_PASSWORD=your-encryption-password \
  restic/restic restore abc123 --target /data
```

---

## Borg Backup Integration

Borg offers excellent compression and deduplication.

### Borg Backup Container

```yaml
services:
  borg-backup:
    image: pschiffe/borg-backup
    volumes:
      - appdata:/source:ro
      - borg-repo:/repo
      - ./borg-config:/config:ro
    environment:
      - BORG_REPO=/repo
      - BORG_PASSPHRASE=your-passphrase
      - BACKUP_DIRS=/source
      - PRUNE_PREFIX=auto-
      - PRUNE_KEEP_DAILY=7
      - PRUNE_KEEP_WEEKLY=4
      - PRUNE_KEEP_MONTHLY=6

volumes:
  appdata:
  borg-repo:
```

### Manual Borg Operations

```bash
# Initialize repository
docker run --rm \
  -v borg-repo:/repo \
  -e BORG_PASSPHRASE=secret \
  pschiffe/borg-backup \
  borg init --encryption=repokey /repo

# Create backup
docker run --rm \
  -v appdata:/source:ro \
  -v borg-repo:/repo \
  -e BORG_PASSPHRASE=secret \
  pschiffe/borg-backup \
  borg create /repo::backup-$(date +%Y%m%d) /source

# List backups
docker run --rm \
  -v borg-repo:/repo \
  -e BORG_PASSPHRASE=secret \
  pschiffe/borg-backup \
  borg list /repo

# Restore
docker run --rm \
  -v appdata:/target \
  -v borg-repo:/repo \
  -e BORG_PASSPHRASE=secret \
  pschiffe/borg-backup \
  borg extract /repo::backup-20240106 --target /target
```

---

## Scheduled Backups

### Using Cron on Host

```bash
# /etc/cron.d/docker-backups
0 2 * * * root /opt/scripts/backup-volumes.sh >> /var/log/docker-backup.log 2>&1
```

```bash
#!/bin/bash
# /opt/scripts/backup-volumes.sh

VOLUMES="postgres-data redis-data uploads"
BACKUP_DIR="/backups"

for vol in $VOLUMES; do
  echo "$(date): Backing up $vol"
  docker run --rm \
    -v "${vol}:/source:ro" \
    -v "${BACKUP_DIR}:/backup" \
    alpine tar czf "/backup/${vol}-$(date +%Y%m%d).tar.gz" -C /source .
done

# Upload to S3
aws s3 sync "$BACKUP_DIR" s3://mybucket/docker-backups/ --delete
```

### Using Ofelia (Docker-Native Scheduler)

```yaml
services:
  ofelia:
    image: mcuadros/ofelia:latest
    volumes:
      - /var/run/docker.sock:/var/run/docker.sock
      - ./ofelia.ini:/etc/ofelia/config.ini:ro
    depends_on:
      - backup

  backup:
    image: alpine
    volumes:
      - appdata:/source:ro
      - ./backups:/backup
    labels:
      ofelia.enabled: "true"
      ofelia.job-exec.backup.schedule: "0 0 2 * * *"
      ofelia.job-exec.backup.command: "tar czf /backup/app-$(date +%Y%m%d).tar.gz -C /source ."
    command: tail -f /dev/null

volumes:
  appdata:
```

---

## Backup Verification

Backups are worthless if they can't be restored. Test regularly.

### Automated Restore Testing

```bash
#!/bin/bash
# test-restore.sh

BACKUP_FILE=$1
TEST_VOLUME="restore-test-$(date +%s)"

# Create test volume
docker volume create "$TEST_VOLUME"

# Restore to test volume
docker run --rm \
  -v "${TEST_VOLUME}:/target" \
  -v "$(pwd)/backups:/backup:ro" \
  alpine tar xzf "/backup/${BACKUP_FILE}" -C /target

# Verify contents (customize for your data)
docker run --rm \
  -v "${TEST_VOLUME}:/data:ro" \
  alpine sh -c "ls -la /data && echo 'Restore verification passed'"

# Cleanup
docker volume rm "$TEST_VOLUME"

echo "Restore test completed successfully"
```

### Checksum Verification

```bash
# Generate checksum during backup
docker run --rm \
  -v mydata:/source:ro \
  -v $(pwd)/backups:/backup \
  alpine sh -c "
    tar czf /backup/mydata.tar.gz -C /source . &&
    sha256sum /backup/mydata.tar.gz > /backup/mydata.tar.gz.sha256
  "

# Verify checksum before restore
sha256sum -c backups/mydata.tar.gz.sha256
```

---

## Complete Backup Solution

```yaml
# docker-compose.yml
services:
  app:
    image: myapp
    volumes:
      - appdata:/app/data
    depends_on:
      db:
        condition: service_healthy

  db:
    image: postgres:16
    volumes:
      - postgres-data:/var/lib/postgresql/data
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U postgres"]
      interval: 10s
      timeout: 5s
      retries: 5

  backup:
    image: alpine
    volumes:
      - appdata:/source/app:ro
      - postgres-data:/source/db:ro
      - ./backups:/backup
      - /var/run/docker.sock:/var/run/docker.sock
    entrypoint: >
      sh -c "
        apk add --no-cache docker-cli postgresql-client aws-cli &&
        while true; do
          echo 'Starting backup at' $$(date)

          # Database dump (consistent)
          PGPASSWORD=password pg_dump -h db -U postgres mydb | gzip > /backup/db-$$(date +%Y%m%d-%H%M%S).sql.gz

          # File backup
          tar czf /backup/app-$$(date +%Y%m%d-%H%M%S).tar.gz -C /source/app .

          # Upload to S3
          aws s3 sync /backup/ s3://mybucket/backups/ --delete

          # Cleanup local (keep 3 days)
          find /backup -type f -mtime +3 -delete

          echo 'Backup completed at' $$(date)
          sleep 86400
        done
      "

volumes:
  appdata:
  postgres-data:
```

---

## Quick Reference

```bash
# Backup named volume
docker run --rm -v mydata:/source:ro -v $(pwd):/backup alpine tar czf /backup/mydata.tar.gz -C /source .

# Restore to named volume
docker run --rm -v mydata:/target -v $(pwd):/backup alpine tar xzf /backup/mydata.tar.gz -C /target

# List volume contents
docker run --rm -v mydata:/data alpine ls -la /data

# Copy volume to volume
docker run --rm -v source:/from:ro -v target:/to alpine cp -a /from/. /to/

# Database dump (PostgreSQL)
docker exec postgres pg_dump -U postgres dbname | gzip > backup.sql.gz

# Database restore (PostgreSQL)
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
