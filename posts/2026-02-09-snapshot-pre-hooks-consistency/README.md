# How to Implement Volume Snapshot Pre-Hooks for Application Consistency

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Kubernetes, Storage, Backup, Application Consistency

Description: Learn how to implement pre-snapshot hooks to ensure application-consistent backups in Kubernetes by coordinating with applications before volume snapshot creation.

---

Pre-snapshot hooks execute commands before creating volume snapshots to ensure applications are in a consistent state. This coordination prevents data corruption and ensures clean restores by flushing buffers, quiescing writes, and synchronizing state.

## Understanding Pre-Snapshot Hooks

Pre-snapshot hooks perform critical tasks:

1. Flush application write buffers to disk
2. Pause or quiesce write operations
3. Ensure transaction consistency
4. Record application state metadata
5. Signal readiness for snapshot creation

Without hooks, snapshots may capture inconsistent application state, leading to corruption during restore operations.

## Init Container Approach for Pre-Hooks

Use an init container to prepare the application before snapshot creation:

```yaml
apiVersion: batch/v1
kind: Job
metadata:
  name: snapshot-with-prehook
spec:
  template:
    spec:
      serviceAccountName: snapshot-creator
      restartPolicy: OnFailure
      volumes:
      - name: shared-scripts
        emptyDir: {}
      initContainers:
      # Pre-hook: Prepare application
      - name: pre-snapshot-hook
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
        volumeMounts:
        - name: shared-scripts
          mountPath: /hooks
        command:
        - /bin/bash
        - -c
        - |
          set -e
          echo "=== Pre-snapshot hook ==="

          # Checkpoint and flush data
          echo "Executing checkpoint..."
          psql -c "CHECKPOINT;"

          # Start backup mode
          echo "Starting backup mode..."
          psql -c "SELECT pg_start_backup('k8s-snapshot', false, false);"

          # Write state file
          echo "backup_started" > /hooks/backup_state
          date > /hooks/backup_timestamp

          echo "✓ Pre-hook complete"
      containers:
      # Main: Create snapshot
      - name: create-snapshot
        image: bitnami/kubectl:latest
        volumeMounts:
        - name: shared-scripts
          mountPath: /hooks
        command:
        - /bin/bash
        - -c
        - |
          set -e

          # Verify pre-hook completed
          if [ ! -f /hooks/backup_state ]; then
            echo "ERROR: Pre-hook did not complete"
            exit 1
          fi

          TIMESTAMP=$(date +%Y%m%d-%H%M%S)
          BACKUP_TIME=$(cat /hooks/backup_timestamp)

          echo "Creating snapshot (backup started at $BACKUP_TIME)"

          cat <<EOF | kubectl apply -f -
          apiVersion: snapshot.storage.k8s.io/v1
          kind: VolumeSnapshot
          metadata:
            name: postgres-${TIMESTAMP}
            annotations:
              backup.kubernetes.io/backup-time: "$BACKUP_TIME"
              backup.kubernetes.io/hook-executed: "true"
          spec:
            volumeSnapshotClassName: csi-snapshot-class
            source:
              persistentVolumeClaimName: postgres-pvc
          EOF

          sleep 10

          # Post-hook: Stop backup mode
          echo "=== Post-snapshot hook ==="
          apt-get update && apt-get install -y postgresql-client
          export PGHOST=postgres-service
          export PGUSER=postgres
          export PGPASSWORD=$(cat /var/run/secrets/postgres/password)

          psql -c "SELECT pg_stop_backup(false);"
          echo "✓ Post-hook complete"
```

## Sidecar Pattern for Continuous Hooks

