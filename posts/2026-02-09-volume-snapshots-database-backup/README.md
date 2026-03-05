# How to Use Volume Snapshots for Database Backup Workflows

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Kubernetes, Database, Backup, VolumeSnapshot

Description: Learn how to implement application-consistent database backups using Kubernetes volume snapshots with proper freeze and flush operations for PostgreSQL, MySQL, and MongoDB.

---

Database backups require more than just copying storage at a point in time. To ensure data consistency, you need to coordinate with the database engine to flush buffers, freeze writes, and create snapshots that can be reliably restored.

## Understanding Database-Consistent Snapshots

A storage snapshot alone may capture the database in an inconsistent state, with uncommitted transactions or unflushed buffers. Application-consistent snapshots coordinate with the database to ensure:

1. All transactions are committed or rolled back
2. Write buffers are flushed to disk
3. No writes occur during snapshot creation
4. Transaction logs are synchronized with data files

This coordination prevents corruption and ensures clean recovery.

## PostgreSQL Snapshot Workflow

PostgreSQL requires coordination with pg_start_backup() and pg_stop_backup() for consistent backups.

Create a snapshot Job with pre and post hooks:

```yaml
apiVersion: batch/v1
kind: Job
metadata:
  name: postgres-consistent-snapshot
spec:
  template:
    spec:
      serviceAccountName: snapshot-creator
      restartPolicy: OnFailure
      containers:
      - name: backup-coordinator
        image: postgres:15
        env:
        - name: PGHOST
          value: "postgres-service"
        - name: PGUSER
          value: "postgres"
        - name: PGPASSWORD
          valueFrom:
            secretKeyRef:
              name: postgres-credentials
              key: password
        command:
        - /bin/bash
        - -c
        - |
          set -e

          echo "=== Starting PostgreSQL consistent backup ==="

          # Step 1: Start backup mode
          echo "Starting backup mode..."
          psql -c "SELECT pg_start_backup('k8s-snapshot', false, false);"

          # Step 2: Create snapshot
          TIMESTAMP=$(date +%Y%m%d-%H%M%S)
          SNAPSHOT_NAME="postgres-${TIMESTAMP}"

          echo "Creating volume snapshot: $SNAPSHOT_NAME"

          # Install kubectl
          apt-get update && apt-get install -y curl
          curl -LO "https://dl.k8s.io/release/$(curl -L -s https://dl.k8s.io/release/stable.txt)/bin/linux/amd64/kubectl"
          chmod +x kubectl
          mv kubectl /usr/local/bin/

          cat <<EOF | kubectl apply -f -
          apiVersion: snapshot.storage.k8s.io/v1
          kind: VolumeSnapshot
          metadata:
            name: $SNAPSHOT_NAME
            labels:
              app: postgres
              backup-type: consistent
          spec:
            volumeSnapshotClassName: csi-snapshot-class
            source:
              persistentVolumeClaimName: postgres-pvc
          EOF

          # Step 3: Wait for snapshot to start
          echo "Waiting for snapshot creation..."
          sleep 10

          # Step 4: Stop backup mode
          echo "Stopping backup mode..."
          psql -c "SELECT pg_stop_backup(false);"

          echo "✓ PostgreSQL consistent backup complete"

          # Step 5: Wait for snapshot to be ready
          echo "Waiting for snapshot to be ready..."
          for i in {1..60}; do
            READY=$(kubectl get volumesnapshot $SNAPSHOT_NAME \
              -o jsonpath='{.status.readyToUse}' 2>/dev/null || echo "false")

            if [ "$READY" = "true" ]; then
              echo "✓ Snapshot ready"
              RESTORE_SIZE=$(kubectl get volumesnapshot $SNAPSHOT_NAME \
                -o jsonpath='{.status.restoreSize}')
              echo "Snapshot size: $RESTORE_SIZE"
              exit 0
            fi

            sleep 5
          done

          echo "ERROR: Snapshot did not become ready in time"
          exit 1
```

Create a CronJob for scheduled PostgreSQL backups:

```yaml
apiVersion: batch/v1
kind: CronJob
metadata:
  name: postgres-backup-schedule
spec:
  schedule: "0 2 * * *"  # Daily at 2 AM
  jobTemplate:
    spec:
      template:
        spec:
          serviceAccountName: snapshot-creator
          restartPolicy: OnFailure
          containers:
          - name: postgres-backup
            image: postgres:15
            env:
            - name: PGHOST
              value: "postgres-service"
            - name: PGUSER
              value: "postgres"
            - name: PGPASSWORD
              valueFrom:
                secretKeyRef:
                  name: postgres-credentials
                  key: password
            command:
            - /bin/bash
            - -c
            - |
              apt-get update && apt-get install -y curl jq
              curl -LO "https://dl.k8s.io/release/$(curl -L -s https://dl.k8s.io/release/stable.txt)/bin/linux/amd64/kubectl"
              chmod +x kubectl && mv kubectl /usr/local/bin/

              TIMESTAMP=$(date +%Y%m%d-%H%M%S)
              SNAPSHOT_NAME="postgres-${TIMESTAMP}"

              echo "Starting backup mode"
              psql -c "SELECT pg_start_backup('scheduled-backup-${TIMESTAMP}', false, false);"

              echo "Creating snapshot"
              kubectl apply -f - <<EOF
              apiVersion: snapshot.storage.k8s.io/v1
              kind: VolumeSnapshot
              metadata:
                name: $SNAPSHOT_NAME
                labels:
                  app: postgres
                  schedule: daily
              spec:
                volumeSnapshotClassName: csi-snapshot-class
                source:
                  persistentVolumeClaimName: postgres-pvc
              EOF

              sleep 10

              echo "Stopping backup mode"
              psql -c "SELECT pg_stop_backup(false);"

              echo "Backup complete"
```

## MySQL Snapshot Workflow

MySQL requires flushing tables and optionally locking them for consistent snapshots.

```yaml
apiVersion: batch/v1
kind: Job
metadata:
  name: mysql-consistent-snapshot
spec:
  template:
    spec:
      serviceAccountName: snapshot-creator
      restartPolicy: OnFailure
      containers:
      - name: backup-coordinator
        image: mysql:8.0
        env:
        - name: MYSQL_HOST
          value: "mysql-service"
        - name: MYSQL_USER
          value: "root"
        - name: MYSQL_PWD
          valueFrom:
            secretKeyRef:
              name: mysql-credentials
              key: root-password
        command:
        - /bin/bash
        - -c
        - |
          set -e

          echo "=== Starting MySQL consistent backup ==="

          # Install kubectl
          apt-get update && apt-get install -y curl
          curl -LO "https://dl.k8s.io/release/$(curl -L -s https://dl.k8s.io/release/stable.txt)/bin/linux/amd64/kubectl"
          chmod +x kubectl && mv kubectl /usr/local/bin/

          TIMESTAMP=$(date +%Y%m%d-%H%M%S)
          SNAPSHOT_NAME="mysql-${TIMESTAMP}"

          # Step 1: Flush tables to disk
          echo "Flushing tables..."
          mysql -e "FLUSH TABLES WITH READ LOCK;"

          # Step 2: Get binary log position for point-in-time recovery
          echo "Recording binary log position..."
          mysql -e "SHOW MASTER STATUS\G" > /tmp/binlog-position.txt

          # Step 3: Create snapshot
          echo "Creating snapshot..."
          kubectl apply -f - <<EOF
          apiVersion: snapshot.storage.k8s.io/v1
          kind: VolumeSnapshot
          metadata:
            name: $SNAPSHOT_NAME
            labels:
              app: mysql
              backup-type: consistent
            annotations:
              backup.kubernetes.io/binlog-position: "$(cat /tmp/binlog-position.txt | grep Position | awk '{print $2}')"
              backup.kubernetes.io/binlog-file: "$(cat /tmp/binlog-position.txt | grep File | awk '{print $2}')"
          spec:
            volumeSnapshotClassName: csi-snapshot-class
            source:
              persistentVolumeClaimName: mysql-pvc
          EOF

          # Step 4: Wait briefly for snapshot to start
          sleep 10

          # Step 5: Unlock tables
          echo "Unlocking tables..."
          mysql -e "UNLOCK TABLES;"

          echo "✓ MySQL consistent backup complete"

          # Wait for snapshot completion
          for i in {1..60}; do
            READY=$(kubectl get volumesnapshot $SNAPSHOT_NAME \
              -o jsonpath='{.status.readyToUse}' 2>/dev/null || echo "false")

            if [ "$READY" = "true" ]; then
              echo "✓ Snapshot ready"
              exit 0
            fi
            sleep 5
          done
```

