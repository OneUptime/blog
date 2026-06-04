# How to Configure CockroachDB Backup Schedules with Full and Incremental Backups

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: CockroachDB, Backup, Kubernetes, Database, Recovery

Description: Learn how to implement comprehensive CockroachDB backup strategies on Kubernetes with scheduled full and incremental backups, point-in-time recovery, and cloud storage integration.

---

Database backups are essential insurance against data loss, corruption, and disaster scenarios. CockroachDB provides enterprise-grade backup capabilities with support for full backups, incremental backups, and point-in-time recovery. When running on Kubernetes, automated backup schedules ensure your data remains protected without manual intervention.

In this guide, we'll implement comprehensive backup strategies for CockroachDB on Kubernetes. We'll cover backup scheduling, incremental backups, restore procedures, and monitoring best practices.

## Understanding CockroachDB Backup Types

CockroachDB offers several backup options:

**Full Backups**: Complete snapshot of database at a point in time. Serves as baseline for incremental backups.

**Incremental Backups**: Captures only changes since last backup (full or incremental). Reduces storage costs and backup duration.

**Revision History**: Maintains historical data for point-in-time recovery to any timestamp within retention window.

Most production deployments use a combination: daily full backups with hourly incrementals.

## Setting Up Cloud Storage Backend

Configure S3-compatible storage for backups:

```yaml
# backup-storage-secret.yaml

apiVersion: v1
kind: Secret
metadata:
  name: backup-storage-credentials
  namespace: cockroachdb
type: Opaque
stringData:
  AWS_ACCESS_KEY_ID: "your-access-key"
  AWS_SECRET_ACCESS_KEY: "your-secret-key"
  BACKUP_URI: "s3://cockroachdb-backups/cluster-prod/full?AWS_ACCESS_KEY_ID=xxx&AWS_SECRET_ACCESS_KEY=xxx&AWS_REGION=us-east-1"
```

Apply the secret:

```bash
kubectl apply -f backup-storage-secret.yaml
```

## Creating Full Backup Jobs

Deploy a full backup CronJob:

```yaml
# full-backup-cronjob.yaml
apiVersion: batch/v1
kind: CronJob
metadata:
  name: cockroachdb-full-backup
  namespace: cockroachdb
spec:
  schedule: "0 2 * * *"  # Daily at 2 AM
  successfulJobsHistoryLimit: 7
  failedJobsHistoryLimit: 3
  concurrencyPolicy: Forbid
  jobTemplate:
    spec:
      template:
        spec:
          serviceAccountName: cockroachdb-backup
          containers:
          - name: backup
            image: cockroachdb/cockroach:v26.2.1
            command:
              - /bin/bash
              - -c
              - |
                set -e
                
                echo "Starting full backup at $(date)"
                
                # Get backup URI from secret
                BACKUP_URI=$(cat /secrets/BACKUP_URI)
                
                # Perform full backup with revision history
                JOB_ID=$(cockroach sql \
                  --url "postgresql://root@cockroachdb-public:26257/defaultdb?sslmode=verify-full&sslcert=/cockroach-certs/client.root.crt&sslkey=/cockroach-certs/client.root.key&sslrootcert=/cockroach-certs/ca.crt" \
                  --execute="BACKUP DATABASE movr INTO '${BACKUP_URI}' AS OF SYSTEM TIME '-10s' WITH revision_history, detached;" \
                  --format=tsv | tail -1)
                
                echo "Full backup initiated successfully as job ${JOB_ID}"
                
                # Monitor backup progress
                while true; do
                  STATUS=$(cockroach sql \
                    --url "postgresql://root@cockroachdb-public:26257/defaultdb?sslmode=verify-full&sslcert=/cockroach-certs/client.root.crt&sslkey=/cockroach-certs/client.root.key&sslrootcert=/cockroach-certs/ca.crt" \
                    --execute="SELECT status FROM [SHOW JOBS] WHERE job_id = ${JOB_ID};" --format=tsv | tail -1)
                  
                  if echo "$STATUS" | grep -q "succeeded"; then
                    echo "Backup completed successfully"
                    break
                  elif echo "$STATUS" | grep -q "failed\|canceled"; then
                    echo "Backup failed"
                    exit 1
                  fi
                  
                  sleep 30
                done
                
                echo "Full backup completed at $(date)"
            volumeMounts:
            - name: client-certs
              mountPath: /cockroach-certs
            - name: backup-credentials
              mountPath: /secrets
            resources:
              requests:
                cpu: 500m
                memory: 512Mi
              limits:
                cpu: 1000m
                memory: 1Gi
          volumes:
          - name: client-certs
            secret:
              secretName: cockroachdb-client-root
          - name: backup-credentials
            secret:
              secretName: backup-storage-credentials
          restartPolicy: OnFailure
```

## Implementing Incremental Backups

Create incremental backup schedule:

```yaml
# incremental-backup-cronjob.yaml
apiVersion: batch/v1
kind: CronJob
metadata:
  name: cockroachdb-incremental-backup
  namespace: cockroachdb
spec:
  schedule: "0 */4 * * *"  # Every 4 hours
  successfulJobsHistoryLimit: 24
  failedJobsHistoryLimit: 5
  concurrencyPolicy: Forbid
  jobTemplate:
    spec:
      template:
        spec:
          serviceAccountName: cockroachdb-backup
          containers:
          - name: incremental-backup
            image: cockroachdb/cockroach:v26.2.1
            command:
              - /bin/bash
              - -c
              - |
                set -e
                
                echo "Starting incremental backup at $(date)"
                
                BACKUP_URI=$(cat /secrets/BACKUP_URI)
                
                # Check if full backup exists
                FULL_BACKUP_EXISTS=$(cockroach sql \
                  --url "postgresql://root@cockroachdb-public:26257/defaultdb?sslmode=verify-full&sslcert=/cockroach-certs/client.root.crt&sslkey=/cockroach-certs/client.root.key&sslrootcert=/cockroach-certs/ca.crt" \
                  --execute="SHOW BACKUP FROM LATEST IN '${BACKUP_URI}';" --format=tsv 2>&1 || echo "none")
                
                if echo "$FULL_BACKUP_EXISTS" | grep -q "none\|error"; then
                  echo "No full backup found. Run full backup first."
                  exit 1
                fi
                
                # Perform incremental backup
                JOB_ID=$(cockroach sql \
                  --url "postgresql://root@cockroachdb-public:26257/defaultdb?sslmode=verify-full&sslcert=/cockroach-certs/client.root.crt&sslkey=/cockroach-certs/client.root.key&sslrootcert=/cockroach-certs/ca.crt" \
                  --execute="BACKUP DATABASE movr INTO LATEST IN '${BACKUP_URI}' AS OF SYSTEM TIME '-10s' WITH revision_history, detached;" \
                  --format=tsv | tail -1)
                
                echo "Incremental backup initiated successfully as job ${JOB_ID}"
                
                # Monitor backup progress
                while true; do
                  STATUS=$(cockroach sql \
                    --url "postgresql://root@cockroachdb-public:26257/defaultdb?sslmode=verify-full&sslcert=/cockroach-certs/client.root.crt&sslkey=/cockroach-certs/client.root.key&sslrootcert=/cockroach-certs/ca.crt" \
                    --execute="SELECT status FROM [SHOW JOBS] WHERE job_id = ${JOB_ID};" --format=tsv | tail -1)
                  
                  if echo "$STATUS" | grep -q "succeeded"; then
                    echo "Incremental backup completed successfully"
                    break
                  elif echo "$STATUS" | grep -q "failed\|canceled"; then
                    echo "Incremental backup failed"
                    exit 1
                  fi
                  
                  sleep 30
                done
                
                echo "Incremental backup completed at $(date)"
            volumeMounts:
            - name: client-certs
              mountPath: /cockroach-certs
            - name: backup-credentials
              mountPath: /secrets
            resources:
              requests:
                cpu: 500m
                memory: 512Mi
              limits:
                cpu: 1000m
                memory: 1Gi
          volumes:
          - name: client-certs
            secret:
              secretName: cockroachdb-client-root
          - name: backup-credentials
            secret:
              secretName: backup-storage-credentials
          restartPolicy: OnFailure
```

## Using Native Backup Schedules

CockroachDB has built-in backup scheduling:

```sql
-- Connect to CockroachDB
cockroach sql --url "postgresql://root@cockroachdb-public:26257/defaultdb?sslmode=verify-full"

-- Create scheduled backups with incrementals every 4 hours and full backups daily at 2 AM UTC
CREATE SCHEDULE movr_backup_schedule
FOR BACKUP DATABASE movr
INTO 's3://cockroachdb-backups/scheduled?AWS_ACCESS_KEY_ID=xxx&AWS_SECRET_ACCESS_KEY=xxx'
WITH revision_history
RECURRING '0 */4 * * *'
FULL BACKUP '0 2 * * *'
WITH SCHEDULE OPTIONS first_run = 'now';

-- View scheduled backups
SHOW SCHEDULES;

-- Pause a schedule
PAUSE SCHEDULE 123456789;

-- Resume a schedule
RESUME SCHEDULE 123456789;

-- Drop a schedule
DROP SCHEDULE 123456789;
```

## Implementing Point-in-Time Recovery

Restore to specific timestamp:

```sql
-- View available backups
SHOW BACKUP FROM LATEST IN 's3://cockroachdb-backups/scheduled?AWS_ACCESS_KEY_ID=xxx&AWS_SECRET_ACCESS_KEY=xxx';

-- Restore to specific time
RESTORE DATABASE movr
FROM LATEST IN 's3://cockroachdb-backups/scheduled?AWS_ACCESS_KEY_ID=xxx&AWS_SECRET_ACCESS_KEY=xxx'
AS OF SYSTEM TIME '2026-02-08 14:30:00';

-- Restore specific tables
RESTORE TABLE movr.users, movr.rides
FROM LATEST IN 's3://cockroachdb-backups/scheduled?AWS_ACCESS_KEY_ID=xxx&AWS_SECRET_ACCESS_KEY=xxx';

-- Restore with new database name
RESTORE DATABASE movr
FROM LATEST IN 's3://cockroachdb-backups/scheduled?AWS_ACCESS_KEY_ID=xxx&AWS_SECRET_ACCESS_KEY=xxx'
WITH new_db_name = 'movr_restored';
```