Deploy a sidecar container to handle snapshot hooks:

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: database-with-backup-sidecar
spec:
  replicas: 1
  selector:
    matchLabels:
      app: database
  template:
    metadata:
      labels:
        app: database
    spec:
      volumes:
      - name: data
        persistentVolumeClaim:
          claimName: postgres-pvc
      - name: backup-hooks
        emptyDir: {}
      containers:
      # Main application
      - name: postgres
        image: postgres:15
        env:
        - name: POSTGRES_PASSWORD
          value: "password123"
        ports:
        - containerPort: 5432
        volumeMounts:
        - name: data
          mountPath: /var/lib/postgresql/data
        - name: backup-hooks
          mountPath: /backup-hooks

      # Backup sidecar
      - name: backup-coordinator
        image: postgres:15
        env:
        - name: PGHOST
          value: "localhost"
        - name: PGUSER
          value: "postgres"
        - name: PGPASSWORD
          value: "password123"
        volumeMounts:
        - name: backup-hooks
          mountPath: /backup-hooks
        command:
        - /bin/bash
        - -c
        - |
          set -e

          echo "Backup coordinator sidecar started"

          # Create named pipe for backup triggers
          mkfifo /backup-hooks/trigger

          while true; do
            # Wait for trigger signal
            read COMMAND < /backup-hooks/trigger

            case "$COMMAND" in
              start-backup)
                echo "Received start-backup signal"
                psql -c "SELECT pg_start_backup('sidecar-backup', false, false);"
                echo "ready" > /backup-hooks/status
                ;;
              stop-backup)
                echo "Received stop-backup signal"
                psql -c "SELECT pg_stop_backup(false);"
                echo "complete" > /backup-hooks/status
                ;;
              *)
                echo "Unknown command: $COMMAND"
                ;;
            esac
          done
```

Create snapshots using the sidecar:

```yaml
apiVersion: batch/v1
kind: Job
metadata:
  name: snapshot-via-sidecar
spec:
  template:
    spec:
      restartPolicy: OnFailure
      containers:
      - name: snapshot-creator
        image: bitnami/kubectl:latest
        command:
        - /bin/bash
        - -c
        - |
          set -e

          POD_NAME=$(kubectl get pod -l app=database -o jsonpath='{.items[0].metadata.name}')

          echo "Triggering pre-hook via sidecar"

          # Send start-backup signal
          kubectl exec $POD_NAME -c backup-coordinator -- bash -c \
            "echo 'start-backup' > /backup-hooks/trigger"

          # Wait for ready signal
          until kubectl exec $POD_NAME -c backup-coordinator -- \
            cat /backup-hooks/status 2>/dev/null | grep -q "ready"; do
            echo "Waiting for backup ready..."
            sleep 1
          done

          echo "Creating snapshot"
          TIMESTAMP=$(date +%Y%m%d-%H%M%S)

          kubectl apply -f - <<EOF
          apiVersion: snapshot.storage.k8s.io/v1
          kind: VolumeSnapshot
          metadata:
            name: sidecar-snapshot-${TIMESTAMP}
          spec:
            volumeSnapshotClassName: csi-snapshot-class
            source:
              persistentVolumeClaimName: postgres-pvc
          EOF

          sleep 10

          # Send stop-backup signal
          kubectl exec $POD_NAME -c backup-coordinator -- bash -c \
            "echo 'stop-backup' > /backup-hooks/trigger"

          echo "Snapshot created with hooks"
```

## HTTP Endpoint Hook Pattern

Expose an HTTP endpoint in your application for backup coordination:

```yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: backup-hook-server
data:
  server.py: |
    from flask import Flask, jsonify
    import psycopg2
    import os

    app = Flask(__name__)

    @app.route('/backup/start', methods=['POST'])
    def start_backup():
        try:
            conn = psycopg2.connect(
                host=os.getenv('PGHOST', 'localhost'),
                user=os.getenv('PGUSER', 'postgres'),
                password=os.getenv('PGPASSWORD')
            )
            cur = conn.cursor()
            cur.execute("SELECT pg_start_backup('http-backup', false, false);")
            conn.commit()
            cur.close()
            conn.close()
            return jsonify({"status": "started"}), 200
        except Exception as e:
            return jsonify({"error": str(e)}), 500

    @app.route('/backup/stop', methods=['POST'])
    def stop_backup():
        try:
            conn = psycopg2.connect(
                host=os.getenv('PGHOST', 'localhost'),
                user=os.getenv('PGUSER', 'postgres'),
                password=os.getenv('PGPASSWORD')
            )
            cur = conn.cursor()
            cur.execute("SELECT pg_stop_backup(false);")
            conn.commit()
            cur.close()
            conn.close()
            return jsonify({"status": "stopped"}), 200
        except Exception as e:
            return jsonify({"error": str(e)}), 500

    if __name__ == '__main__':
        app.run(host='0.0.0.0', port=8080)