For InnoDB-only databases, you can use a non-locking approach:

```yaml
apiVersion: batch/v1
kind: Job
metadata:
  name: mysql-innodb-snapshot
spec:
  template:
    spec:
      serviceAccountName: snapshot-creator
      restartPolicy: OnFailure
      containers:
      - name: backup-coordinator
        image: mysql:8.0
        env:
        - name: MYSQL_HOST
          value: "mysql-service"
        - name: MYSQL_USER
          value: "root"
        - name: MYSQL_PWD
          valueFrom:
            secretKeyRef:
              name: mysql-credentials
              key: root-password
        command:
        - /bin/bash
        - -c
        - |
          apt-get update && apt-get install -y curl
          curl -LO "https://dl.k8s.io/release/$(curl -L -s https://dl.k8s.io/release/stable.txt)/bin/linux/amd64/kubectl"
          chmod +x kubectl && mv kubectl /usr/local/bin/

          TIMESTAMP=$(date +%Y%m%d-%H%M%S)

          # Flush logs only (no lock needed for InnoDB crash recovery)
          echo "Flushing logs..."
          mysql -e "FLUSH LOCAL LOGS;"

          echo "Creating snapshot..."
          kubectl apply -f - <<EOF
          apiVersion: snapshot.storage.k8s.io/v1
          kind: VolumeSnapshot
          metadata:
            name: mysql-innodb-${TIMESTAMP}
            labels:
              app: mysql
              engine: innodb
          spec:
            volumeSnapshotClassName: csi-snapshot-class
            source:
              persistentVolumeClaimName: mysql-pvc
          EOF

          echo "InnoDB snapshot created (crash-consistent)"
```

## MongoDB Snapshot Workflow

MongoDB supports consistent snapshots using the fsync command:

```yaml
apiVersion: batch/v1
kind: Job
metadata:
  name: mongodb-consistent-snapshot
spec:
  template:
    spec:
      serviceAccountName: snapshot-creator
      restartPolicy: OnFailure
      containers:
      - name: backup-coordinator
        image: mongo:7.0
        env:
        - name: MONGO_HOST
          value: "mongodb-service"
        - name: MONGO_USERNAME
          value: "admin"
        - name: MONGO_PASSWORD
          valueFrom:
            secretKeyRef:
              name: mongodb-credentials
              key: root-password
        command:
        - /bin/bash
        - -c
        - |
          set -e

          echo "=== Starting MongoDB consistent backup ==="

          # Install kubectl
          apt-get update && apt-get install -y curl
          curl -LO "https://dl.k8s.io/release/$(curl -L -s https://dl.k8s.io/release/stable.txt)/bin/linux/amd64/kubectl"
          chmod +x kubectl && mv kubectl /usr/local/bin/

          TIMESTAMP=$(date +%Y%m%d-%H%M%S)
          SNAPSHOT_NAME="mongodb-${TIMESTAMP}"

          # Step 1: Lock MongoDB and flush to disk
          echo "Locking MongoDB..."
          mongosh --host $MONGO_HOST \
            --username $MONGO_USERNAME \
            --password $MONGO_PASSWORD \
            --authenticationDatabase admin \
            --eval "db.fsyncLock()"

          # Step 2: Create snapshot
          echo "Creating snapshot..."
          kubectl apply -f - <<EOF
          apiVersion: snapshot.storage.k8s.io/v1
          kind: VolumeSnapshot
          metadata:
            name: $SNAPSHOT_NAME
            labels:
              app: mongodb
              backup-type: consistent
          spec:
            volumeSnapshotClassName: csi-snapshot-class
            source:
              persistentVolumeClaimName: mongodb-pvc
          EOF

          sleep 10

          # Step 3: Unlock MongoDB
          echo "Unlocking MongoDB..."
          mongosh --host $MONGO_HOST \
            --username $MONGO_USERNAME \
            --password $MONGO_PASSWORD \
            --authenticationDatabase admin \
            --eval "db.fsyncUnlock()"

          echo "✓ MongoDB consistent backup complete"
```

## Redis Snapshot Workflow

