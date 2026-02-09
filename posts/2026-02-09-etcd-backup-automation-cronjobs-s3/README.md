# How to Implement etcd Backup Automation Using Cronjobs and S3 Storage

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: etcd, Kubernetes, Backup, CronJob, S3

Description: Learn how to automate etcd backups with Kubernetes CronJobs and S3 storage. Complete guide covering snapshot creation, encryption, retention policies, and monitoring.

---

The etcd key-value store contains all Kubernetes cluster state, making it the single most critical component to backup. Automated etcd backups protect against cluster failures, configuration errors, and data corruption. By combining Kubernetes CronJobs with S3 storage, you create a reliable, automated backup system that requires minimal maintenance while providing point-in-time recovery capabilities for your entire cluster.

## Understanding etcd Backup Strategy

etcd supports snapshot-based backups that capture the entire database at a specific point in time. These snapshots are consistent and can restore your cluster to the exact state at backup time. Regular automated backups ensure you always have recent recovery points, while S3 storage provides durable, geographically redundant storage for backup files.

A comprehensive backup strategy includes frequent snapshots with appropriate retention policies, secure storage with encryption, and regular restore testing to validate backup integrity.

## Creating an etcd Backup Script

Start with a robust backup script that creates snapshots and uploads to S3:

```bash
#!/bin/bash
# etcd-backup.sh

set -e

# Configuration
ETCD_ENDPOINTS="https://127.0.0.1:2379"
ETCD_CACERT="/etc/kubernetes/pki/etcd/ca.crt"
ETCD_CERT="/etc/kubernetes/pki/etcd/server.crt"
ETCD_KEY="/etc/kubernetes/pki/etcd/server.key"
S3_BUCKET="my-cluster-etcd-backups"
S3_PREFIX="etcd-snapshots"
BACKUP_DIR="/tmp/etcd-backup"
RETENTION_DAYS=30

# Generate backup filename with timestamp
TIMESTAMP=$(date +%Y%m%d-%H%M%S)
BACKUP_FILE="etcd-snapshot-${TIMESTAMP}.db"
BACKUP_PATH="${BACKUP_DIR}/${BACKUP_FILE}"

echo "Starting etcd backup at $(date)"

# Create backup directory
mkdir -p ${BACKUP_DIR}

# Create etcd snapshot
echo "Creating etcd snapshot..."
ETCDCTL_API=3 etcdctl \
  --endpoints=${ETCD_ENDPOINTS} \
  --cacert=${ETCD_CACERT} \
  --cert=${ETCD_CERT} \
  --key=${ETCD_KEY} \
  snapshot save ${BACKUP_PATH}

# Verify snapshot integrity
echo "Verifying snapshot integrity..."
ETCDCTL_API=3 etcdctl snapshot status ${BACKUP_PATH} -w table

# Compress snapshot
echo "Compressing snapshot..."
gzip ${BACKUP_PATH}
BACKUP_PATH="${BACKUP_PATH}.gz"

# Upload to S3
echo "Uploading to S3..."
aws s3 cp ${BACKUP_PATH} s3://${S3_BUCKET}/${S3_PREFIX}/${BACKUP_FILE}.gz \
  --storage-class STANDARD_IA \
  --server-side-encryption AES256

# Verify upload
if aws s3 ls s3://${S3_BUCKET}/${S3_PREFIX}/${BACKUP_FILE}.gz &>/dev/null; then
  echo "Backup uploaded successfully"
else
  echo "ERROR: Failed to verify S3 upload"
  exit 1
fi

# Cleanup old local backups
echo "Cleaning up local backups..."
find ${BACKUP_DIR} -name "etcd-snapshot-*.db.gz" -mtime +1 -delete

# Cleanup old S3 backups
echo "Cleaning up old S3 backups..."
CUTOFF_DATE=$(date -d "${RETENTION_DAYS} days ago" +%Y%m%d)

aws s3 ls s3://${S3_BUCKET}/${S3_PREFIX}/ | while read -r line; do
  FILE_DATE=$(echo $line | awk '{print $4}' | grep -oP '\d{8}' | head -1)
  FILE_NAME=$(echo $line | awk '{print $4}')

  if [ ! -z "$FILE_DATE" ] && [ "$FILE_DATE" -lt "$CUTOFF_DATE" ]; then
    echo "Deleting old backup: ${FILE_NAME}"
    aws s3 rm s3://${S3_BUCKET}/${S3_PREFIX}/${FILE_NAME}
  fi
done

echo "etcd backup completed at $(date)"
exit 0
```