---
apiVersion: apps/v1
kind: Deployment
metadata:
  name: database-with-http-hooks
spec:
  replicas: 1
  selector:
    matchLabels:
      app: database
  template:
    metadata:
      labels:
        app: database
    spec:
      containers:
      - name: postgres
        image: postgres:15
        env:
        - name: POSTGRES_PASSWORD
          value: "password123"
        volumeMounts:
        - name: data
          mountPath: /var/lib/postgresql/data
        ports:
        - containerPort: 5432

      - name: backup-hook-server
        image: python:3.11-slim
        env:
        - name: PGHOST
          value: "localhost"
        - name: PGUSER
          value: "postgres"
        - name: PGPASSWORD
          value: "password123"
        command:
        - /bin/bash
        - -c
        - |
          pip install flask psycopg2-binary
          python /scripts/server.py
        ports:
        - containerPort: 8080
        volumeMounts:
        - name: scripts
          mountPath: /scripts
      volumes:
      - name: data
        persistentVolumeClaim:
          claimName: postgres-pvc
      - name: scripts
        configMap:
          name: backup-hook-server
---
apiVersion: v1
kind: Service
metadata:
  name: backup-hook-service
spec:
  selector:
    app: database
  ports:
  - port: 8080
    targetPort: 8080
```

Create snapshot using HTTP hooks:

```yaml
apiVersion: batch/v1
kind: Job
metadata:
  name: snapshot-via-http
