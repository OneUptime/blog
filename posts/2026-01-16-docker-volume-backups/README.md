# How to Automate Docker Volume Backups with Cron

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Docker, Backup, Volumes, Cron, DevOps

Description: Learn how to automate Docker volume backups using cron jobs, including compression, rotation, and remote storage integration.

---

Regular volume backups are essential for data protection in Docker environments. This guide covers automating backups with cron, implementing rotation policies, and storing backups remotely.

## Basic Backup Script

```bash
#!/bin/bash
# backup-volumes.sh

BACKUP_DIR="/backups"
DATE=$(date +%Y%m%d_%H%M%S)

# Backup a specific volume
backup_volume() {
    local volume_name=$1
    local backup_file="${BACKUP_DIR}/${volume_name}_${DATE}.tar.gz"

    docker run --rm \
        -v ${volume_name}:/source:ro \
        -v ${BACKUP_DIR}:/backup \
        alpine tar czf /backup/$(basename $backup_file) -C /source .

    echo "Backed up ${volume_name} to ${backup_file}"
}

# Backup all volumes
for volume in $(docker volume ls -q); do
    backup_volume $volume
done
```

## Docker Compose Backup Service

```yaml
version: '3.8'

services:
  backup:
    image: alpine
    volumes:
      - mydata:/source:ro
      - ./backups:/backup
    command: >
      sh -c "
        tar czf /backup/mydata_$$(date +%Y%m%d).tar.gz -C /source . &&
        echo Backup complete
      "

volumes:
  mydata:
```

## Backup with Rotation

```bash
#!/bin/bash
# backup-with-rotation.sh

BACKUP_DIR="/backups"
RETENTION_DAYS=7
DATE=$(date +%Y%m%d_%H%M%S)

backup_volume() {
    local volume=$1
    docker run --rm \
        -v ${volume}:/source:ro \
        -v ${BACKUP_DIR}:/backup \
        alpine tar czf /backup/${volume}_${DATE}.tar.gz -C /source .
}

cleanup_old_backups() {
    find ${BACKUP_DIR} -name "*.tar.gz" -mtime +${RETENTION_DAYS} -delete
}

# Run backups
for volume in $(docker volume ls -q); do
    backup_volume $volume
done

# Cleanup
cleanup_old_backups
```

## Cron Configuration

```bash
# Edit crontab
crontab -e

# Daily backup at 2 AM
0 2 * * * /opt/scripts/backup-volumes.sh >> /var/log/docker-backup.log 2>&1

# Weekly full backup on Sunday
0 3 * * 0 /opt/scripts/full-backup.sh >> /var/log/docker-backup.log 2>&1
```

## Remote Backup with S3

```bash
#!/bin/bash
# backup-to-s3.sh

BACKUP_DIR="/tmp/docker-backups"
S3_BUCKET="s3://my-backups/docker"
DATE=$(date +%Y%m%d)

mkdir -p ${BACKUP_DIR}

# Backup volumes
for volume in $(docker volume ls -q); do
    docker run --rm \
        -v ${volume}:/source:ro \
        -v ${BACKUP_DIR}:/backup \
        alpine tar czf /backup/${volume}_${DATE}.tar.gz -C /source .
done

# Upload to S3
aws s3 sync ${BACKUP_DIR} ${S3_BUCKET}/ --delete

# Cleanup local backups
rm -rf ${BACKUP_DIR}
```

## Backup Service Container

```yaml
version: '3.8'

services:
  backup:
    image: offen/docker-volume-backup:latest
    environment:
      BACKUP_CRON_EXPRESSION: "0 2 * * *"
      BACKUP_RETENTION_DAYS: 7
      AWS_S3_BUCKET_NAME: my-backups
      AWS_ACCESS_KEY_ID: ${AWS_ACCESS_KEY_ID}
      AWS_SECRET_ACCESS_KEY: ${AWS_SECRET_ACCESS_KEY}
    volumes:
      - /var/run/docker.sock:/var/run/docker.sock:ro
      - mydata:/backup/mydata:ro
    restart: unless-stopped

volumes:
  mydata:
```

## Restore from Backup

```bash
#!/bin/bash
# restore-volume.sh

BACKUP_FILE=$1
VOLUME_NAME=$2

# Create volume if not exists
docker volume create ${VOLUME_NAME}

# Restore
docker run --rm \
    -v ${VOLUME_NAME}:/target \
    -v $(pwd):/backup:ro \
    alpine tar xzf /backup/${BACKUP_FILE} -C /target
```

## Complete Backup Solution

```yaml
version: '3.8'

services:
  app:
    image: myapp:latest
    volumes:
      - app_data:/app/data

  postgres:
    image: postgres:15
    volumes:
      - pg_data:/var/lib/postgresql/data

  backup:
    image: alpine
    volumes:
      - app_data:/backup/app_data:ro
      - pg_data:/backup/pg_data:ro
      - ./backups:/output
      - /var/run/docker.sock:/var/run/docker.sock:ro
    entrypoint: /bin/sh
    command: -c "
      apk add --no-cache docker-cli &&
      while true; do
        DATE=$$(date +%Y%m%d_%H%M%S);
        tar czf /output/app_data_$$DATE.tar.gz -C /backup/app_data .;
        docker exec postgres pg_dump -U postgres mydb > /output/pg_dump_$$DATE.sql;
        find /output -mtime +7 -delete;
        sleep 86400;
      done
      "
    restart: unless-stopped

volumes:
  app_data:
  pg_data:
```

## Summary

| Strategy | Best For |
|----------|----------|
| Local tar | Development |
| S3/Cloud | Production |
| Volume backup tools | Automated solutions |
| Database dumps | Database-specific backups |

Automated backups protect against data loss. Use rotation policies to manage storage, upload to remote storage for disaster recovery, and test restores regularly. For container migration, see our post on [Migrating Docker Containers Between Hosts](https://oneuptime.com/blog/post/2026-01-16-docker-container-migration/view).

