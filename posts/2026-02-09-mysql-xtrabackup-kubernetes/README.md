# How to Implement MySQL Backup Automation Using Percona XtraBackup on Kubernetes

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MySQL, Kubernetes, Backup, Percona, Database

Description: Learn how to automate MySQL backups on Kubernetes using Percona XtraBackup with hot backups, point-in-time recovery, and scheduled backup strategies.

---

Database backups are critical for disaster recovery and business continuity. When running MySQL on Kubernetes, you need a backup solution that works with containerized environments and handles hot backups without locking tables. Percona XtraBackup provides exactly that - a powerful open-source tool that creates consistent backups of MySQL and MariaDB databases while they remain online and available.

In this guide, we'll implement automated MySQL backup workflows using Percona XtraBackup on Kubernetes. We'll cover full and incremental backups, scheduling strategies, and integration with cloud storage providers.

## Understanding Percona XtraBackup

Percona XtraBackup creates physical backups of InnoDB, XtraDB, and MyISAM tables without blocking database operations. Unlike logical backup tools like mysqldump, XtraBackup copies data files directly, making it significantly faster for large databases.

Key features include:

- Hot backups without locking tables
- Incremental backup support
- Point-in-time recovery capabilities
- Parallel backup and restore operations
- Encryption and compression support

## Deploying MySQL with Backup Configuration

First, let's deploy MySQL with the necessary configuration for XtraBackup. We'll use a StatefulSet with persistent storage:

```yaml
# mysql-statefulset.yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: mysql-config
  namespace: database
data:
  my.cnf: |
    [mysqld]
    # Enable binary logging for point-in-time recovery
    log-bin=mysql-bin
    binlog_format=ROW
    server-id=1

    # Performance settings
    innodb_buffer_pool_size=2G
    innodb_log_file_size=512M

    # XtraBackup requires this directory
    innodb_data_home_dir=/var/lib/mysql/
    innodb_log_group_home_dir=/var/lib/mysql/
---
apiVersion: apps/v1
kind: StatefulSet
metadata:
  name: mysql
  namespace: database
spec:
  serviceName: mysql
  replicas: 1
  selector:
    matchLabels:
      app: mysql
  template:
    metadata:
      labels:
        app: mysql
    spec:
      containers:
      - name: mysql
        image: percona:8.0
        ports:
        - containerPort: 3306
          name: mysql
        env:
        - name: MYSQL_ROOT_PASSWORD
          valueFrom:
            secretKeyRef:
              name: mysql-credentials
              key: root-password
        volumeMounts:
        - name: mysql-data
          mountPath: /var/lib/mysql
        - name: mysql-config
          mountPath: /etc/mysql/conf.d
        resources:
          requests:
            memory: "2Gi"
            cpu: "1000m"
          limits:
            memory: "4Gi"
            cpu: "2000m"
      volumes:
      - name: mysql-config
        configMap:
          name: mysql-config
  volumeClaimTemplates:
  - metadata:
      name: mysql-data
    spec:
      accessModes: ["ReadWriteOnce"]
      storageClassName: fast-ssd
      resources:
        requests:
          storage: 100Gi
```

Create the namespace and credentials:

```bash
# Create namespace
kubectl create namespace database

# Create MySQL credentials secret
kubectl create secret generic mysql-credentials \
  --from-literal=root-password='your-secure-password' \
  -n database

# Deploy MySQL
kubectl apply -f mysql-statefulset.yaml
```

## Creating a Backup Container Image

We'll build a custom container image that includes XtraBackup and necessary tools:

```dockerfile
# Dockerfile
FROM percona:8.0

# Install XtraBackup and utilities
RUN apt-get update && apt-get install -y \
    percona-xtrabackup-80 \
    awscli \
    curl \
    && rm -rf /var/lib/apt/lists/*

# Create backup script
COPY backup.sh /usr/local/bin/backup.sh
RUN chmod +x /usr/local/bin/backup.sh

# Set working directory
WORKDIR /backup

CMD ["/usr/local/bin/backup.sh"]
```

Create the backup script:

```bash
#!/bin/bash
# backup.sh

set -e

# Configuration from environment variables
MYSQL_HOST=${MYSQL_HOST:-mysql.database.svc.cluster.local}
MYSQL_PORT=${MYSQL_PORT:-3306}
MYSQL_USER=${MYSQL_USER:-root}
BACKUP_DIR=${BACKUP_DIR:-/backup}
S3_BUCKET=${S3_BUCKET}
BACKUP_TYPE=${BACKUP_TYPE:-full}

# Generate backup name with timestamp
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
BACKUP_NAME="mysql_${BACKUP_TYPE}_${TIMESTAMP}"
BACKUP_PATH="${BACKUP_DIR}/${BACKUP_NAME}"

echo "Starting ${BACKUP_TYPE} backup at ${TIMESTAMP}"

# Create backup directory
mkdir -p ${BACKUP_PATH}

# Perform backup based on type
if [ "$BACKUP_TYPE" = "full" ]; then
    echo "Creating full backup..."
    xtrabackup --backup \
        --target-dir=${BACKUP_PATH} \
        --host=${MYSQL_HOST} \
        --port=${MYSQL_PORT} \
        --user=${MYSQL_USER} \
        --password=${MYSQL_PASSWORD} \
        --parallel=4 \
        --compress \
        --compress-threads=4
elif [ "$BACKUP_TYPE" = "incremental" ]; then
    # Find latest full backup
    LATEST_FULL=$(ls -t ${BACKUP_DIR}/mysql_full_* | head -1)

    if [ -z "$LATEST_FULL" ]; then
        echo "No full backup found. Creating full backup instead..."
        BACKUP_TYPE="full"
        exec $0
    fi

    echo "Creating incremental backup based on ${LATEST_FULL}"
    xtrabackup --backup \
        --target-dir=${BACKUP_PATH} \
        --incremental-basedir=${LATEST_FULL} \
        --host=${MYSQL_HOST} \
        --port=${MYSQL_PORT} \
        --user=${MYSQL_USER} \
        --password=${MYSQL_PASSWORD} \
        --parallel=4 \
        --compress \
        --compress-threads=4
fi

# Create metadata file
cat > ${BACKUP_PATH}/metadata.json <<EOF
{
  "timestamp": "${TIMESTAMP}",
  "backup_type": "${BACKUP_TYPE}",
  "mysql_host": "${MYSQL_HOST}",
  "backup_size": "$(du -sh ${BACKUP_PATH} | cut -f1)"
}
EOF

# Upload to S3 if configured
if [ -n "$S3_BUCKET" ]; then
    echo "Uploading backup to S3..."
    tar czf - -C ${BACKUP_DIR} ${BACKUP_NAME} | \
        aws s3 cp - s3://${S3_BUCKET}/mysql-backups/${BACKUP_NAME}.tar.gz

    echo "Backup uploaded successfully"
fi

# Cleanup old local backups (keep last 3)
cd ${BACKUP_DIR}
ls -t mysql_* | tail -n +4 | xargs -r rm -rf

echo "Backup completed successfully: ${BACKUP_NAME}"
```

Build and push the image:

```bash
docker build -t your-registry/mysql-backup:latest .
docker push your-registry/mysql-backup:latest
```

## Scheduling Automated Backups with CronJobs

Create Kubernetes CronJobs for full and incremental backups:

```yaml
# backup-cronjobs.yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: backup-config
  namespace: database
data:
  S3_BUCKET: "my-database-backups"
  MYSQL_HOST: "mysql.database.svc.cluster.local"
  MYSQL_USER: "root"
---
apiVersion: batch/v1
kind: CronJob
metadata:
  name: mysql-full-backup
  namespace: database
spec:
  # Run full backup daily at 2 AM
  schedule: "0 2 * * *"
  successfulJobsHistoryLimit: 3
  failedJobsHistoryLimit: 3
  jobTemplate:
    spec:
      template:
        spec:
          restartPolicy: OnFailure
          containers:
          - name: backup
            image: your-registry/mysql-backup:latest
            env:
            - name: BACKUP_TYPE
              value: "full"
            - name: MYSQL_PASSWORD
              valueFrom:
                secretKeyRef:
                  name: mysql-credentials
                  key: root-password
            envFrom:
            - configMapRef:
                name: backup-config
            volumeMounts:
            - name: backup-storage
              mountPath: /backup
          volumes:
          - name: backup-storage
            persistentVolumeClaim:
              claimName: mysql-backup-pvc
---
apiVersion: batch/v1
kind: CronJob
metadata:
  name: mysql-incremental-backup
  namespace: database
spec:
  # Run incremental backup every 6 hours
  schedule: "0 */6 * * *"
  successfulJobsHistoryLimit: 3
  failedJobsHistoryLimit: 3
  jobTemplate:
    spec:
      template:
        spec:
          restartPolicy: OnFailure
          containers:
          - name: backup
            image: your-registry/mysql-backup:latest
            env:
            - name: BACKUP_TYPE
              value: "incremental"
            - name: MYSQL_PASSWORD
              valueFrom:
                secretKeyRef:
                  name: mysql-credentials
                  key: root-password
            envFrom:
            - configMapRef:
                name: backup-config
            volumeMounts:
            - name: backup-storage
              mountPath: /backup
          volumes:
          - name: backup-storage
            persistentVolumeClaim:
              claimName: mysql-backup-pvc
---
apiVersion: v1
kind: PersistentVolumeClaim
metadata:
  name: mysql-backup-pvc
  namespace: database
spec:
  accessModes:
  - ReadWriteMany
  storageClassName: standard
  resources:
    requests:
      storage: 200Gi
```

