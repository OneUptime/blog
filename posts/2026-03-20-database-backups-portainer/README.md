# How to Set Up Database Backups with Portainer

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Portainer, Docker, Database, Backup, PostgreSQL, MySQL, MongoDB, DevOps

Description: Automate database backups for PostgreSQL, MySQL, and MongoDB containers using Portainer scheduled tasks and S3 storage.

## Introduction

Regular database backups are non-negotiable. With databases running in Docker containers, backups require special handling to ensure data consistency. This guide covers automated backup strategies for PostgreSQL, MySQL, and MongoDB containers managed through Portainer, with optional S3 offsite storage.

## Step 1: Deploy Backup Service Stack

```yaml
# docker-compose.yml - Database Backup Automation

version: "3.8"

networks:
  backup_network:
    external: true  # Connect to your database network

volumes:
  backup_data:

services:
  # Backup scheduler service
  backup_scheduler:
    image: fradelg/mysql-cron-backup:latest
    container_name: db_backup_scheduler
    restart: unless-stopped
    environment:
      - CRON_TIME=0 2 * * *  # Daily at 2 AM
      - MYSQL_HOST=mysql
      - MYSQL_USER=backup_user
      - MYSQL_PASS=backup_password
      - MYSQL_DB=myapp
      - BACKUP_DIR=/backup
      - MAX_BACKUPS=30  # Keep 30 days
    volumes:
      - backup_data:/backup
    networks:
      - backup_network
```

## Step 2: PostgreSQL Backup Container

```yaml
# docker-compose.yml - PostgreSQL backup
version: "3.8"

networks:
  app_network:
    external: true

volumes:
  pg_backups:

services:
  # PostgreSQL automated backup
  postgres_backup:
    image: prodrigestivill/postgres-backup-local:latest
    container_name: postgres_backup
    restart: unless-stopped
    environment:
      - POSTGRES_HOST=postgres
      - POSTGRES_DB=myapp
      - POSTGRES_USER=postgres
      - POSTGRES_PASSWORD=your_postgres_password
      # Backup schedule (cron format)
      - SCHEDULE=@daily
      # Keep backups for 7 days
      - BACKUP_KEEP_DAYS=7
      # Keep weekly backups for 4 weeks
      - BACKUP_KEEP_WEEKS=4
      # Keep monthly backups for 6 months
      - BACKUP_KEEP_MONTHS=6
      # Health check file
      - HEALTHCHECK_PORT=8080
    volumes:
      - pg_backups:/backups
    networks:
      - app_network
```

## Step 3: Custom Backup Script with S3 Upload

```bash
#!/bin/bash
# /opt/scripts/backup-all-databases.sh
# Comprehensive backup script for all databases

set -euo pipefail

DATE=$(date +%Y%m%d_%H%M%S)
LOCAL_BACKUP_DIR="/opt/backups"
S3_BUCKET="s3://my-backup-bucket/databases"
RETENTION_DAYS=30

# Logging
LOG_FILE="/var/log/db-backups.log"
log() { echo "[$(date '+%Y-%m-%d %H:%M:%S')] $1" | tee -a "$LOG_FILE"; }

# Create backup directory
mkdir -p "$LOCAL_BACKUP_DIR"

# ==================
# PostgreSQL Backup
# ==================
backup_postgres() {
    local CONTAINER="$1"
    local DB_NAME="$2"
    local USER="$3"
    local PASSWORD="$4"
    local BACKUP_FILE="$LOCAL_BACKUP_DIR/pg_${DB_NAME}_${DATE}.sql.gz"

    log "Backing up PostgreSQL: $DB_NAME"

    docker exec "$CONTAINER" pg_dump \
        -U "$USER" \
        --no-password \
        --format=custom \
        --blobs \
        --verbose \
        "$DB_NAME" \
        | gzip > "$BACKUP_FILE"

    log "PostgreSQL backup complete: $BACKUP_FILE ($(du -sh "$BACKUP_FILE" | cut -f1))"
    echo "$BACKUP_FILE"
}

# ==================
# MySQL Backup
# ==================
backup_mysql() {
    local CONTAINER="$1"
    local DB_NAME="$2"
    local USER="$3"
    local PASSWORD="$4"
    local BACKUP_FILE="$LOCAL_BACKUP_DIR/mysql_${DB_NAME}_${DATE}.sql.gz"

    log "Backing up MySQL: $DB_NAME"

    docker exec "$CONTAINER" mysqldump \
        -u "$USER" \
        --password="$PASSWORD" \
        --single-transaction \
        --routines \
        --triggers \
        --events \
        "$DB_NAME" \
        | gzip > "$BACKUP_FILE"

    log "MySQL backup complete: $BACKUP_FILE ($(du -sh "$BACKUP_FILE" | cut -f1))"
    echo "$BACKUP_FILE"
}

# ==================
# MongoDB Backup
# ==================
backup_mongodb() {
    local CONTAINER="$1"
    local DB_NAME="$2"
    local USER="$3"
    local PASSWORD="$4"
    local BACKUP_FILE="$LOCAL_BACKUP_DIR/mongo_${DB_NAME}_${DATE}.tar.gz"

    log "Backing up MongoDB: $DB_NAME"

    docker exec "$CONTAINER" mongodump \
        -u "$USER" \
        -p "$PASSWORD" \
        --authenticationDatabase admin \
        --db "$DB_NAME" \
        --out "/tmp/mongo_backup_$DATE"

    docker cp "${CONTAINER}:/tmp/mongo_backup_${DATE}" "/tmp/"

    tar -czf "$BACKUP_FILE" -C /tmp "mongo_backup_$DATE"
    rm -rf "/tmp/mongo_backup_$DATE"

    log "MongoDB backup complete: $BACKUP_FILE ($(du -sh "$BACKUP_FILE" | cut -f1))"
    echo "$BACKUP_FILE"
}

# ==================
# Upload to S3
# ==================
upload_to_s3() {
    local FILE="$1"
    local FILENAME=$(basename "$FILE")

    if command -v aws &>/dev/null; then
        log "Uploading $FILENAME to S3"
        aws s3 cp "$FILE" "$S3_BUCKET/$FILENAME" \
            --storage-class STANDARD_IA
        log "S3 upload complete: $FILENAME"
    else
        log "WARNING: AWS CLI not installed, skipping S3 upload"
    fi
}

# ==================
# Rotate Old Backups
# ==================
rotate_backups() {
    log "Rotating backups older than $RETENTION_DAYS days"
    find "$LOCAL_BACKUP_DIR" -name "*.gz" -mtime "+$RETENTION_DAYS" -delete
}

# ==================
# Main execution
# ==================
main() {
    log "=== Database Backup Started ==="

    # Run backups
    PG_FILE=$(backup_postgres "app_postgres" "myapp" "postgres" "$POSTGRES_PASSWORD")
    MYSQL_FILE=$(backup_mysql "app_mysql" "myapp" "root" "$MYSQL_ROOT_PASSWORD")
    MONGO_FILE=$(backup_mongodb "app_mongo" "myapp" "admin" "$MONGO_ADMIN_PASSWORD")

    # Upload to S3
    upload_to_s3 "$PG_FILE"
    upload_to_s3 "$MYSQL_FILE"
    upload_to_s3 "$MONGO_FILE"

    # Rotate old backups
    rotate_backups

    log "=== Backup Complete ==="
}

main
```

