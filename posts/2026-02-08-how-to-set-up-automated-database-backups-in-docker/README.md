# How to Set Up Automated Database Backups in Docker

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Docker, Database, Backups, PostgreSQL, MySQL, MongoDB, Automation, DevOps

Description: Learn how to configure automated database backups for PostgreSQL, MySQL, and MongoDB using Docker containers and cron scheduling.

---

Losing production data ranks among the most painful experiences in software engineering. Whether it happens through accidental deletion, hardware failure, or a botched migration, the result is the same: panic and regret. Setting up automated database backups in Docker eliminates this risk with minimal effort. This guide walks through practical backup strategies for PostgreSQL, MySQL, and MongoDB containers.

## Why Back Up Databases in Docker?

Databases running inside Docker containers store their data on volumes. While volumes persist across container restarts, they do not protect against host machine failure, accidental volume deletion, or data corruption. Automated backups give you point-in-time recovery options and peace of mind.

A solid backup strategy covers three bases: regular scheduled dumps, offsite storage, and tested restores. Docker makes all three straightforward.

## PostgreSQL Automated Backups

Let's start with a PostgreSQL backup setup. The approach uses `pg_dump` inside a dedicated backup container that runs on a cron schedule.

First, here is a Docker Compose file that defines both the database and the backup service:

```yaml
# docker-compose.yml - PostgreSQL with automated backup sidecar
version: "3.8"

services:
  postgres:
    image: postgres:16
    environment:
      POSTGRES_DB: myapp
      POSTGRES_USER: appuser
      POSTGRES_PASSWORD: secretpass
    volumes:
      - pgdata:/var/lib/postgresql/data
    networks:
      - dbnet

  pg-backup:
    image: postgres:16
    depends_on:
      - postgres
    environment:
      PGHOST: postgres
      PGUSER: appuser
      PGPASSWORD: secretpass
      PGDATABASE: myapp
    volumes:
      - ./backups/postgres:/backups
      - ./scripts/pg-backup.sh:/usr/local/bin/pg-backup.sh
    entrypoint: ["/bin/bash", "-c"]
    # Run backup every 6 hours using crond
    command:
      - |
        echo "0 */6 * * * /usr/local/bin/pg-backup.sh >> /var/log/backup.log 2>&1" > /etc/cron.d/pg-backup
        chmod 0644 /etc/cron.d/pg-backup
        crontab /etc/cron.d/pg-backup
        cron -f
    networks:
      - dbnet

volumes:
  pgdata:

networks:
  dbnet:
```

Now create the backup script that handles the actual dump and cleanup:

```bash
#!/bin/bash
# scripts/pg-backup.sh - Dumps PostgreSQL and removes backups older than 7 days

set -euo pipefail

BACKUP_DIR="/backups"
TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
FILENAME="pg_backup_${TIMESTAMP}.sql.gz"

echo "[$(date)] Starting PostgreSQL backup..."

# Run pg_dump and compress the output with gzip
pg_dump -Fc | gzip > "${BACKUP_DIR}/${FILENAME}"

# Calculate and display the backup file size
SIZE=$(du -h "${BACKUP_DIR}/${FILENAME}" | cut -f1)
echo "[$(date)] Backup complete: ${FILENAME} (${SIZE})"

# Remove backup files older than 7 days to save disk space
find "${BACKUP_DIR}" -name "pg_backup_*.sql.gz" -mtime +7 -delete
echo "[$(date)] Old backups cleaned up."
```

Make the script executable:

```bash
# Grant execute permission to the backup script
chmod +x scripts/pg-backup.sh
```

## MySQL Automated Backups

MySQL follows a similar pattern but uses `mysqldump` instead. Here is a dedicated backup container approach:

```yaml
# docker-compose.yml - MySQL with automated backup service
version: "3.8"

services:
  mysql:
    image: mysql:8.0
    environment:
      MYSQL_ROOT_PASSWORD: rootpass
      MYSQL_DATABASE: myapp
      MYSQL_USER: appuser
      MYSQL_PASSWORD: secretpass
    volumes:
      - mysqldata:/var/lib/mysql
    networks:
      - dbnet

  mysql-backup:
    image: mysql:8.0
    depends_on:
      - mysql
    volumes:
      - ./backups/mysql:/backups
    entrypoint: ["/bin/bash", "-c"]
    # Cron entry runs mysqldump every 6 hours
    command:
      - |
        apt-get update && apt-get install -y cron
        echo "0 */6 * * * mysqldump -h mysql -u appuser -psecretpass --single-transaction --routines myapp | gzip > /backups/mysql_backup_\$(date +\%Y\%m\%d_\%H\%M\%S).sql.gz && find /backups -name 'mysql_backup_*.sql.gz' -mtime +7 -delete" > /etc/cron.d/mysql-backup
        chmod 0644 /etc/cron.d/mysql-backup
        crontab /etc/cron.d/mysql-backup
        cron -f
    networks:
      - dbnet

volumes:
  mysqldata:

networks:
  dbnet:
```

The `--single-transaction` flag ensures a consistent snapshot without locking the tables, which is critical for production databases that serve live traffic.

## MongoDB Automated Backups

MongoDB uses `mongodump` for its backup utility. Here is the setup:

```yaml
# docker-compose.yml - MongoDB with backup sidecar
version: "3.8"

services:
  mongo:
    image: mongo:7
    environment:
      MONGO_INITDB_ROOT_USERNAME: root
      MONGO_INITDB_ROOT_PASSWORD: rootpass
    volumes:
      - mongodata:/data/db
    networks:
      - dbnet

  mongo-backup:
    image: mongo:7
    depends_on:
      - mongo
    volumes:
      - ./backups/mongo:/backups
      - ./scripts/mongo-backup.sh:/usr/local/bin/mongo-backup.sh
    entrypoint: ["/bin/bash", "-c"]
    command:
      - |
        echo "0 */6 * * * /usr/local/bin/mongo-backup.sh >> /var/log/backup.log 2>&1" > /etc/cron.d/mongo-backup
        chmod 0644 /etc/cron.d/mongo-backup
        crontab /etc/cron.d/mongo-backup
        cron -f
    networks:
      - dbnet

volumes:
  mongodata:

networks:
  dbnet:
```

The MongoDB backup script:

```bash
#!/bin/bash
# scripts/mongo-backup.sh - Creates compressed MongoDB dump archives

set -euo pipefail

BACKUP_DIR="/backups"
TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
FILENAME="mongo_backup_${TIMESTAMP}.archive.gz"

echo "[$(date)] Starting MongoDB backup..."

# Use mongodump with gzip compression and archive format
mongodump \
  --host=mongo \
  --username=root \
  --password=rootpass \
  --authenticationDatabase=admin \
  --archive="${BACKUP_DIR}/${FILENAME}" \
  --gzip

echo "[$(date)] Backup complete: ${FILENAME}"

# Prune backups older than 7 days
find "${BACKUP_DIR}" -name "mongo_backup_*.archive.gz" -mtime +7 -delete
echo "[$(date)] Cleanup done."
```

## Uploading Backups to S3

Local backups protect against application-level failures, but not against host machine failure. Pushing backups to S3 (or any S3-compatible storage) adds offsite protection.

Here is a script that uploads completed backups using the AWS CLI:

```bash
#!/bin/bash
# scripts/upload-to-s3.sh - Syncs local backup directory to an S3 bucket

set -euo pipefail

BACKUP_DIR="/backups"
S3_BUCKET="s3://my-db-backups/production"

# Sync only new files to S3 (existing files are skipped)
aws s3 sync "${BACKUP_DIR}" "${S3_BUCKET}" \
  --storage-class STANDARD_IA \
  --exclude "*" \
  --include "*.sql.gz" \
  --include "*.archive.gz"

echo "[$(date)] S3 upload complete."
```

You can add this to your cron schedule to run after each backup completes. For the container, use an image that includes the AWS CLI, or install it in your backup image.

## Testing Your Restores

A backup you have never tested is not a backup. Schedule regular restore tests to verify your dumps are valid.

For PostgreSQL restores:

```bash
# Restore a PostgreSQL backup into a temporary test database
docker exec -i postgres pg_restore \
  -U appuser \
  -d myapp_test \
  --clean \
  --if-exists \
  < backups/postgres/pg_backup_20260208_060000.sql.gz
```

For MySQL restores:

```bash
# Decompress and pipe the SQL dump into MySQL for restore testing
gunzip < backups/mysql/mysql_backup_20260208_060000.sql.gz | \
  docker exec -i mysql mysql -u appuser -psecretpass myapp_test
```

For MongoDB restores:

```bash
# Restore MongoDB archive to a test database for verification
docker exec -i mongo mongorestore \
  --username=root \
  --password=rootpass \
  --authenticationDatabase=admin \
  --archive \
  --gzip \
  --nsFrom="myapp.*" \
  --nsTo="myapp_test.*" \
  < backups/mongo/mongo_backup_20260208_060000.archive.gz
```

## Monitoring Backup Health

Backups that silently fail are worse than no backups at all, because they create a false sense of security. Add a simple health check that verifies backup freshness:

```bash
#!/bin/bash
# scripts/check-backup-health.sh - Alerts if no recent backup exists

BACKUP_DIR="/backups"
MAX_AGE_HOURS=12

# Find backups modified within the last MAX_AGE_HOURS
RECENT=$(find "${BACKUP_DIR}" -type f \( -name "*.sql.gz" -o -name "*.archive.gz" \) -mmin -$((MAX_AGE_HOURS * 60)) | wc -l)

if [ "$RECENT" -eq 0 ]; then
  echo "ALERT: No backup found in the last ${MAX_AGE_HOURS} hours!"
  # Send alert via webhook, email, or monitoring tool
  curl -X POST "https://your-monitoring-endpoint/alert" \
    -H "Content-Type: application/json" \
    -d '{"message": "Database backup missing", "severity": "critical"}'
  exit 1
fi

echo "OK: ${RECENT} recent backup(s) found."
```

## Best Practices

Keep these principles in mind when setting up Docker database backups:

1. **Separate backup containers from database containers.** This keeps concerns isolated and lets you update backup logic without touching the database.

2. **Compress all backups.** Gzip reduces backup sizes by 80-90% for typical SQL dumps, saving both storage and transfer costs.

3. **Rotate old backups.** The `find -mtime +7 -delete` pattern shown above prevents disk space from growing unbounded.

4. **Use consistent snapshot options.** The `--single-transaction` flag for MySQL and the `-Fc` format for PostgreSQL ensure you get consistent point-in-time snapshots.

5. **Store secrets in Docker secrets or environment files.** Never hardcode passwords in scripts meant for production. Use `.env` files referenced by Docker Compose or Docker Swarm secrets.

6. **Test restores monthly.** Automate restore testing if possible. A backup that cannot be restored is worthless.

With these patterns in place, your Dockerized databases gain a reliable safety net. The initial setup takes about an hour, and the ongoing maintenance cost is nearly zero. That tradeoff is well worth it compared to the alternative of scrambling to recover lost data.
