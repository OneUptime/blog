# How to Implement Redis Persistence with AOF and RDB Snapshots on Kubernetes

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Redis, Kubernetes, Persistence, Backup, Database

Description: Learn how to configure Redis persistence using AOF and RDB snapshots on Kubernetes for data durability with automatic backups, recovery strategies, and performance optimization.

---

Redis is often considered an in-memory database, but data durability matters for many use cases. Redis provides two persistence mechanisms: RDB (Redis Database) snapshots and AOF (Append Only File) logs. When running Redis on Kubernetes, properly configured persistence ensures your data survives pod restarts and failures.

This guide covers implementing Redis persistence with both AOF and RDB on Kubernetes. We'll explore configuration strategies, backup workflows, and recovery procedures for production deployments.

## Understanding Redis Persistence Options

Redis offers two persistence mechanisms that can be used together:

**RDB Snapshots**: Point-in-time snapshots saved to disk at specified intervals. Fast to load but may lose recent data between snapshots.

**AOF (Append Only File)**: Logs every write operation. More durable but slower to load and larger file sizes.

Most production deployments use both: RDB for fast restarts and AOF for durability.

## Configuring RDB Snapshots

Deploy Redis with RDB snapshot configuration:

```yaml
# redis-rdb.yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: redis-rdb-config
  namespace: redis
data:
  redis.conf: |
    # Network
    bind 0.0.0.0
    protected-mode yes
    port 6379
    requirepass ${REDIS_PASSWORD}

    # General
    daemonize no
    supervised no
    loglevel notice

    # RDB Configuration
    # Save after 900 sec (15 min) if at least 1 key changed
    save 900 1
    # Save after 300 sec (5 min) if at least 10 keys changed
    save 300 10
    # Save after 60 sec if at least 10000 keys changed
    save 60 10000

    # Stop accepting writes if RDB save fails
    stop-writes-on-bgsave-error yes

    # Compress RDB files
    rdbcompression yes

    # Checksum RDB files
    rdbchecksum yes

    # RDB filename
    dbfilename dump.rdb

    # Working directory
    dir /data

    # Memory management
    maxmemory 2gb
    maxmemory-policy allkeys-lru

    # Disable AOF for this example
    appendonly no
---
apiVersion: apps/v1
kind: StatefulSet
metadata:
  name: redis-rdb
  namespace: redis
spec:
  serviceName: redis-rdb
  replicas: 1
  selector:
    matchLabels:
      app: redis-rdb
  template:
    metadata:
      labels:
        app: redis-rdb
    spec:
      initContainers:
      - name: config
        image: redis:7.0-alpine
        command:
          - sh
          - -c
          - |
            cp /readonly-config/redis.conf /data/redis.conf
            sed -i "s/\${REDIS_PASSWORD}/$REDIS_PASSWORD/g" /data/redis.conf
        env:
        - name: REDIS_PASSWORD
          valueFrom:
            secretKeyRef:
              name: redis-password
              key: password
        volumeMounts:
        - name: config
          mountPath: /readonly-config
        - name: data
          mountPath: /data

      containers:
      - name: redis
        image: redis:7.0-alpine
        command:
          - redis-server
          - /data/redis.conf
        ports:
        - containerPort: 6379
          name: redis
        volumeMounts:
        - name: data
          mountPath: /data
        resources:
          requests:
            cpu: 1000m
            memory: 2Gi
          limits:
            cpu: 2000m
            memory: 4Gi
        livenessProbe:
          tcpSocket:
            port: 6379
          initialDelaySeconds: 30
          periodSeconds: 10
        readinessProbe:
          exec:
            command:
            - sh
            - -c
            - redis-cli -a $REDIS_PASSWORD ping
          initialDelaySeconds: 10
          periodSeconds: 5
          env:
          - name: REDIS_PASSWORD
            valueFrom:
              secretKeyRef:
                name: redis-password
                key: password

      volumes:
      - name: config
        configMap:
          name: redis-rdb-config

  volumeClaimTemplates:
  - metadata:
      name: data
    spec:
      accessModes: ["ReadWriteOnce"]
      storageClassName: fast-ssd
      resources:
        requests:
          storage: 50Gi
```

## Configuring AOF Persistence

Deploy Redis with AOF configuration:

```yaml
# redis-aof.yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: redis-aof-config
  namespace: redis
data:
  redis.conf: |
    bind 0.0.0.0
    protected-mode yes
    port 6379
    requirepass ${REDIS_PASSWORD}

    # AOF Configuration
    appendonly yes
    appendfilename "appendonly.aof"

    # Fsync policy - write to disk on every change (safest but slowest)
    # appendfsync always
    # Fsync every second (good balance of safety and performance)
    appendfsync everysec
    # Let OS decide when to fsync (fastest but least safe)
    # appendfsync no

    # Don't fsync during rewrite
    no-appendfsync-on-rewrite no

    # Automatic AOF rewrite configuration
    auto-aof-rewrite-percentage 100
    auto-aof-rewrite-min-size 64mb

    # Load truncated AOF file
    aof-load-truncated yes

    # Use RDB preamble in AOF for faster loading
    aof-use-rdb-preamble yes

    # Working directory
    dir /data

    # Memory
    maxmemory 2gb
    maxmemory-policy allkeys-lru

    # Disable RDB for this example
    save ""
```

## Implementing Hybrid RDB + AOF Configuration

For production, combine both persistence methods:

```yaml
# redis-hybrid-persistence.yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: redis-hybrid-config
  namespace: redis
data:
  redis.conf: |
    # Network
    bind 0.0.0.0
    protected-mode yes
    port 6379
    requirepass ${REDIS_PASSWORD}
    tcp-backlog 511
    timeout 300
    tcp-keepalive 300

    # General
    daemonize no
    supervised no
    loglevel notice
    databases 16

    # RDB Persistence
    save 900 1
    save 300 10
    save 60 10000
    stop-writes-on-bgsave-error yes
    rdbcompression yes
    rdbchecksum yes
    dbfilename dump.rdb

    # AOF Persistence
    appendonly yes
    appendfilename "appendonly.aof"
    appendfsync everysec
    no-appendfsync-on-rewrite no
    auto-aof-rewrite-percentage 100
    auto-aof-rewrite-min-size 64mb
    aof-load-truncated yes
    aof-use-rdb-preamble yes

    # Directory
    dir /data

    # Memory
    maxmemory 4gb
    maxmemory-policy allkeys-lru
    maxmemory-samples 5

    # Lazy freeing
    lazyfree-lazy-eviction yes
    lazyfree-lazy-expire yes
    lazyfree-lazy-server-del yes
    replica-lazy-flush yes

    # Performance
    activerehashing yes
    client-output-buffer-limit normal 0 0 0
    client-output-buffer-limit replica 256mb 64mb 60
    client-output-buffer-limit pubsub 32mb 8mb 60

    # Slow log
    slowlog-log-slower-than 10000
    slowlog-max-len 128
---
apiVersion: apps/v1
kind: StatefulSet
metadata:
  name: redis-persistent
  namespace: redis
spec:
  serviceName: redis-persistent
  replicas: 1
  selector:
    matchLabels:
      app: redis-persistent
  template:
    metadata:
      labels:
        app: redis-persistent
      annotations:
        prometheus.io/scrape: "true"
        prometheus.io/port: "9121"
    spec:
      initContainers:
      - name: config
        image: redis:7.0-alpine
        command:
          - sh
          - -c
          - |
            cp /readonly-config/redis.conf /data/redis.conf
            sed -i "s/\${REDIS_PASSWORD}/$REDIS_PASSWORD/g" /data/redis.conf
        env:
        - name: REDIS_PASSWORD
          valueFrom:
            secretKeyRef:
              name: redis-password
              key: password
        volumeMounts:
        - name: config
          mountPath: /readonly-config
        - name: data
          mountPath: /data

      containers:
      - name: redis
        image: redis:7.0-alpine
        command:
          - redis-server
          - /data/redis.conf
        ports:
        - containerPort: 6379
          name: redis
        volumeMounts:
        - name: data
          mountPath: /data
        resources:
          requests:
            cpu: 2000m
            memory: 4Gi
          limits:
            cpu: 4000m
            memory: 8Gi
        livenessProbe:
          tcpSocket:
            port: 6379
          initialDelaySeconds: 30
          periodSeconds: 10
          timeoutSeconds: 5
        readinessProbe:
          exec:
            command:
            - sh
            - -c
            - redis-cli -a $REDIS_PASSWORD ping
          initialDelaySeconds: 10
          periodSeconds: 5
          timeoutSeconds: 3
          env:
          - name: REDIS_PASSWORD
            valueFrom:
              secretKeyRef:
                name: redis-password
                key: password

      # Redis Exporter sidecar
      - name: redis-exporter
        image: oliver006/redis_exporter:latest
        ports:
        - containerPort: 9121
          name: metrics
        env:
        - name: REDIS_PASSWORD
          valueFrom:
            secretKeyRef:
              name: redis-password
              key: password
        - name: REDIS_ADDR
          value: "redis://localhost:6379"
        resources:
          requests:
            cpu: 100m
            memory: 128Mi
          limits:
            cpu: 200m
            memory: 256Mi

      volumes:
      - name: config
        configMap:
          name: redis-hybrid-config

  volumeClaimTemplates:
  - metadata:
      name: data
    spec:
      accessModes: ["ReadWriteOnce"]
      storageClassName: fast-ssd
      resources:
        requests:
          storage: 100Gi
```

