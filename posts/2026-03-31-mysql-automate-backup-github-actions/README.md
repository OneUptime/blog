# How to Automate MySQL Backup with GitHub Actions

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MySQL, Backup, GitHub Action, Automation, CI/CD

Description: Automate MySQL backups using GitHub Actions with scheduled workflows that dump, compress, and upload backups to cloud storage with retention policies.

---

## Automating MySQL Backups with GitHub Actions

GitHub Actions workflows can run on a schedule using cron syntax, making them a convenient way to automate MySQL backups without managing separate backup servers or cron jobs. The workflow dumps the database, compresses it, uploads to S3 or similar storage, and handles retention automatically.

## Prerequisites

Store your database credentials as GitHub Actions secrets:

```text
MYSQL_HOST       - Database hostname
MYSQL_PORT       - Database port (default: 3306)
MYSQL_DATABASE   - Database name to back up
MYSQL_USER       - Backup user with SELECT and LOCK TABLES privileges
MYSQL_PASSWORD   - Backup user password
AWS_ACCESS_KEY_ID     - AWS credentials for S3 upload
AWS_SECRET_ACCESS_KEY - AWS credentials for S3 upload
BACKUP_S3_BUCKET - S3 bucket name for backups
```

## Creating a Dedicated Backup User

```sql
CREATE USER 'backup_user'@'%'
  IDENTIFIED BY 'strong_backup_password';

GRANT SELECT, LOCK TABLES, SHOW VIEW,
      EVENT, TRIGGER, RELOAD,
      REPLICATION CLIENT, REPLICATION SLAVE
  ON *.* TO 'backup_user'@'%';

FLUSH PRIVILEGES;
```

## Backup Workflow

```yaml
# .github/workflows/mysql-backup.yml
name: MySQL Backup

on:
  schedule:
    - cron: '0 2 * * *'  # Daily at 02:00 UTC
  workflow_dispatch:       # Allow manual trigger

jobs:
  backup:
    runs-on: ubuntu-latest
    steps:
      - name: Install MySQL client
        run: |
          sudo apt-get update
          sudo apt-get install -y mysql-client

      - name: Create backup
        env:
          MYSQL_HOST:     ${{ secrets.MYSQL_HOST }}
          MYSQL_PORT:     ${{ secrets.MYSQL_PORT }}
          MYSQL_DATABASE: ${{ secrets.MYSQL_DATABASE }}
          MYSQL_USER:     ${{ secrets.MYSQL_USER }}
          MYSQL_PASSWORD: ${{ secrets.MYSQL_PASSWORD }}
        run: |
          BACKUP_FILE="backup-${MYSQL_DATABASE}-$(date +%Y%m%d-%H%M%S).sql.gz"
          echo "Creating backup: $BACKUP_FILE"
          mysqldump \
            --host="$MYSQL_HOST" \
            --port="$MYSQL_PORT" \
            --user="$MYSQL_USER" \
            --password="$MYSQL_PASSWORD" \
            --single-transaction \
            --quick \
            --set-gtid-purged=OFF \
            --routines \
            --triggers \
            --events \
            "$MYSQL_DATABASE" | gzip > "$BACKUP_FILE"
          echo "BACKUP_FILE=$BACKUP_FILE" >> $GITHUB_ENV

      - name: Upload to S3
        env:
          AWS_ACCESS_KEY_ID:     ${{ secrets.AWS_ACCESS_KEY_ID }}
          AWS_SECRET_ACCESS_KEY: ${{ secrets.AWS_SECRET_ACCESS_KEY }}
          BACKUP_S3_BUCKET:      ${{ secrets.BACKUP_S3_BUCKET }}
        run: |
          aws s3 cp "$BACKUP_FILE" \
            "s3://${BACKUP_S3_BUCKET}/mysql/daily/${BACKUP_FILE}" \
            --storage-class STANDARD_IA

      - name: Verify backup uploaded
        run: |
          aws s3 ls "s3://${BACKUP_S3_BUCKET}/mysql/daily/" | grep "$BACKUP_FILE"
        env:
          AWS_ACCESS_KEY_ID:     ${{ secrets.AWS_ACCESS_KEY_ID }}
          AWS_SECRET_ACCESS_KEY: ${{ secrets.AWS_SECRET_ACCESS_KEY }}
          BACKUP_S3_BUCKET:      ${{ secrets.BACKUP_S3_BUCKET }}

      - name: Delete backups older than 30 days
        env:
          AWS_ACCESS_KEY_ID:     ${{ secrets.AWS_ACCESS_KEY_ID }}
          AWS_SECRET_ACCESS_KEY: ${{ secrets.AWS_SECRET_ACCESS_KEY }}
          BACKUP_S3_BUCKET:      ${{ secrets.BACKUP_S3_BUCKET }}
        run: |
          CUTOFF_DATE=$(date -d '30 days ago' +%Y-%m-%d)
          aws s3 ls "s3://${BACKUP_S3_BUCKET}/mysql/daily/" \
            | awk '{print $4}' \
            | while read filename; do
                FILE_DATE=$(echo "$filename" | grep -oP '\d{8}')
                if [[ "$FILE_DATE" < "${CUTOFF_DATE//-/}" ]]; then
                  aws s3 rm "s3://${BACKUP_S3_BUCKET}/mysql/daily/$filename"
                  echo "Deleted old backup: $filename"
                fi
              done
```

## Testing the Restore

Add a weekly workflow to verify backups are restorable:

```yaml
      - name: Test backup restore
        run: |
          # Start a test MySQL instance
          docker run -d --name mysql-test \
            -e MYSQL_ROOT_PASSWORD=testpass \
            -e MYSQL_DATABASE=restore_test \
            -p 3307:3306 \
            mysql:8.0
          sleep 20
          # Restore the backup
          gunzip -c "$BACKUP_FILE" | mysql \
            -h 127.0.0.1 -P 3307 -u root -ptestpass restore_test
          echo "Backup restored successfully"
          docker stop mysql-test && docker rm mysql-test
```

## Summary

Automating MySQL backups with GitHub Actions provides a simple, auditable backup process without dedicated infrastructure. Scheduled workflows run `mysqldump` with the `--single-transaction` flag for consistent backups, compress the output, upload to S3 with STANDARD_IA storage class, and enforce retention by deleting old backups. Weekly restore testing confirms backups are actually usable.
