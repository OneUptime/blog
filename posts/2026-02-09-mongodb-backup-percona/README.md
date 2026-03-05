# How to Implement MongoDB Backup and Restore Using Percona Backup for MongoDB

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MongoDB, Backup, Percona, Kubernetes, Database

Description: Learn how to implement comprehensive MongoDB backup and restore workflows using Percona Backup for MongoDB on Kubernetes with point-in-time recovery and cloud storage integration.

---

Data loss is catastrophic for any organization. MongoDB backups protect against hardware failures, human errors, and disaster scenarios. Percona Backup for MongoDB (PBM) provides enterprise-grade backup capabilities specifically designed for MongoDB replica sets and sharded clusters, with support for point-in-time recovery and cloud storage backends.

In this guide, we'll implement automated MongoDB backups using Percona Backup for MongoDB on Kubernetes. We'll cover installation, backup strategies, restore procedures, and monitoring best practices.

## Understanding Percona Backup for MongoDB

Percona Backup for MongoDB is an open-source backup solution that provides:

- Logical and physical backup support
- Point-in-time recovery with oplog replay
- Incremental backups to reduce storage costs
- Distributed backup for sharded clusters
- Cloud storage integration (S3, Azure, GCS)
- Backup compression and encryption

PBM runs as agents on each MongoDB node and coordinates through a control database stored in MongoDB itself.

## Installing PBM on Kubernetes MongoDB

First, install PBM agents alongside your MongoDB deployment:

```yaml
# pbm-configmap.yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: pbm-config
  namespace: mongodb
data:
  pbm-config.yaml: |
    storage:
      type: s3
      s3:
        region: us-east-1
        bucket: mongodb-backups
        prefix: production-cluster
        credentials:
          access-key-id: ${AWS_ACCESS_KEY_ID}
          secret-access-key: ${AWS_SECRET_ACCESS_KEY}
        serverSideEncryption:
          sseAlgorithm: aws:kms
          kmsKeyID: arn:aws:kms:us-east-1:123456789:key/abcd-1234

    pitr:
      enabled: true
      oplogSpanMin: 10

    restore:
      batchSize: 500
      numInsertionWorkers: 10
---
apiVersion: v1
kind: Secret
metadata:
  name: pbm-s3-credentials
  namespace: mongodb
type: Opaque
stringData:
  AWS_ACCESS_KEY_ID: "your-access-key-id"
  AWS_SECRET_ACCESS_KEY: "your-secret-access-key"
```

Modify your MongoDB StatefulSet to include PBM agent:

```yaml
# mongodb-with-pbm.yaml
apiVersion: apps/v1
kind: StatefulSet
metadata:
  name: mongodb-replica
  namespace: mongodb
spec:
  serviceName: mongodb-svc
  replicas: 3
  selector:
    matchLabels:
      app: mongodb
  template:
    metadata:
      labels:
        app: mongodb
    spec:
      containers:
      # MongoDB container
      - name: mongod
        image: percona/percona-server-mongodb:6.0
        ports:
        - containerPort: 27017
        env:
        - name: MONGODB_REPLSET
          value: "rs0"
        volumeMounts:
        - name: mongodb-data
          mountPath: /data/db
        resources:
          requests:
            cpu: "2000m"
            memory: "4Gi"
          limits:
            cpu: "4000m"
            memory: "8Gi"

      # PBM Agent container
      - name: pbm-agent
        image: percona/percona-backup-mongodb:2.3.0
        env:
        - name: PBM_MONGODB_URI
          value: "mongodb://pbm-user:pbm-password@localhost:27017/?replSetName=rs0"
        - name: AWS_ACCESS_KEY_ID
          valueFrom:
            secretKeyRef:
              name: pbm-s3-credentials
              key: AWS_ACCESS_KEY_ID
        - name: AWS_SECRET_ACCESS_KEY
          valueFrom:
            secretKeyRef:
              name: pbm-s3-credentials
              key: AWS_SECRET_ACCESS_KEY
        volumeMounts:
        - name: pbm-config
          mountPath: /etc/pbm
        resources:
          requests:
            cpu: "500m"
            memory: "512Mi"
          limits:
            cpu: "1000m"
            memory: "1Gi"
        command:
          - pbm-agent
        args:
          - --config-file=/etc/pbm/pbm-config.yaml

      volumes:
      - name: pbm-config
        configMap:
          name: pbm-config

  volumeClaimTemplates:
  - metadata:
      name: mongodb-data
    spec:
      accessModes: ["ReadWriteOnce"]
      storageClassName: fast-ssd
      resources:
        requests:
          storage: 500Gi
```