Redis automatically maintains consistent snapshots through RDB files, but you can trigger a save:

```yaml
apiVersion: batch/v1
kind: Job
metadata:
  name: redis-snapshot
spec:
  template:
    spec:
      serviceAccountName: snapshot-creator
      restartPolicy: OnFailure
      containers:
      - name: backup-coordinator
        image: redis:7.0
        command:
        - /bin/bash
        - -c
        - |
          apt-get update && apt-get install -y curl
          curl -LO "https://dl.k8s.io/release/$(curl -L -s https://dl.k8s.io/release/stable.txt)/bin/linux/amd64/kubectl"
          chmod +x kubectl && mv kubectl /usr/local/bin/

          TIMESTAMP=$(date +%Y%m%d-%H%M%S)

          # Trigger BGSAVE for background save
          echo "Triggering Redis BGSAVE..."
          redis-cli -h redis-service BGSAVE

          # Wait for save to complete
          while [ "$(redis-cli -h redis-service LASTSAVE)" = "$(redis-cli -h redis-service LASTSAVE)" ]; do
            sleep 1
          done

          echo "Creating snapshot..."
          kubectl apply -f - <<EOF
          apiVersion: snapshot.storage.k8s.io/v1
          kind: VolumeSnapshot
          metadata:
            name: redis-${TIMESTAMP}
            labels:
              app: redis
          spec:
            volumeSnapshotClassName: csi-snapshot-class
            source:
              persistentVolumeClaimName: redis-pvc
          EOF

          echo "Redis snapshot created"
```

## Multi-Database Snapshot Coordination

For applications with multiple databases, create snapshots in a coordinated manner:

```yaml
apiVersion: batch/v1
kind: Job
metadata:
  name: multi-database-snapshot
spec:
  template:
    spec:
      serviceAccountName: snapshot-creator
      restartPolicy: OnFailure
      containers:
      - name: coordinator
        image: bitnami/kubectl:latest
        command:
        - /bin/bash
        - -c
        - |
          set -e

          TIMESTAMP=$(date +%Y%m%d-%H%M%S)
          BATCH_ID="batch-${TIMESTAMP}"

          echo "Creating coordinated snapshot batch: $BATCH_ID"

          # Create all snapshots with the same timestamp/batch ID
          for DB in postgres mysql mongodb redis; do
            echo "Creating snapshot for $DB..."

            kubectl apply -f - <<EOF
            apiVersion: snapshot.storage.k8s.io/v1
            kind: VolumeSnapshot
            metadata:
              name: ${DB}-${TIMESTAMP}
              labels:
                app: $DB
                batch-id: $BATCH_ID
                snapshot-group: application-stack
            spec:
              volumeSnapshotClassName: csi-snapshot-class
              source:
                persistentVolumeClaimName: ${DB}-pvc
          EOF
          done

          echo "Waiting for all snapshots to be ready..."

          # Wait for all snapshots in the batch
          for i in {1..120}; do
            READY_COUNT=$(kubectl get volumesnapshot -l batch-id=$BATCH_ID \
              -o json | jq '[.items[] | select(.status.readyToUse == true)] | length')

            TOTAL_COUNT=$(kubectl get volumesnapshot -l batch-id=$BATCH_ID --no-headers | wc -l)

            echo "Ready: $READY_COUNT / $TOTAL_COUNT"

            if [ "$READY_COUNT" = "$TOTAL_COUNT" ]; then
              echo "✓ All snapshots in batch $BATCH_ID are ready"
              exit 0
            fi

            sleep 5
          done

          echo "ERROR: Not all snapshots became ready in time"
          exit 1
```

## Best Practices

1. **Always coordinate with the database** - Use appropriate freeze/flush commands
2. **Minimize lock time** - Create snapshots quickly to reduce application impact
3. **Record transaction positions** - For point-in-time recovery
4. **Test restore procedures** - Verify backup consistency regularly
5. **Monitor backup duration** - Long locks can impact application performance
6. **Use crash-consistent snapshots** when locks are not feasible
7. **Label snapshots** with database version and backup type
8. **Document recovery procedures** specific to each database

Database-consistent snapshots require careful coordination with the database engine, but they provide reliable backups that can be confidently restored in disaster scenarios. Always test your backup and restore procedures in non-production environments first.