Deploy the backup jobs:

```bash
kubectl apply -f backup-cronjobs.yaml
```

## Implementing Backup Restore Procedures

Create a restore script for point-in-time recovery:

```bash
#!/bin/bash
# restore.sh

set -e

BACKUP_NAME=$1
S3_BUCKET=${S3_BUCKET}
RESTORE_DIR="/restore"
MYSQL_DATA_DIR="/var/lib/mysql"

if [ -z "$BACKUP_NAME" ]; then
    echo "Usage: $0 <backup-name>"
    exit 1
fi

echo "Restoring backup: ${BACKUP_NAME}"

# Download from S3
if [ -n "$S3_BUCKET" ]; then
    echo "Downloading backup from S3..."
    aws s3 cp s3://${S3_BUCKET}/mysql-backups/${BACKUP_NAME}.tar.gz - | \
        tar xzf - -C ${RESTORE_DIR}
fi

BACKUP_PATH="${RESTORE_DIR}/${BACKUP_NAME}"

# Prepare the backup
echo "Preparing backup..."
xtrabackup --decompress --target-dir=${BACKUP_PATH}
xtrabackup --prepare --target-dir=${BACKUP_PATH}

# Apply incremental backups if any
for inc_backup in ${RESTORE_DIR}/mysql_incremental_*; do
    if [ -d "$inc_backup" ]; then
        echo "Applying incremental backup: $inc_backup"
        xtrabackup --prepare --target-dir=${BACKUP_PATH} \
            --incremental-dir=$inc_backup
    fi
done

# Stop MySQL before restore
echo "Stopping MySQL..."
# This should be done outside the script in Kubernetes

# Copy prepared backup to MySQL data directory
echo "Restoring data files..."
xtrabackup --copy-back --target-dir=${BACKUP_PATH} \
    --datadir=${MYSQL_DATA_DIR}

# Fix permissions
chown -R mysql:mysql ${MYSQL_DATA_DIR}

echo "Restore completed successfully"
```

## Monitoring Backup Health

Create a monitoring sidecar to track backup status:

```yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: backup-monitor
  namespace: database
data:
  monitor.sh: |
    #!/bin/bash
    while true; do
      # Check last backup age
      LAST_BACKUP=$(ls -t /backup/mysql_full_* 2>/dev/null | head -1)
      if [ -n "$LAST_BACKUP" ]; then
        BACKUP_AGE=$(($(date +%s) - $(stat -c %Y "$LAST_BACKUP")))
        BACKUP_AGE_HOURS=$((BACKUP_AGE / 3600))

        echo "Last full backup age: ${BACKUP_AGE_HOURS} hours"

        # Alert if backup is too old (>48 hours)
        if [ $BACKUP_AGE_HOURS -gt 48 ]; then
          echo "WARNING: Last backup is older than 48 hours"
        fi
      else
        echo "WARNING: No backups found"
      fi

      sleep 3600  # Check every hour
    done
```

## Conclusion

Automating MySQL backups on Kubernetes with Percona XtraBackup provides a robust solution for protecting your data. The combination of full and incremental backups reduces storage costs while maintaining quick recovery capabilities. By scheduling backups as CronJobs and storing them in cloud storage, you ensure that your databases can be recovered even in catastrophic scenarios.

Key takeaways:

- Use hot backups to avoid database downtime
- Implement both full and incremental backup strategies
- Store backups in durable cloud storage
- Test restore procedures regularly
- Monitor backup health and age

With this automated backup system in place, you can confidently run production MySQL databases on Kubernetes while maintaining comprehensive disaster recovery capabilities.