## Creating Restore Procedures

Build restore automation:

```bash
#!/bin/bash
# restore-cockroachdb.sh

set -e

BACKUP_LOCATION=$1
RESTORE_TIME=${2:-"LATEST"}
DATABASE=${3:-"movr"}

if [ -z "$BACKUP_LOCATION" ]; then
    echo "Usage: $0 <backup-location> [restore-time] [database]"
    exit 1
fi

echo "Starting restore from $BACKUP_LOCATION"

if [ "$RESTORE_TIME" = "LATEST" ]; then
    RESTORE_SQL="RESTORE DATABASE $DATABASE FROM LATEST IN '$BACKUP_LOCATION' WITH detached;"
else
    RESTORE_SQL="RESTORE DATABASE $DATABASE FROM LATEST IN '$BACKUP_LOCATION' AS OF SYSTEM TIME '$RESTORE_TIME' WITH detached;"
fi

# Execute restore
JOB_ID=$(kubectl exec cockroachdb-0 -n cockroachdb -- \
    cockroach sql \
    --url "postgresql://root@localhost:26257/defaultdb?sslmode=verify-full" \
    --execute="$RESTORE_SQL" \
    --format=tsv | tail -1)

echo "Restore initiated as job $JOB_ID. Monitoring progress..."

# Monitor restore job
while true; do
    STATUS=$(kubectl exec cockroachdb-0 -n cockroachdb -- \
        cockroach sql \
        --url "postgresql://root@localhost:26257/defaultdb?sslmode=verify-full" \
        --execute="SELECT status FROM [SHOW JOBS] WHERE job_id = $JOB_ID;" \
        --format=tsv | tail -1)
    
    echo "Restore status: $STATUS"
    
    if echo "$STATUS" | grep -q "succeeded"; then
        echo "Restore completed successfully"
        break
    elif echo "$STATUS" | grep -q "failed\|canceled"; then
        echo "Restore failed"
        exit 1
    fi
    
    sleep 10
done
```

## Monitoring Backup Operations

Track backup health and status:

```sql
-- View running backup jobs
SELECT job_id, status, fraction_completed, running_status
FROM [SHOW JOBS]
WHERE job_type = 'BACKUP' AND status = 'running';

-- View recent backup history
SELECT job_id, status, created, finished, description
FROM [SHOW JOBS]
WHERE job_type = 'BACKUP'
ORDER BY created DESC
LIMIT 10;

-- Check backup size
SHOW BACKUP FROM LATEST IN 's3://cockroachdb-backups/scheduled?AWS_ACCESS_KEY_ID=xxx&AWS_SECRET_ACCESS_KEY=xxx';

-- View backup details with revision history
SHOW BACKUPS IN 's3://cockroachdb-backups/scheduled?AWS_ACCESS_KEY_ID=xxx&AWS_SECRET_ACCESS_KEY=xxx'
WITH REVISION START TIME;
```

## Implementing Backup Validation

Verify backup integrity regularly:

```bash
#!/bin/bash
# validate-backups.sh

BACKUP_URI="s3://cockroachdb-backups/scheduled?AWS_ACCESS_KEY_ID=xxx&AWS_SECRET_ACCESS_KEY=xxx"

echo "Validating backups..."

# Show backup metadata
kubectl exec cockroachdb-0 -n cockroachdb -- \
    cockroach sql \
    --url "postgresql://root@localhost:26257/defaultdb?sslmode=verify-full" \
    --execute="SHOW BACKUP FROM LATEST IN '$BACKUP_URI';"

# Check for corruption
kubectl exec cockroachdb-0 -n cockroachdb -- \
    cockroach sql \
    --url "postgresql://root@localhost:26257/defaultdb?sslmode=verify-full" \
    --execute="SHOW BACKUP FROM LATEST IN '$BACKUP_URI' WITH check_files;"

echo "Backup validation complete"
```

## Conclusion

Implementing comprehensive backup strategies for CockroachDB on Kubernetes ensures data durability and enables quick recovery from failures. The combination of full and incremental backups with revision history provides flexible recovery options while minimizing storage costs.

Key best practices:

- Schedule daily full backups during off-peak hours
- Use incremental backups for frequent snapshots
- Enable revision history for point-in-time recovery
- Store backups in durable cloud storage across regions
- Monitor backup job completion and failures
- Test restore procedures regularly
- Validate backup integrity periodically

With proper backup automation, you can maintain comprehensive disaster recovery capabilities for your CockroachDB deployments on Kubernetes while meeting recovery time and point objectives for production workloads.