## Creating Backup Scripts

Automate backups of persistence files:

```bash
#!/bin/bash
# backup-redis-persistence.sh

set -e

NAMESPACE=${NAMESPACE:-redis}
POD_NAME=${POD_NAME:-redis-persistent-0}
BACKUP_DIR=${BACKUP_DIR:-/backup}
S3_BUCKET=${S3_BUCKET:-redis-backups}
TIMESTAMP=$(date +%Y%m%d_%H%M%S)

echo "Starting Redis backup at ${TIMESTAMP}"

# Trigger BGSAVE for RDB
kubectl exec -n $NAMESPACE $POD_NAME -- redis-cli -a $REDIS_PASSWORD BGSAVE

# Wait for BGSAVE to complete
echo "Waiting for BGSAVE to complete..."
while true; do
    SAVE_IN_PROGRESS=$(kubectl exec -n $NAMESPACE $POD_NAME -- redis-cli -a $REDIS_PASSWORD INFO persistence | grep rdb_bgsave_in_progress | cut -d: -f2 | tr -d '\r')
    if [ "$SAVE_IN_PROGRESS" = "0" ]; then
        break
    fi
    sleep 2
done

echo "BGSAVE completed"

# Trigger AOF rewrite
kubectl exec -n $NAMESPACE $POD_NAME -- redis-cli -a $REDIS_PASSWORD BGREWRITEAOF

# Wait for AOF rewrite to complete
echo "Waiting for AOF rewrite to complete..."
while true; do
    REWRITE_IN_PROGRESS=$(kubectl exec -n $NAMESPACE $POD_NAME -- redis-cli -a $REDIS_PASSWORD INFO persistence | grep aof_rewrite_in_progress | cut -d: -f2 | tr -d '\r')
    if [ "$REWRITE_IN_PROGRESS" = "0" ]; then
        break
    fi
    sleep 2
done

echo "AOF rewrite completed"

# Create backup directory
mkdir -p ${BACKUP_DIR}/${TIMESTAMP}

# Copy RDB file
echo "Copying RDB snapshot..."
kubectl cp ${NAMESPACE}/${POD_NAME}:/data/dump.rdb ${BACKUP_DIR}/${TIMESTAMP}/dump.rdb

# Copy AOF file
echo "Copying AOF file..."
kubectl cp ${NAMESPACE}/${POD_NAME}:/data/appendonly.aof ${BACKUP_DIR}/${TIMESTAMP}/appendonly.aof

# Get Redis info
kubectl exec -n $NAMESPACE $POD_NAME -- redis-cli -a $REDIS_PASSWORD INFO > ${BACKUP_DIR}/${TIMESTAMP}/redis-info.txt

# Create backup metadata
cat > ${BACKUP_DIR}/${TIMESTAMP}/metadata.json <<EOF
{
  "timestamp": "${TIMESTAMP}",
  "pod": "${POD_NAME}",
  "namespace": "${NAMESPACE}",
  "backup_type": "full",
  "files": ["dump.rdb", "appendonly.aof"]
}
EOF

# Compress backup
echo "Compressing backup..."
tar czf ${BACKUP_DIR}/redis-backup-${TIMESTAMP}.tar.gz -C ${BACKUP_DIR} ${TIMESTAMP}

# Upload to S3
if [ -n "$S3_BUCKET" ]; then
    echo "Uploading to S3..."
    aws s3 cp ${BACKUP_DIR}/redis-backup-${TIMESTAMP}.tar.gz \
        s3://${S3_BUCKET}/redis-backups/ \
        --storage-class STANDARD_IA
    echo "Uploaded to s3://${S3_BUCKET}/redis-backups/redis-backup-${TIMESTAMP}.tar.gz"
fi

# Cleanup old local backups (keep last 3)
cd ${BACKUP_DIR}
ls -t redis-backup-*.tar.gz | tail -n +4 | xargs -r rm -f
ls -td */ | tail -n +4 | xargs -r rm -rf

echo "Backup completed successfully"
```

## Scheduling Automated Backups

Deploy backup CronJob:

```yaml
# backup-cronjob.yaml
apiVersion: batch/v1
kind: CronJob
metadata:
  name: redis-backup
  namespace: redis
spec:
  schedule: "0 2 * * *"  # Daily at 2 AM
  successfulJobsHistoryLimit: 7
  failedJobsHistoryLimit: 3
  jobTemplate:
    spec:
      template:
        spec:
          serviceAccountName: redis-backup
          containers:
          - name: backup
            image: amazon/aws-cli:latest
            command: ["/bin/bash"]
            args:
              - -c
              - |
                # Install redis-cli
                yum install -y redis

                # Run backup script
                /scripts/backup-redis-persistence.sh
            env:
            - name: NAMESPACE
              value: "redis"
            - name: POD_NAME
              value: "redis-persistent-0"
            - name: REDIS_PASSWORD
              valueFrom:
                secretKeyRef:
                  name: redis-password
                  key: password
            - name: S3_BUCKET
              value: "redis-backups"
            - name: AWS_ACCESS_KEY_ID
              valueFrom:
                secretKeyRef:
                  name: aws-credentials
                  key: access-key-id
            - name: AWS_SECRET_ACCESS_KEY
              valueFrom:
                secretKeyRef:
                  name: aws-credentials
                  key: secret-access-key
            volumeMounts:
            - name: backup-storage
              mountPath: /backup
            - name: scripts
              mountPath: /scripts
          volumes:
          - name: backup-storage
            persistentVolumeClaim:
              claimName: redis-backup-pvc
          - name: scripts
            configMap:
              name: backup-scripts
              defaultMode: 0755
          restartPolicy: OnFailure
```

## Restoring from Backups

Create restore procedure:

```bash
#!/bin/bash
# restore-redis-persistence.sh

set -e

BACKUP_FILE=$1
NAMESPACE=${NAMESPACE:-redis}
POD_NAME=${POD_NAME:-redis-persistent-0}
RESTORE_DIR="/tmp/restore"

if [ -z "$BACKUP_FILE" ]; then
    echo "Usage: $0 <backup-file>"
    exit 1
fi

echo "Restoring from backup: $BACKUP_FILE"

# Download from S3 if needed
if [[ $BACKUP_FILE == s3://* ]]; then
    aws s3 cp $BACKUP_FILE /tmp/backup.tar.gz
    BACKUP_FILE="/tmp/backup.tar.gz"
fi

# Extract backup
mkdir -p $RESTORE_DIR
tar xzf $BACKUP_FILE -C $RESTORE_DIR --strip-components=1

# Stop Redis (scale down)
echo "Stopping Redis..."
kubectl scale statefulset redis-persistent -n $NAMESPACE --replicas=0
kubectl wait --for=delete pod/$POD_NAME -n $NAMESPACE --timeout=60s

# Copy persistence files
echo "Restoring persistence files..."
kubectl cp $RESTORE_DIR/dump.rdb $NAMESPACE/$POD_NAME:/data/dump.rdb
kubectl cp $RESTORE_DIR/appendonly.aof $NAMESPACE/$POD_NAME:/data/appendonly.aof

# Start Redis (scale up)
echo "Starting Redis..."
kubectl scale statefulset redis-persistent -n $NAMESPACE --replicas=1
kubectl wait --for=condition=ready pod/$POD_NAME -n $NAMESPACE --timeout=120s

# Verify data loaded
echo "Verifying restore..."
kubectl exec -n $NAMESPACE $POD_NAME -- redis-cli -a $REDIS_PASSWORD DBSIZE

echo "Restore completed successfully"
```

## Monitoring Persistence Health

Monitor persistence operations:

```bash
#!/bin/bash
# monitor-persistence.sh

NAMESPACE="redis"
POD_NAME="redis-persistent-0"

# Get persistence info
kubectl exec -n $NAMESPACE $POD_NAME -- redis-cli -a $REDIS_PASSWORD INFO persistence

# Check RDB status
echo "=== RDB Status ==="
kubectl exec -n $NAMESPACE $POD_NAME -- redis-cli -a $REDIS_PASSWORD INFO persistence | grep rdb_

# Check AOF status
echo "=== AOF Status ==="
kubectl exec -n $NAMESPACE $POD_NAME -- redis-cli -a $REDIS_PASSWORD INFO persistence | grep aof_

# Check last save time
LAST_SAVE=$(kubectl exec -n $NAMESPACE $POD_NAME -- redis-cli -a $REDIS_PASSWORD LASTSAVE)
CURRENT_TIME=$(date +%s)
TIME_SINCE_SAVE=$((CURRENT_TIME - LAST_SAVE))

echo "Time since last RDB save: ${TIME_SINCE_SAVE} seconds"

if [ $TIME_SINCE_SAVE -gt 7200 ]; then
    echo "WARNING: No RDB save in over 2 hours"
fi
```

## Conclusion

Implementing Redis persistence on Kubernetes requires careful configuration of both RDB snapshots and AOF logs. The hybrid approach provides fast restarts through RDB while maintaining durability through AOF, giving you the best of both worlds.

Key considerations:

- Use hybrid persistence (RDB + AOF) for production
- Configure appropriate save intervals based on data criticality
- Monitor persistence operations and disk space
- Automate backups to durable storage
- Test restore procedures regularly
- Optimize AOF fsync settings for your workload

With proper persistence configuration, Redis on Kubernetes can provide durable data storage while maintaining the performance characteristics that make Redis attractive for high-throughput applications.