## Step 4: Deploy as a Portainer Scheduled Task

```yaml
# docker-compose.yml - Backup container with all tools
version: "3.8"

networks:
  app_network:
    external: true

volumes:
  backup_storage:

services:
  db_backup:
    image: ubuntu:22.04
    container_name: db_backup
    restart: unless-stopped
    entrypoint: >
      bash -c "
        apt-get update &&
        apt-get install -y postgresql-client mysql-client awscli cron ca-certificates curl gnupg &&
        curl -fsSL https://pgp.mongodb.com/server-7.0.asc | gpg --dearmor -o /usr/share/keyrings/mongodb-server-7.0.gpg &&
        echo 'deb [signed-by=/usr/share/keyrings/mongodb-server-7.0.gpg] https://repo.mongodb.org/apt/ubuntu jammy/mongodb-org/7.0 multiverse' > /etc/apt/sources.list.d/mongodb-org-7.0.list &&
        apt-get update &&
        apt-get install -y mongodb-database-tools &&
        cp /scripts/backup.sh /etc/cron.daily/db-backup &&
        chmod +x /etc/cron.daily/db-backup &&
        cron -f
      "
    environment:
      - POSTGRES_PASSWORD=your_postgres_password
      - MYSQL_ROOT_PASSWORD=your_mysql_password
      - MONGO_ADMIN_PASSWORD=your_mongo_password
      - AWS_ACCESS_KEY_ID=your_aws_key
      - AWS_SECRET_ACCESS_KEY=your_aws_secret
      - AWS_DEFAULT_REGION=us-east-1
    volumes:
      - ./scripts/backup.sh:/scripts/backup.sh:ro
      - backup_storage:/opt/backups
    networks:
      - app_network
```

## Step 5: Verify Backups with Restore Tests

```bash
#!/bin/bash
# verify-backup.sh - Test backup restoration monthly

LATEST_PG=$(ls -t /opt/backups/pg_*.gz | head -1)
TEST_DB="myapp_restore_test"

echo "Testing PostgreSQL restore from: $LATEST_PG"

# Create test database
docker exec app_postgres createdb -U postgres "$TEST_DB"

# Restore backup
zcat "$LATEST_PG" | docker exec -i app_postgres \
  pg_restore -U postgres -d "$TEST_DB" --verbose

# Run basic validation
docker exec app_postgres psql -U postgres -d "$TEST_DB" \
  -c "SELECT COUNT(*) FROM users;"

# Cleanup test database
docker exec app_postgres dropdb -U postgres "$TEST_DB"

echo "Backup verification PASSED"
```

## Monitoring Backups in Portainer

1. View backup container logs in Portainer to verify runs
2. Set up alerts if the backup container exits unexpectedly
3. Monitor backup volume size growth

```bash
# Check when last backup ran
docker exec db_backup tail -50 /var/log/db-backups.log

# List backup files
docker exec db_backup ls -lh /opt/backups/
```

## Conclusion

Your databases now have automated backup schedules with local storage and S3 offsite copies. The comprehensive backup script handles PostgreSQL, MySQL, and MongoDB with proper consistency guarantees. Portainer helps you monitor backup container health and view logs to ensure backups are completing successfully. Regular restore testing is equally important - a backup you haven't tested is a backup you can't trust.
