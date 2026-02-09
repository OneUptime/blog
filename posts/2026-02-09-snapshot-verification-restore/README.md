# How to Implement Volume Snapshot Verification Before Restore

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Kubernetes, Storage, VolumeSnapshot, Testing

Description: Learn how to verify volume snapshots are restorable and contain valid data before using them in production restore operations, ensuring backup reliability and preventing disaster recovery failures.

---

Verifying snapshots before needing them for disaster recovery is critical. A backup is only valuable if you can successfully restore from it. Regular verification tests ensure your snapshots work when disasters strike.

## Understanding Snapshot Verification

Snapshot verification involves:

1. Checking snapshot readiness status
2. Restoring to a test environment
3. Validating data integrity
4. Testing application functionality
5. Measuring restore time
6. Documenting verification results

Without verification, you risk discovering broken backups during actual disasters.

## Basic Snapshot Verification Script

```bash
#!/bin/bash
# verify-snapshot.sh

set -e

SNAPSHOT_NAME="${1}"
NAMESPACE="${2:-default}"

if [ -z "$SNAPSHOT_NAME" ]; then
  echo "Usage: $0 <snapshot-name> [namespace]"
  exit 1
fi

echo "=== Verifying Snapshot: $SNAPSHOT_NAME ==="

# Step 1: Check snapshot status
echo "Step 1: Checking snapshot status..."
READY=$(kubectl get volumesnapshot $SNAPSHOT_NAME -n $NAMESPACE \
  -o jsonpath='{.status.readyToUse}' 2>/dev/null || echo "false")

if [ "$READY" != "true" ]; then
  echo "✗ Snapshot not ready"
  exit 1
fi

echo "✓ Snapshot is ready"

# Step 2: Get snapshot details
RESTORE_SIZE=$(kubectl get volumesnapshot $SNAPSHOT_NAME -n $NAMESPACE \
  -o jsonpath='{.status.restoreSize}')
CREATED=$(kubectl get volumesnapshot $SNAPSHOT_NAME -n $NAMESPACE \
  -o jsonpath='{.metadata.creationTimestamp}')

echo "  Size: $RESTORE_SIZE"
echo "  Created: $CREATED"

# Step 3: Create test PVC from snapshot
echo "Step 2: Creating test restore..."
TEST_PVC="verify-${SNAPSHOT_NAME}-$$"

kubectl apply -n $NAMESPACE -f - <<EOF
apiVersion: v1
kind: PersistentVolumeClaim
metadata:
  name: $TEST_PVC
  labels:
    verification-test: "true"
    source-snapshot: $SNAPSHOT_NAME
spec:
  accessModes:
    - ReadWriteOnce
  resources:
    requests:
      storage: $RESTORE_SIZE
  storageClassName: standard
  dataSource:
    name: $SNAPSHOT_NAME
    kind: VolumeSnapshot
    apiGroup: snapshot.storage.k8s.io
EOF

# Wait for PVC to be bound
echo "Waiting for test restore to complete..."
START_TIME=$(date +%s)

if ! kubectl wait -n $NAMESPACE --for=jsonpath='{.status.phase}'=Bound \
  pvc/$TEST_PVC --timeout=600s; then
  echo "✗ Restore failed"
  kubectl describe pvc $TEST_PVC -n $NAMESPACE
  kubectl delete pvc $TEST_PVC -n $NAMESPACE --ignore-not-found
  exit 1
fi

END_TIME=$(date +%s)
RESTORE_TIME=$((END_TIME - START_TIME))

echo "✓ Restore completed in ${RESTORE_TIME}s"

# Step 4: Mount and verify
echo "Step 3: Mounting and verifying data..."

kubectl apply -n $NAMESPACE -f - <<EOF
apiVersion: v1
kind: Pod
metadata:
  name: verify-${SNAPSHOT_NAME}
spec:
  restartPolicy: Never
  containers:
  - name: verifier
    image: busybox
    command:
    - /bin/sh
    - -c
    - |
      echo "Checking filesystem..."
      df -h /data
      echo "Listing files..."
      ls -lah /data
      echo "Verification complete"
    volumeMounts:
    - name: data
      mountPath: /data
  volumes:
  - name: data
    persistentVolumeClaim:
      claimName: $TEST_PVC
EOF

# Wait for pod completion
if ! kubectl wait -n $NAMESPACE --for=condition=ready \
  pod/verify-${SNAPSHOT_NAME} --timeout=60s; then
  echo "✗ Verification pod failed"
  kubectl logs verify-${SNAPSHOT_NAME} -n $NAMESPACE || true
  kubectl delete pod verify-${SNAPSHOT_NAME} -n $NAMESPACE --ignore-not-found
  kubectl delete pvc $TEST_PVC -n $NAMESPACE --ignore-not-found
  exit 1
fi

# Get verification output
kubectl logs verify-${SNAPSHOT_NAME} -n $NAMESPACE

# Cleanup
echo "Step 4: Cleaning up..."
kubectl delete pod verify-${SNAPSHOT_NAME} -n $NAMESPACE
kubectl delete pvc $TEST_PVC -n $NAMESPACE

echo "✓ Snapshot verification complete"
echo "  Restore time: ${RESTORE_TIME}s"
```