## Configuring PBM Users and Permissions

Create a dedicated user for PBM operations:

```javascript
// Connect to MongoDB primary
use admin

// Create PBM user with required permissions
db.createUser({
  user: "pbm-user",
  pwd: "pbm-password",
  roles: [
    { role: "readWrite", db: "admin" },
    { role: "clusterMonitor", db: "admin" },
    { role: "restore", db: "admin" },
    { role: "backup", db: "admin" },
    { role: "readAnyDatabase", db: "admin" }
  ]
})

// Grant additional privileges
db.grantRolesToUser("pbm-user", [
  { role: "pbmAnyAction", db: "admin" }
])
```

## Configuring Storage Backend

Set up PBM configuration for different storage backends:

```bash
# For AWS S3
pbm config --set storage.type=s3 \
  --set storage.s3.region=us-east-1 \
  --set storage.s3.bucket=mongodb-backups \
  --set storage.s3.prefix=prod-cluster

# For Azure Blob Storage
pbm config --set storage.type=azure \
  --set storage.azure.account=mystorageaccount \
  --set storage.azure.container=mongodb-backups \
  --set storage.azure.prefix=prod-cluster

# For Google Cloud Storage
pbm config --set storage.type=gcs \
  --set storage.gcs.bucket=mongodb-backups \
  --set storage.gcs.prefix=prod-cluster

# For filesystem (not recommended for production)
pbm config --set storage.type=filesystem \
  --set storage.filesystem.path=/backup
```

## Creating Backup Scripts

Create a backup management script:

```bash
#!/bin/bash
# pbm-backup.sh

set -e

BACKUP_TYPE=${BACKUP_TYPE:-snapshot}
NAMESPACE=${NAMESPACE:-mongodb}
MONGODB_URI=${MONGODB_URI:-"mongodb://pbm-user:pbm-password@mongodb-svc.mongodb.svc.cluster.local:27017/?replSetName=rs0"}

export PBM_MONGODB_URI=$MONGODB_URI

# Function to create snapshot backup
create_snapshot() {
    echo "Creating snapshot backup..."
    BACKUP_NAME=$(pbm backup --type=logical --compression=s2 --wait)
    echo "Backup completed: $BACKUP_NAME"

    # Store backup name for reference
    kubectl create configmap pbm-latest-backup \
      --from-literal=backup-name="$BACKUP_NAME" \
      -n $NAMESPACE \
      --dry-run=client -o yaml | kubectl apply -f -
}

# Function to create physical backup
create_physical() {
    echo "Creating physical backup..."
    BACKUP_NAME=$(pbm backup --type=physical --compression=s2 --wait)
    echo "Physical backup completed: $BACKUP_NAME"
}

# Function to create incremental backup
create_incremental() {
    echo "Creating incremental backup..."

    # Find base backup
    BASE_BACKUP=$(pbm list --full | grep "snapshot" | head -1 | awk '{print $1}')

    if [ -z "$BASE_BACKUP" ]; then
        echo "No base backup found. Creating full backup instead..."
        create_snapshot
        return
    fi

    echo "Creating incremental backup based on: $BASE_BACKUP"
    BACKUP_NAME=$(pbm backup --type=incremental --base=$BASE_BACKUP --wait)
    echo "Incremental backup completed: $BACKUP_NAME"
}

# Main execution
case $BACKUP_TYPE in
    snapshot)
        create_snapshot
        ;;
    physical)
        create_physical
        ;;
    incremental)
        create_incremental
        ;;
    *)
        echo "Unknown backup type: $BACKUP_TYPE"
        echo "Supported types: snapshot, physical, incremental"
        exit 1
        ;;
esac

# List all backups
echo ""
echo "Current backups:"
pbm list
```