This script creates snapshots, verifies integrity, compresses, and uploads to S3 with automatic cleanup.

## Creating a ConfigMap for the Backup Script

Store the script in a ConfigMap:

```yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: etcd-backup-script
  namespace: kube-system
data:
  backup.sh: |
    #!/bin/bash
    set -e

    ETCD_ENDPOINTS="https://127.0.0.1:2379"
    ETCD_CACERT="/etc/kubernetes/pki/etcd/ca.crt"
    ETCD_CERT="/etc/kubernetes/pki/etcd/server.crt"
    ETCD_KEY="/etc/kubernetes/pki/etcd/server.key"
    S3_BUCKET="${S3_BUCKET:-my-cluster-etcd-backups}"
    S3_PREFIX="${S3_PREFIX:-etcd-snapshots}"
    BACKUP_DIR="/tmp/etcd-backup"
    RETENTION_DAYS="${RETENTION_DAYS:-30}"

    TIMESTAMP=$(date +%Y%m%d-%H%M%S)
    BACKUP_FILE="etcd-snapshot-${TIMESTAMP}.db"
    BACKUP_PATH="${BACKUP_DIR}/${BACKUP_FILE}"

    echo "Starting etcd backup at $(date)"

    mkdir -p ${BACKUP_DIR}

    echo "Creating etcd snapshot..."
    ETCDCTL_API=3 etcdctl \
      --endpoints=${ETCD_ENDPOINTS} \
      --cacert=${ETCD_CACERT} \
      --cert=${ETCD_CERT} \
      --key=${ETCD_KEY} \
      snapshot save ${BACKUP_PATH}

    echo "Verifying snapshot integrity..."
    ETCDCTL_API=3 etcdctl snapshot status ${BACKUP_PATH} -w table

    echo "Compressing snapshot..."
    gzip ${BACKUP_PATH}
    BACKUP_PATH="${BACKUP_PATH}.gz"

    echo "Uploading to S3..."
    aws s3 cp ${BACKUP_PATH} s3://${S3_BUCKET}/${S3_PREFIX}/${BACKUP_FILE}.gz \
      --storage-class STANDARD_IA \
      --server-side-encryption AES256

    if aws s3 ls s3://${S3_BUCKET}/${S3_PREFIX}/${BACKUP_FILE}.gz &>/dev/null; then
      echo "Backup uploaded successfully"
    else
      echo "ERROR: Failed to verify S3 upload"
      exit 1
    fi

    find ${BACKUP_DIR} -name "etcd-snapshot-*.db.gz" -mtime +1 -delete

    CUTOFF_DATE=$(date -d "${RETENTION_DAYS} days ago" +%Y%m%d)

    aws s3 ls s3://${S3_BUCKET}/${S3_PREFIX}/ | while read -r line; do
      FILE_DATE=$(echo $line | awk '{print $4}' | grep -oP '\d{8}' | head -1)
      FILE_NAME=$(echo $line | awk '{print $4}')

      if [ ! -z "$FILE_DATE" ] && [ "$FILE_DATE" -lt "$CUTOFF_DATE" ]; then
        echo "Deleting old backup: ${FILE_NAME}"
        aws s3 rm s3://${S3_BUCKET}/${S3_PREFIX}/${FILE_NAME}
      fi
    done

    echo "etcd backup completed at $(date)"
    exit 0
```

## Creating an AWS Credentials Secret

Store S3 credentials securely:

```yaml
apiVersion: v1
kind: Secret
metadata:
  name: aws-credentials
  namespace: kube-system
type: Opaque
stringData:
  credentials: |
    [default]
    aws_access_key_id = YOUR_ACCESS_KEY_ID
    aws_secret_access_key = YOUR_SECRET_ACCESS_KEY
    region = us-east-1
```

Create the secret from a file:

```bash
kubectl create secret generic aws-credentials \
  --from-file=credentials=/root/.aws/credentials \
  -n kube-system
```

## Implementing the Backup CronJob

Create a CronJob that runs the backup script:

```yaml
apiVersion: batch/v1
kind: CronJob
metadata:
  name: etcd-backup
  namespace: kube-system
spec:
  # Run every 6 hours
  schedule: "0 */6 * * *"
  concurrencyPolicy: Forbid
  successfulJobsHistoryLimit: 3
  failedJobsHistoryLimit: 3
  jobTemplate:
    spec:
      template:
        spec:
          hostNetwork: true
          nodeName: master-node  # Replace with your control plane node name
          containers:
          - name: backup
            image: amazon/aws-cli:latest
            command:
            - /bin/bash
            - /scripts/backup.sh
            env:
            - name: S3_BUCKET
              value: "my-cluster-etcd-backups"
            - name: S3_PREFIX
              value: "etcd-snapshots"
            - name: RETENTION_DAYS
              value: "30"
            - name: AWS_SHARED_CREDENTIALS_FILE
              value: /root/.aws/credentials
            volumeMounts:
            - name: etcd-certs
              mountPath: /etc/kubernetes/pki/etcd
              readOnly: true
            - name: backup-script
              mountPath: /scripts
            - name: aws-credentials
              mountPath: /root/.aws
              readOnly: true
            - name: backup-dir
              mountPath: /tmp/etcd-backup
          volumes:
          - name: etcd-certs
            hostPath:
              path: /etc/kubernetes/pki/etcd
              type: Directory
          - name: backup-script
            configMap:
              name: etcd-backup-script
              defaultMode: 0755
          - name: aws-credentials
            secret:
              secretName: aws-credentials
          - name: backup-dir
            emptyDir: {}
          restartPolicy: OnFailure
```

Apply the CronJob:

```bash
kubectl apply -f etcd-backup-cronjob.yaml
```

## Using a Custom Docker Image

For better control, create a custom Docker image:

```dockerfile
# Dockerfile
FROM alpine:3.19

# Install required tools
RUN apk add --no-cache \
    bash \
    curl \
    gzip \
    aws-cli

# Install etcdctl
ARG ETCD_VERSION=v3.5.11
RUN curl -L https://github.com/etcd-io/etcd/releases/download/${ETCD_VERSION}/etcd-${ETCD_VERSION}-linux-amd64.tar.gz -o etcd.tar.gz && \
    tar xzf etcd.tar.gz && \
    mv etcd-${ETCD_VERSION}-linux-amd64/etcdctl /usr/local/bin/ && \
    rm -rf etcd.tar.gz etcd-${ETCD_VERSION}-linux-amd64

# Copy backup script
COPY backup.sh /usr/local/bin/backup.sh
RUN chmod +x /usr/local/bin/backup.sh

ENTRYPOINT ["/usr/local/bin/backup.sh"]
```

Build and push the image:

```bash
docker build -t myregistry/etcd-backup:latest .
docker push myregistry/etcd-backup:latest
```

Update the CronJob to use the custom image:

```yaml
containers:
- name: backup
  image: myregistry/etcd-backup:latest
```

## Monitoring Backup Success

Create a monitoring script that checks backup freshness:

```bash
#!/bin/bash
# check-etcd-backup.sh

S3_BUCKET="my-cluster-etcd-backups"
S3_PREFIX="etcd-snapshots"
MAX_AGE_HOURS=12

# Get latest backup timestamp
LATEST_BACKUP=$(aws s3 ls s3://${S3_BUCKET}/${S3_PREFIX}/ | sort | tail -n 1 | awk '{print $1, $2}')
LATEST_TIMESTAMP=$(date -d "$LATEST_BACKUP" +%s)
CURRENT_TIMESTAMP=$(date +%s)
AGE_HOURS=$(( ($CURRENT_TIMESTAMP - $LATEST_TIMESTAMP) / 3600 ))

echo "Latest backup age: ${AGE_HOURS} hours"

if [ $AGE_HOURS -gt $MAX_AGE_HOURS ]; then
  echo "ERROR: Latest backup is older than ${MAX_AGE_HOURS} hours"
  exit 1
else
  echo "Backup freshness check passed"
  exit 0
fi
```

## Creating Prometheus Alerts

Monitor backup job status with Prometheus:

```yaml
apiVersion: monitoring.coreos.com/v1
kind: PrometheusRule
metadata:
  name: etcd-backup-alerts
  namespace: kube-system
spec:
  groups:
  - name: etcd-backup
    interval: 60s
    rules:
    - alert: EtcdBackupFailed
      expr: |
        kube_job_status_failed{job_name=~"etcd-backup.*"} > 0
      for: 5m
      labels:
        severity: critical
      annotations:
        summary: "etcd backup job failed"
        description: "The etcd backup job has failed"

    - alert: EtcdBackupMissing
      expr: |
        time() - kube_job_status_completion_time{job_name=~"etcd-backup.*"} > 43200
      labels:
        severity: critical
      annotations:
        summary: "etcd backup is too old"
        description: "No successful etcd backup in the last 12 hours"

    - alert: EtcdBackupDurationHigh
      expr: |
        kube_job_status_completion_time{job_name=~"etcd-backup.*"} -
        kube_job_status_start_time{job_name=~"etcd-backup.*"} > 1800
      labels:
        severity: warning
      annotations:
        summary: "etcd backup taking too long"
        description: "Backup job took over 30 minutes"
```

## Implementing S3 Lifecycle Policies

Configure S3 to automatically manage backup lifecycle:

```json
{
  "Rules": [
    {
      "Id": "etcd-backup-lifecycle",
      "Status": "Enabled",
      "Prefix": "etcd-snapshots/",
      "Transitions": [
        {
          "Days": 30,
          "StorageClass": "GLACIER"
        },
        {
          "Days": 90,
          "StorageClass": "DEEP_ARCHIVE"
        }
      ],
      "Expiration": {
        "Days": 365
      }
    }
  ]
}
```

Apply the lifecycle policy:

```bash
aws s3api put-bucket-lifecycle-configuration \
  --bucket my-cluster-etcd-backups \
  --lifecycle-configuration file://lifecycle.json
```

## Testing Backup and Restore

Regularly test restore procedures:

```bash
#!/bin/bash
# test-etcd-restore.sh

S3_BUCKET="my-cluster-etcd-backups"
S3_PREFIX="etcd-snapshots"
RESTORE_DIR="/tmp/etcd-restore-test"

# Download latest backup
echo "Downloading latest backup..."
LATEST_BACKUP=$(aws s3 ls s3://${S3_BUCKET}/${S3_PREFIX}/ | sort | tail -n 1 | awk '{print $4}')
aws s3 cp s3://${S3_BUCKET}/${S3_PREFIX}/${LATEST_BACKUP} ${RESTORE_DIR}/${LATEST_BACKUP}

# Decompress
gunzip ${RESTORE_DIR}/${LATEST_BACKUP}
SNAPSHOT_FILE=${RESTORE_DIR}/${LATEST_BACKUP%.gz}

# Verify snapshot
echo "Verifying snapshot..."
ETCDCTL_API=3 etcdctl snapshot status ${SNAPSHOT_FILE} -w table

if [ $? -eq 0 ]; then
  echo "Snapshot verification successful"
  rm -rf ${RESTORE_DIR}
  exit 0
else
  echo "ERROR: Snapshot verification failed"
  exit 1
fi
```

Schedule regular restore tests:

```yaml
apiVersion: batch/v1
kind: CronJob
metadata:
  name: etcd-restore-test
  namespace: kube-system
spec:
  schedule: "0 0 1 * *"  # Monthly
  jobTemplate:
    spec:
      template:
        spec:
          containers:
          - name: test
            image: myregistry/etcd-backup:latest
            command:
            - /scripts/test-etcd-restore.sh
            volumeMounts:
            - name: test-script
              mountPath: /scripts
            - name: aws-credentials
              mountPath: /root/.aws
          volumes:
          - name: test-script
            configMap:
              name: etcd-restore-test-script
              defaultMode: 0755
          - name: aws-credentials
            secret:
              secretName: aws-credentials
          restartPolicy: OnFailure
```

## Conclusion

Automated etcd backups with CronJobs and S3 storage provide reliable disaster recovery for your Kubernetes cluster. Implement frequent snapshots with appropriate retention policies, store backups in durable object storage with encryption, and monitor backup freshness through Prometheus alerts. Regular restore testing validates backup integrity and ensures your team can confidently recover from cluster failures. Combined with proper S3 lifecycle policies and geographic replication, this backup strategy protects your cluster state data against hardware failures, human errors, and site-level disasters.