## Database-Specific Verification

Verify database snapshots with data validation:

```yaml
apiVersion: batch/v1
kind: Job
metadata:
  name: verify-postgres-snapshot
spec:
  template:
    spec:
      serviceAccountName: snapshot-verifier
      restartPolicy: OnFailure
      containers:
      - name: verifier
        image: postgres:15
        env:
        - name: SNAPSHOT_NAME
          value: "postgres-snapshot-20260209"
        - name: PGPASSWORD
          value: "test-password"
        command:
        - /bin/bash
        - -c
        - |
          set -e

          apt-get update && apt-get install -y curl
          curl -LO "https://dl.k8s.io/release/$(curl -L -s https://dl.k8s.io/release/stable.txt)/bin/linux/amd64/kubectl"
          chmod +x kubectl && mv kubectl /usr/local/bin/

          echo "=== Verifying PostgreSQL Snapshot ==="

          # Create test PVC from snapshot
          TEST_PVC="verify-postgres-$$"

          RESTORE_SIZE=$(kubectl get volumesnapshot $SNAPSHOT_NAME \
            -o jsonpath='{.status.restoreSize}')

          kubectl apply -f - <<EOF
          apiVersion: v1
          kind: PersistentVolumeClaim
          metadata:
            name: $TEST_PVC
          spec:
            accessModes:
              - ReadWriteOnce
            resources:
              requests:
                storage: $RESTORE_SIZE
            storageClassName: standard
            dataSource:
              name: $SNAPSHOT_NAME
              kind: VolumeSnapshot
              apiGroup: snapshot.storage.k8s.io
          EOF

          kubectl wait --for=jsonpath='{.status.phase}'=Bound \
            pvc/$TEST_PVC --timeout=600s

          # Start test database
          kubectl apply -f - <<EOF
          apiVersion: v1
          kind: Pod
          metadata:
            name: verify-postgres
          spec:
            containers:
            - name: postgres
              image: postgres:15
              env:
              - name: POSTGRES_PASSWORD
                value: test-password
              volumeMounts:
              - name: data
                mountPath: /var/lib/postgresql/data
            volumes:
            - name: data
              persistentVolumeClaim:
                claimName: $TEST_PVC
          EOF

          kubectl wait --for=condition=ready pod/verify-postgres --timeout=120s

          echo "✓ Database started from snapshot"

          # Run verification queries
          echo "Running database verification..."

          kubectl exec verify-postgres -- psql -U postgres -c "\l" || {
            echo "✗ Database listing failed"
            exit 1
          }

          kubectl exec verify-postgres -- psql -U postgres -c "
          SELECT version();
          SELECT pg_database_size(current_database());
          " || {
            echo "✗ Database queries failed"
            exit 1
          }

          echo "✓ Database verification successful"

          # Cleanup
          kubectl delete pod verify-postgres
          kubectl delete pvc $TEST_PVC

          echo "✓ Snapshot verified successfully"
```

## Automated Verification CronJob