Make the script executable and build a container:

```dockerfile
# Dockerfile
FROM percona/percona-backup-mongodb:2.3.0

COPY pbm-backup.sh /usr/local/bin/pbm-backup.sh
RUN chmod +x /usr/local/bin/pbm-backup.sh

CMD ["/usr/local/bin/pbm-backup.sh"]
```

## Scheduling Automated Backups

Create CronJobs for regular backups:

```yaml
# pbm-backup-cronjobs.yaml
apiVersion: batch/v1
kind: CronJob
metadata:
  name: mongodb-snapshot-backup
  namespace: mongodb
spec:
  # Daily at 2 AM
  schedule: "0 2 * * *"
  successfulJobsHistoryLimit: 7
  failedJobsHistoryLimit: 3
  jobTemplate:
    spec:
      template:
        spec:
          restartPolicy: OnFailure
          containers:
          - name: pbm-backup
            image: your-registry/pbm-backup:latest
            env:
            - name: BACKUP_TYPE
              value: "snapshot"
            - name: NAMESPACE
              value: "mongodb"
            - name: PBM_MONGODB_URI
              valueFrom:
                secretKeyRef:
                  name: pbm-connection
                  key: uri
            - name: AWS_ACCESS_KEY_ID
              valueFrom:
                secretKeyRef:
                  name: pbm-s3-credentials
                  key: AWS_ACCESS_KEY_ID
            - name: AWS_SECRET_ACCESS_KEY
              valueFrom:
                secretKeyRef:
                  name: pbm-s3-credentials
                  key: AWS_SECRET_ACCESS_KEY
---
apiVersion: batch/v1
kind: CronJob
metadata:
  name: mongodb-incremental-backup
  namespace: mongodb
spec:
  # Every 6 hours
  schedule: "0 */6 * * *"
  successfulJobsHistoryLimit: 7
  failedJobsHistoryLimit: 3
  jobTemplate:
    spec:
      template:
        spec:
          restartPolicy: OnFailure
          containers:
          - name: pbm-backup
            image: your-registry/pbm-backup:latest
            env:
            - name: BACKUP_TYPE
              value: "incremental"
            - name: NAMESPACE
              value: "mongodb"
            - name: PBM_MONGODB_URI
              valueFrom:
                secretKeyRef:
                  name: pbm-connection
                  key: uri
            - name: AWS_ACCESS_KEY_ID
              valueFrom:
                secretKeyRef:
                  name: pbm-s3-credentials
                  key: AWS_ACCESS_KEY_ID
            - name: AWS_SECRET_ACCESS_KEY
              valueFrom:
                secretKeyRef:
                  name: pbm-s3-credentials
                  key: AWS_SECRET_ACCESS_KEY
```

## Enabling Point-in-Time Recovery

Enable PITR for continuous oplog archiving:

```bash
# Enable PITR
pbm config --set pitr.enabled=true

# Set oplog span (minimum time between slices)
pbm config --set pitr.oplogSpanMin=10

# Start PITR
pbm backup --type=oplog

# Verify PITR is running
pbm status
```

## Restoring from Backups

Create a restore script:

```bash
#!/bin/bash
# pbm-restore.sh

set -e

BACKUP_NAME=${BACKUP_NAME}
RESTORE_TO_TIME=${RESTORE_TO_TIME}
NAMESPACE=${NAMESPACE:-mongodb}

export PBM_MONGODB_URI=${PBM_MONGODB_URI}

if [ -z "$BACKUP_NAME" ] && [ -z "$RESTORE_TO_TIME" ]; then
    echo "Error: Either BACKUP_NAME or RESTORE_TO_TIME must be specified"
    exit 1
fi

# List available backups
echo "Available backups:"
pbm list

if [ -n "$RESTORE_TO_TIME" ]; then
    # Point-in-time restore
    echo "Performing point-in-time restore to: $RESTORE_TO_TIME"
    pbm restore --time="$RESTORE_TO_TIME" --wait
else
    # Snapshot restore
    echo "Restoring from backup: $BACKUP_NAME"
    pbm restore $BACKUP_NAME --wait
fi

# Verify restore
echo "Restore completed. Checking status..."
pbm status

# Run database validation
mongo $PBM_MONGODB_URI --eval "
    db.adminCommand({ listDatabases: 1 }).databases.forEach(function(database) {
        if (database.name !== 'admin' && database.name !== 'local' && database.name !== 'config') {
            print('Validating database: ' + database.name);
            var result = db.getSiblingDB(database.name).runCommand({ dbStats: 1 });
            print('Collections: ' + result.collections);
            print('Data size: ' + result.dataSize);
        }
    });
"

echo "Restore validation complete"
```