spec:
  template:
    spec:
      restartPolicy: OnFailure
      containers:
      - name: snapshot-creator
        image: curlimages/curl:latest
        command:
        - /bin/sh
        - -c
        - |
          set -e

          # Install kubectl
          curl -LO "https://dl.k8s.io/release/$(curl -L -s https://dl.k8s.io/release/stable.txt)/bin/linux/amd64/kubectl"
          chmod +x kubectl

          TIMESTAMP=$(date +%Y%m%d-%H%M%S)

          echo "Calling pre-snapshot hook"
          RESPONSE=$(curl -s -X POST http://backup-hook-service:8080/backup/start)
          echo "Response: $RESPONSE"

          if echo "$RESPONSE" | grep -q "started"; then
            echo "Creating snapshot"

            ./kubectl apply -f - <<EOF
            apiVersion: snapshot.storage.k8s.io/v1
            kind: VolumeSnapshot
            metadata:
              name: http-snapshot-${TIMESTAMP}
            spec:
              volumeSnapshotClassName: csi-snapshot-class
              source:
                persistentVolumeClaimName: postgres-pvc
          EOF

            sleep 10

            echo "Calling post-snapshot hook"
            curl -s -X POST http://backup-hook-service:8080/backup/stop

            echo "Snapshot complete"
          else
            echo "ERROR: Pre-hook failed"
            exit 1
          fi
```

## Custom Resource for Hook Management

Define a custom resource for snapshot hooks:

```yaml
apiVersion: apiextensions.k8s.io/v1
kind: CustomResourceDefinition
metadata:
  name: snapshothooks.backup.example.com
spec:
  group: backup.example.com
  versions:
  - name: v1
    served: true
    storage: true
    schema:
      openAPIV3Schema:
        type: object
        properties:
          spec:
            type: object
            properties:
              targetPVC:
                type: string
              preHook:
                type: object
                properties:
                  exec:
                    type: object
                    properties:
                      command:
                        type: array
                        items:
                          type: string
                  timeoutSeconds:
                    type: integer
              postHook:
                type: object
                properties:
                  exec:
                    type: object
                    properties:
                      command:
                        type: array
                        items:
                          type: string
  scope: Namespaced
  names:
    plural: snapshothooks
    singular: snapshothook
    kind: SnapshotHook
    shortNames:
    - sh
---
apiVersion: backup.example.com/v1
kind: SnapshotHook
metadata:
  name: postgres-backup-hook
spec:
  targetPVC: postgres-pvc
  preHook:
    exec:
      command:
      - psql
      - -c
      - SELECT pg_start_backup('custom-resource-backup', false, false);
    timeoutSeconds: 30
  postHook:
    exec:
      command:
      - psql
      - -c
      - SELECT pg_stop_backup(false);
    timeoutSeconds: 30
```

## Timeout and Error Handling

Implement robust error handling for hooks:

```yaml
apiVersion: batch/v1
kind: Job
metadata:
  name: snapshot-with-timeout-handling
spec:
  backoffLimit: 0
  template:
    spec:
      serviceAccountName: snapshot-creator
      restartPolicy: Never
      containers:
      - name: snapshot-with-hooks
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
        - name: HOOK_TIMEOUT
          value: "30"
        - name: SNAPSHOT_TIMEOUT
          value: "300"
        command:
        - /bin/bash
        - -c
        - |
          set -e

          apt-get update && apt-get install -y curl
          curl -LO "https://dl.k8s.io/release/$(curl -L -s https://dl.k8s.io/release/stable.txt)/bin/linux/amd64/kubectl"
          chmod +x kubectl && mv kubectl /usr/local/bin/

          TIMESTAMP=$(date +%Y%m%d-%H%M%S)
          SNAPSHOT_NAME="postgres-${TIMESTAMP}"
          HOOK_FAILED=0

          cleanup() {
            echo "=== Cleanup ==="
            if [ $HOOK_FAILED -eq 0 ]; then
              echo "Executing post-hook"
              timeout $HOOK_TIMEOUT psql -c "SELECT pg_stop_backup(false);" || {
                echo "WARNING: Post-hook failed"
              }
            fi
          }

          trap cleanup EXIT

          echo "=== Executing pre-hook ==="
          if ! timeout $HOOK_TIMEOUT psql -c "SELECT pg_start_backup('backup-${TIMESTAMP}', false, false);"; then
            echo "ERROR: Pre-hook failed or timed out"
            HOOK_FAILED=1
            exit 1
          fi

          echo "✓ Pre-hook complete"

          echo "=== Creating snapshot ==="
          kubectl apply -f - <<EOF
          apiVersion: snapshot.storage.k8s.io/v1
          kind: VolumeSnapshot
          metadata:
            name: $SNAPSHOT_NAME
          spec:
            volumeSnapshotClassName: csi-snapshot-class
            source:
              persistentVolumeClaimName: postgres-pvc
          EOF

          # Wait for snapshot with timeout
          ELAPSED=0
          while [ $ELAPSED -lt $SNAPSHOT_TIMEOUT ]; do
            READY=$(kubectl get volumesnapshot $SNAPSHOT_NAME \
              -o jsonpath='{.status.readyToUse}' 2>/dev/null || echo "false")

            if [ "$READY" = "true" ]; then
              echo "✓ Snapshot ready"
              exit 0
            fi

            ERROR=$(kubectl get volumesnapshot $SNAPSHOT_NAME \
              -o jsonpath='{.status.error.message}' 2>/dev/null || echo "")

            if [ -n "$ERROR" ]; then
              echo "ERROR: Snapshot failed - $ERROR"
              HOOK_FAILED=1
              exit 1
            fi

            sleep 5
            ELAPSED=$((ELAPSED + 5))
          done

          echo "ERROR: Snapshot timed out"
          HOOK_FAILED=1
          exit 1
```

## Best Practices

1. **Always implement post-hooks** to clean up application state
2. **Use timeouts** to prevent hung backup processes
3. **Handle errors gracefully** with proper cleanup
4. **Test hooks thoroughly** before production use
5. **Log hook execution** for troubleshooting
6. **Monitor hook duration** to detect performance issues
7. **Document hook requirements** for each application type
8. **Use trap commands** in shell scripts for cleanup

Pre-snapshot hooks ensure your backups capture consistent application state, making them reliable for disaster recovery scenarios. Proper implementation balances data consistency with minimal application disruption.