```yaml
apiVersion: batch/v1
kind: CronJob
metadata:
  name: automated-snapshot-verification
spec:
  schedule: "0 4 * * 0"  # Weekly on Sunday at 4 AM
  jobTemplate:
    spec:
      template:
        spec:
          serviceAccountName: snapshot-verifier
          restartPolicy: OnFailure
          containers:
          - name: verifier
            image: bitnami/kubectl:latest
            command:
            - /bin/bash
            - -c
            - |
              set -e

              echo "=== Automated Snapshot Verification ==="

              # Get latest snapshot for each application
              for APP in postgres mysql mongodb redis; do
                echo "Verifying latest $APP snapshot..."

                LATEST=$(kubectl get volumesnapshot -l app=$APP \
                  --sort-by=.metadata.creationTimestamp \
                  -o jsonpath='{.items[-1].metadata.name}')

                if [ -z "$LATEST" ]; then
                  echo "No snapshot found for $APP"
                  continue
                fi

                echo "Latest snapshot: $LATEST"

                # Verify snapshot is ready
                READY=$(kubectl get volumesnapshot $LATEST \
                  -o jsonpath='{.status.readyToUse}')

                if [ "$READY" != "true" ]; then
                  echo "✗ Snapshot not ready"
                  continue
                fi

                # Create test restore
                TEST_PVC="verify-${APP}-$(date +%s)"

                RESTORE_SIZE=$(kubectl get volumesnapshot $LATEST \
                  -o jsonpath='{.status.restoreSize}')

                kubectl apply -f - <<EOF
                apiVersion: v1
                kind: PersistentVolumeClaim
                metadata:
                  name: $TEST_PVC
                  labels:
                    verification-test: "true"
                spec:
                  accessModes:
                    - ReadWriteOnce
                  resources:
                    requests:
                      storage: $RESTORE_SIZE
                  storageClassName: standard
                  dataSource:
                    name: $LATEST
                    kind: VolumeSnapshot
                    apiGroup: snapshot.storage.k8s.io
              EOF

                # Wait for restore
                if kubectl wait --for=jsonpath='{.status.phase}'=Bound \
                  pvc/$TEST_PVC --timeout=600s; then
                  echo "✓ $APP snapshot verified"

                  # Annotate snapshot as verified
                  kubectl annotate volumesnapshot $LATEST \
                    last-verified=$(date -Iseconds) \
                    verification-status=passed --overwrite
                else
                  echo "✗ $APP snapshot verification failed"

                  kubectl annotate volumesnapshot $LATEST \
                    last-verified=$(date -Iseconds) \
                    verification-status=failed --overwrite
                fi

                # Cleanup
                kubectl delete pvc $TEST_PVC --ignore-not-found

                echo
              done

              echo "✓ Verification complete"
```

## Verification Report Generation

```bash
#!/bin/bash
# snapshot-verification-report.sh

echo "=== Snapshot Verification Report ==="
echo "Generated: $(date)"
echo

# Get all snapshots with verification status
kubectl get volumesnapshot -o json | jq -r '
  .items[] |
  select(.metadata.annotations."last-verified" != null) |
  {
    name: .metadata.name,
    app: .metadata.labels.app,
    created: .metadata.creationTimestamp,
    verified: .metadata.annotations."last-verified",
    status: .metadata.annotations."verification-status",
    size: .status.restoreSize
  } |
  "\(.name)\t\(.app)\t\(.status)\t\(.verified)"
' | column -t -s $'\t'

echo
echo "=== Unverified Snapshots ==="

# List snapshots that have never been verified
kubectl get volumesnapshot -o json | jq -r '
  .items[] |
  select(.metadata.annotations."last-verified" == null) |
  "\(.metadata.name)\t\(.metadata.creationTimestamp)"
' | column -t -s $'\t'

echo
echo "=== Failed Verifications ==="

# List snapshots with failed verifications
kubectl get volumesnapshot -o json | jq -r '
  .items[] |
  select(.metadata.annotations."verification-status" == "failed") |
  "\(.metadata.name)\t\(.metadata.annotations.\"last-verified\")"
' | column -t -s $'\t'
```

## Best Practices

1. **Verify snapshots regularly** - Don't wait for disasters
2. **Test in isolated environments** to avoid production impact
3. **Automate verification** with scheduled jobs
4. **Document verification results** with annotations
5. **Test application functionality** not just data presence
6. **Measure restore times** for RTO planning
7. **Alert on failed verifications** immediately
8. **Keep verification costs low** with cleanup

Regular snapshot verification ensures your backups are reliable and your disaster recovery procedures work when needed. Always test your backups before disasters strike.