## Monitoring Backup Health

Create a monitoring script:

```bash
#!/bin/bash
# pbm-monitor.sh

export PBM_MONGODB_URI=${PBM_MONGODB_URI}

# Check PBM status
echo "=== PBM Status ==="
pbm status

# Check last backup
echo ""
echo "=== Recent Backups ==="
pbm list | head -10

# Check PITR status
echo ""
echo "=== PITR Status ==="
pbm status | grep -A 10 "PITR"

# Check backup age
LAST_BACKUP_TIME=$(pbm list --full | grep "snapshot" | head -1 | awk '{print $2, $3}')
if [ -n "$LAST_BACKUP_TIME" ]; then
    LAST_BACKUP_EPOCH=$(date -d "$LAST_BACKUP_TIME" +%s)
    CURRENT_EPOCH=$(date +%s)
    AGE_HOURS=$(( ($CURRENT_EPOCH - $LAST_BACKUP_EPOCH) / 3600 ))

    echo ""
    echo "=== Backup Age ==="
    echo "Last backup: $AGE_HOURS hours ago"

    if [ $AGE_HOURS -gt 48 ]; then
        echo "WARNING: Last backup is older than 48 hours!"
    fi
fi

# Check storage usage
echo ""
echo "=== Storage Usage ==="
pbm list --size
```

Deploy as a CronJob:

```yaml
apiVersion: batch/v1
kind: CronJob
metadata:
  name: pbm-monitor
  namespace: mongodb
spec:
  schedule: "*/30 * * * *"  # Every 30 minutes
  jobTemplate:
    spec:
      template:
        spec:
          restartPolicy: OnFailure
          containers:
          - name: monitor
            image: your-registry/pbm-backup:latest
            command: ["/bin/bash", "-c"]
            args:
              - |
                /usr/local/bin/pbm-monitor.sh
            env:
            - name: PBM_MONGODB_URI
              valueFrom:
                secretKeyRef:
                  name: pbm-connection
                  key: uri
```

## Testing Restore Procedures

Regularly test restore procedures:

```bash
# Create test namespace
kubectl create namespace mongodb-restore-test

# Deploy clean MongoDB instance
kubectl apply -f mongodb-statefulset.yaml -n mongodb-restore-test

# Run restore
BACKUP_NAME=$(pbm list --full | grep "snapshot" | head -1 | awk '{print $1}')

kubectl run pbm-restore \
  --image=your-registry/pbm-backup:latest \
  --env="BACKUP_NAME=$BACKUP_NAME" \
  --env="PBM_MONGODB_URI=mongodb://pbm-user:pbm-password@mongodb-svc.mongodb-restore-test:27017/?replSetName=rs0" \
  -n mongodb-restore-test \
  --command -- /usr/local/bin/pbm-restore.sh

# Verify data
kubectl exec -it mongodb-0 -n mongodb-restore-test -- mongo --eval "db.adminCommand({ listDatabases: 1 })"
```

## Conclusion

Percona Backup for MongoDB provides enterprise-grade backup capabilities for MongoDB on Kubernetes. The combination of logical backups, incremental backups, and point-in-time recovery ensures comprehensive data protection for production workloads.

Essential backup practices:

- Schedule regular full and incremental backups
- Enable PITR for granular recovery options
- Store backups in durable cloud storage
- Test restore procedures regularly
- Monitor backup health and age
- Implement backup retention policies

With PBM deployed alongside MongoDB on Kubernetes, you have a robust disaster recovery solution that protects against data loss while minimizing storage costs through compression and incremental backups.
