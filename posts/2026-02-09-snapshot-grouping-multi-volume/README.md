# How to Configure Volume Snapshot Grouping for Multi-Volume Consistency

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Kubernetes, Storage, VolumeSnapshot, Consistency

Description: Learn how to create consistent snapshots across multiple volumes simultaneously for applications that span multiple persistent volumes, ensuring crash-consistent and application-consistent backups.

---

Applications with multiple volumes need coordinated snapshots to maintain consistency across all volumes. Creating snapshots at the same point in time prevents partial state captures that could lead to corruption during restoration.

## Understanding Multi-Volume Consistency

Multi-volume consistency requires:

1. All snapshots created at the same logical point in time
2. Application state synchronized across volumes
3. Coordinated freeze and thaw operations
4. Atomic snapshot creation when possible
5. Consistent labeling for snapshot groups

Without coordination, different volumes may capture different transaction states, leading to inconsistent restores.

## Creating Snapshot Groups with Labels

Use labels to group related snapshots:

```yaml
apiVersion: batch/v1
kind: Job
metadata:
  name: multi-volume-snapshot
spec:
  template:
    spec:
      serviceAccountName: snapshot-creator
      restartPolicy: OnFailure
      containers:
      - name: create-snapshots
        image: bitnami/kubectl:latest
        command:
        - /bin/bash
        - -c
        - |
          set -e

          # Generate unique group ID
          GROUP_ID="snapshot-group-$(date +%Y%m%d-%H%M%S)"
          echo "Creating snapshot group: $GROUP_ID"

          # List of PVCs to snapshot
          PVCS=(
            "postgres-data-pvc"
            "postgres-wal-pvc"
            "redis-pvc"
            "mongodb-pvc"
          )

          # Create all snapshots with same group ID
          for PVC in "${PVCS[@]}"; do
            SNAPSHOT_NAME="${PVC}-${GROUP_ID}"

            echo "Creating snapshot: $SNAPSHOT_NAME"

            cat <<EOF | kubectl apply -f -
            apiVersion: snapshot.storage.k8s.io/v1
            kind: VolumeSnapshot
            metadata:
              name: $SNAPSHOT_NAME
              labels:
                snapshot-group: $GROUP_ID
                pvc-name: $PVC
                consistency-type: crash-consistent
            spec:
              volumeSnapshotClassName: csi-snapshot-class
              source:
                persistentVolumeClaimName: $PVC
          EOF
          done

          echo "Waiting for all snapshots to be ready..."

          # Wait for all snapshots in the group
          TIMEOUT=600
          ELAPSED=0

          while [ $ELAPSED -lt $TIMEOUT ]; do
            TOTAL=$(kubectl get volumesnapshot -l snapshot-group=$GROUP_ID --no-headers | wc -l)
            READY=$(kubectl get volumesnapshot -l snapshot-group=$GROUP_ID \
              -o json | jq '[.items[] | select(.status.readyToUse == true)] | length')

            echo "Progress: $READY/$TOTAL snapshots ready"

            if [ "$READY" = "$TOTAL" ]; then
              echo "✓ All snapshots in group $GROUP_ID are ready"
              exit 0
            fi

            # Check for errors
            ERRORS=$(kubectl get volumesnapshot -l snapshot-group=$GROUP_ID \
              -o json | jq '[.items[] | select(.status.error != null)] | length')

            if [ "$ERRORS" -gt 0 ]; then
              echo "ERROR: $ERRORS snapshots failed"
              kubectl get volumesnapshot -l snapshot-group=$GROUP_ID
              exit 1
            fi

            sleep 5
            ELAPSED=$((ELAPSED + 5))
          done

          echo "ERROR: Snapshot group creation timed out"
          exit 1
```

## Application-Consistent Multi-Volume Snapshots

Coordinate with the application before creating snapshots:

```yaml
apiVersion: batch/v1
kind: Job
metadata:
  name: app-consistent-multi-snapshot
spec:
  template:
    spec:
      serviceAccountName: snapshot-creator
      restartPolicy: OnFailure
      containers:
      - name: coordinator
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

          # Install kubectl
          apt-get update && apt-get install -y curl
          curl -LO "https://dl.k8s.io/release/$(curl -L -s https://dl.k8s.io/release/stable.txt)/bin/linux/amd64/kubectl"
          chmod +x kubectl && mv kubectl /usr/local/bin/

          GROUP_ID="app-consistent-$(date +%Y%m%d-%H%M%S)"
          echo "=== Creating application-consistent snapshot group: $GROUP_ID ==="

          # Step 1: Freeze application
          echo "Step 1: Freezing application..."
          psql -c "SELECT pg_start_backup('multi-volume-backup', false, false);"

          # Also freeze other databases if needed
          # redis-cli -h redis-service SAVE
          # mongosh --host mongodb-service --eval "db.fsyncLock()"

          echo "✓ Application frozen"

          # Step 2: Create all snapshots quickly
          echo "Step 2: Creating snapshots..."

          PVCS=(
            "postgres-data-pvc:postgres"
            "postgres-wal-pvc:postgres"
            "redis-pvc:redis"
            "mongodb-pvc:mongodb"
          )

          for PVC_INFO in "${PVCS[@]}"; do
            PVC_NAME="${PVC_INFO%%:*}"
            APP_NAME="${PVC_INFO##*:}"

            kubectl apply -f - <<EOF
            apiVersion: snapshot.storage.k8s.io/v1
            kind: VolumeSnapshot
            metadata:
              name: ${PVC_NAME}-${GROUP_ID}
              labels:
                snapshot-group: $GROUP_ID
                pvc-name: $PVC_NAME
                app-name: $APP_NAME
                consistency-type: application-consistent
            spec:
              volumeSnapshotClassName: csi-snapshot-class
              source:
                persistentVolumeClaimName: $PVC_NAME
          EOF

            echo "Created snapshot for $PVC_NAME"
          done

          # Step 3: Unfreeze application
          echo "Step 3: Unfreezing application..."
          sleep 10  # Allow snapshots to start
          psql -c "SELECT pg_stop_backup(false);"

          # Unfreeze other databases
          # mongosh --host mongodb-service --eval "db.fsyncUnlock()"

          echo "✓ Application unfrozen"

          # Step 4: Wait for completion
          echo "Step 4: Waiting for snapshots to complete..."

          for i in {1..120}; do
            TOTAL=$(kubectl get volumesnapshot -l snapshot-group=$GROUP_ID --no-headers | wc -l)
            READY=$(kubectl get volumesnapshot -l snapshot-group=$GROUP_ID \
              -o json | jq '[.items[] | select(.status.readyToUse == true)] | length')

            if [ "$READY" = "$TOTAL" ]; then
              echo "✓ All snapshots complete"
              kubectl get volumesnapshot -l snapshot-group=$GROUP_ID
              exit 0
            fi

            sleep 5
          done

          echo "WARNING: Some snapshots may still be processing"
          kubectl get volumesnapshot -l snapshot-group=$GROUP_ID
```

## Restoring Multi-Volume Snapshot Groups

Restore all volumes from a snapshot group:

```bash
#!/bin/bash
# restore-snapshot-group.sh

set -e

GROUP_ID="${1}"
TARGET_NAMESPACE="${2:-default}"

if [ -z "$GROUP_ID" ]; then
  echo "Usage: $0 <snapshot-group-id> [target-namespace]"
  exit 1
fi

echo "=== Restoring snapshot group: $GROUP_ID ==="
echo "Target namespace: $TARGET_NAMESPACE"

# Get all snapshots in the group
SNAPSHOTS=$(kubectl get volumesnapshot -l snapshot-group=$GROUP_ID \
  -o jsonpath='{.items[*].metadata.name}')

if [ -z "$SNAPSHOTS" ]; then
  echo "ERROR: No snapshots found for group $GROUP_ID"
  exit 1
fi

echo "Found snapshots: $SNAPSHOTS"

# Create PVCs from each snapshot
for SNAPSHOT in $SNAPSHOTS; do
  # Get original PVC name from label
  PVC_NAME=$(kubectl get volumesnapshot $SNAPSHOT \
    -o jsonpath='{.metadata.labels.pvc-name}')

  if [ -z "$PVC_NAME" ]; then
    echo "WARNING: No pvc-name label on $SNAPSHOT, skipping"
    continue
  fi

  # Get restore size
  RESTORE_SIZE=$(kubectl get volumesnapshot $SNAPSHOT \
    -o jsonpath='{.status.restoreSize}')

  RESTORED_PVC="${PVC_NAME}-restored"

  echo "Restoring $PVC_NAME to $RESTORED_PVC..."

  kubectl apply -n $TARGET_NAMESPACE -f - <<EOF
apiVersion: v1
kind: PersistentVolumeClaim
metadata:
  name: $RESTORED_PVC
  labels:
    restored-from-group: $GROUP_ID
    original-pvc: $PVC_NAME
spec:
  accessModes:
    - ReadWriteOnce
  resources:
    requests:
      storage: $RESTORE_SIZE
  storageClassName: standard
  dataSource:
    name: $SNAPSHOT
    kind: VolumeSnapshot
    apiGroup: snapshot.storage.k8s.io
EOF

done

echo "Waiting for all PVCs to be bound..."

kubectl wait -n $TARGET_NAMESPACE \
  --for=jsonpath='{.status.phase}'=Bound \
  pvc -l restored-from-group=$GROUP_ID --timeout=600s

echo "✓ All volumes restored from group $GROUP_ID"
kubectl get pvc -n $TARGET_NAMESPACE -l restored-from-group=$GROUP_ID
```

## Scheduled Multi-Volume Snapshots

Create a CronJob for regular multi-volume snapshots:

```yaml
apiVersion: batch/v1
kind: CronJob
metadata:
  name: scheduled-multi-volume-snapshot
spec:
  schedule: "0 2 * * *"  # Daily at 2 AM
  jobTemplate:
    spec:
      template:
        spec:
          serviceAccountName: snapshot-creator
          restartPolicy: OnFailure
          containers:
          - name: snapshot-group-creator
            image: bitnami/kubectl:latest
            env:
            - name: RETENTION_DAYS
              value: "7"
            command:
            - /bin/bash
            - -c
            - |
              set -e

              GROUP_ID="scheduled-$(date +%Y%m%d-%H%M)"
              echo "Creating scheduled snapshot group: $GROUP_ID"

              # Define volume groups
              declare -A VOLUME_GROUPS
              VOLUME_GROUPS[postgres]="postgres-data-pvc postgres-wal-pvc"
              VOLUME_GROUPS[redis]="redis-pvc"
              VOLUME_GROUPS[mongodb]="mongodb-pvc mongodb-config-pvc"

              # Create snapshots for all volumes
              for APP in "${!VOLUME_GROUPS[@]}"; do
                for PVC in ${VOLUME_GROUPS[$APP]}; do
                  kubectl apply -f - <<EOF
              apiVersion: snapshot.storage.k8s.io/v1
              kind: VolumeSnapshot
              metadata:
                name: ${PVC}-${GROUP_ID}
                labels:
                  snapshot-group: $GROUP_ID
                  app: $APP
                  pvc-name: $PVC
                  schedule: daily
                  retention-days: "$RETENTION_DAYS"
              spec:
                volumeSnapshotClassName: csi-snapshot-class
                source:
                  persistentVolumeClaimName: $PVC
              EOF
                done
              done

              # Wait for completion
              TOTAL=$(kubectl get volumesnapshot -l snapshot-group=$GROUP_ID --no-headers | wc -l)

              for i in {1..120}; do
                READY=$(kubectl get volumesnapshot -l snapshot-group=$GROUP_ID \
                  -o json | jq '[.items[] | select(.status.readyToUse == true)] | length')

                if [ "$READY" = "$TOTAL" ]; then
                  echo "✓ Snapshot group $GROUP_ID complete"
                  exit 0
                fi
                sleep 5
              done

              echo "WARNING: Snapshot group creation incomplete"
              exit 1
```

## Cleanup Old Snapshot Groups

Remove expired snapshot groups:

```yaml
apiVersion: batch/v1
kind: CronJob
metadata:
  name: cleanup-snapshot-groups
spec:
  schedule: "0 3 * * *"
  jobTemplate:
    spec:
      template:
        spec:
          serviceAccountName: snapshot-creator
          restartPolicy: OnFailure
          containers:
          - name: cleanup
            image: bitnami/kubectl:latest
            command:
            - /bin/bash
            - -c
            - |
              set -e

              echo "=== Cleaning up old snapshot groups ==="

              # Get all snapshot groups
              GROUPS=$(kubectl get volumesnapshot -o json | \
                jq -r '[.items[].metadata.labels."snapshot-group"] | unique | .[]')

              for GROUP in $GROUPS; do
                # Get retention days for this group
                RETENTION=$(kubectl get volumesnapshot -l snapshot-group=$GROUP \
                  -o jsonpath='{.items[0].metadata.labels.retention-days}' 2>/dev/null || echo "7")

                # Get oldest snapshot in group
                OLDEST=$(kubectl get volumesnapshot -l snapshot-group=$GROUP \
                  --sort-by=.metadata.creationTimestamp \
                  -o jsonpath='{.items[0].metadata.creationTimestamp}')

                if [ -z "$OLDEST" ]; then
                  continue
                fi

                # Calculate age
                OLDEST_TS=$(date -d "$OLDEST" +%s)
                NOW_TS=$(date +%s)
                AGE_DAYS=$(( ($NOW_TS - $OLDEST_TS) / 86400 ))

                if [ $AGE_DAYS -gt $RETENTION ]; then
                  echo "Deleting snapshot group: $GROUP (age: $AGE_DAYS days)"

                  # Delete all snapshots in the group
                  kubectl delete volumesnapshot -l snapshot-group=$GROUP

                  echo "✓ Deleted group $GROUP"
                else
                  echo "Keeping group $GROUP (age: $AGE_DAYS days, retention: $RETENTION days)"
                fi
              done

              echo "✓ Cleanup complete"
```

## Monitoring Snapshot Groups

Create a monitoring script:

```bash
#!/bin/bash
# monitor-snapshot-groups.sh

echo "=== Snapshot Group Status ==="
echo

# List all groups
GROUPS=$(kubectl get volumesnapshot -o json | \
  jq -r '[.items[].metadata.labels."snapshot-group"] | unique | .[]' | sort)

for GROUP in $GROUPS; do
  echo "Group: $GROUP"

  TOTAL=$(kubectl get volumesnapshot -l snapshot-group=$GROUP --no-headers | wc -l)
  READY=$(kubectl get volumesnapshot -l snapshot-group=$GROUP \
    -o json | jq '[.items[] | select(.status.readyToUse == true)] | length')
  FAILED=$(kubectl get volumesnapshot -l snapshot-group=$GROUP \
    -o json | jq '[.items[] | select(.status.error != null)] | length')

  CREATED=$(kubectl get volumesnapshot -l snapshot-group=$GROUP \
    --sort-by=.metadata.creationTimestamp \
    -o jsonpath='{.items[0].metadata.creationTimestamp}')

  echo "  Total: $TOTAL"
  echo "  Ready: $READY"
  echo "  Failed: $FAILED"
  echo "  Created: $CREATED"

  if [ "$READY" = "$TOTAL" ]; then
    echo "  Status: ✓ Complete"
  elif [ "$FAILED" -gt 0 ]; then
    echo "  Status: ✗ Failed"
  else
    echo "  Status: ⏳ In Progress"
  fi

  echo
done
```

## Best Practices

1. **Use consistent group IDs** with timestamps for tracking
2. **Minimize freeze time** for application-consistent snapshots
3. **Monitor all snapshots** in a group for completion
4. **Label snapshots** with group metadata and retention policies
5. **Test multi-volume restores** to verify consistency
6. **Document volume relationships** for your applications
7. **Implement cleanup** to prevent snapshot accumulation
8. **Set appropriate timeouts** for group creation

Multi-volume snapshot grouping ensures consistent backups for complex applications with multiple persistent volumes. Proper implementation provides reliable recovery points for disaster scenarios.
