# How to Test Velero Backup and Restore with Flux CD

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Flux CD, Velero, Backup Testing, Disaster Recovery, GitOps, Kubernetes

Description: Test Velero backup and restore procedures in a Flux CD managed cluster to validate disaster recovery capabilities and ensure backups are restorable.

---

## Introduction

A backup strategy that is never tested is not a backup strategy—it is a false sense of security. Backup systems fail in subtle ways: credentials expire, storage quotas are hit, new resource types are excluded, or application data is not consistent at snapshot time. Regular restore testing is the only way to know that your backups will work when you need them.

Testing Velero backups in a Flux CD managed cluster requires a systematic approach that validates both the backup completeness and the restore procedure, including how it interacts with Flux's reconciliation. This guide covers a complete backup testing workflow including pre-backup validation, post-restore validation, and automated test scheduling.

## Prerequisites

- Velero deployed and configured with a backup schedule
- Flux CD bootstrapped on the cluster
- A test namespace or cluster for restore testing
- `velero`, `kubectl`, and `flux` CLIs installed

## Step 1: Validate Backup Coverage

Before testing restores, ensure backups are complete.

```bash
# List recent backups and check their status
velero backup get --selector schedule=production-apps-hourly

# Check that the backup contains the expected resources
velero backup describe production-apps-hourly-20260313140000 --details \
  | grep -E "(Namespaces|Resources|PVs)"

# Verify backup size is within expected range
velero backup describe production-apps-hourly-20260313140000 \
  | grep -E "(StorageLocation|Size)"

# Check for warnings (missing resources, hooks that failed, etc.)
velero backup logs production-apps-hourly-20260313140000 \
  | grep -i warning
```

## Step 2: Create a Dedicated Test Namespace

```bash
# Deploy a test application with persistent data
kubectl create namespace velero-restore-test

# Deploy a stateful application for testing
cat << 'EOF' | kubectl apply -f -
apiVersion: apps/v1
kind: Deployment
metadata:
  name: test-app
  namespace: velero-restore-test
spec:
  replicas: 2
  selector:
    matchLabels:
      app: test-app
  template:
    metadata:
      labels:
        app: test-app
    spec:
      containers:
        - name: app
          image: nginx:1.25
          ports:
            - containerPort: 80
          volumeMounts:
            - name: data
              mountPath: /data
      volumes:
        - name: data
          persistentVolumeClaim:
            claimName: test-app-data
---
apiVersion: v1
kind: PersistentVolumeClaim
metadata:
  name: test-app-data
  namespace: velero-restore-test
spec:
  accessModes:
    - ReadWriteOnce
  resources:
    requests:
      storage: 1Gi
EOF

# Write test data to the PV
kubectl exec -n velero-restore-test \
  deployment/test-app \
  -- sh -c 'echo "backup-test-data-$(date)" > /data/test-file.txt'

# Record the test data for verification after restore
TEST_DATA=$(kubectl exec -n velero-restore-test \
  deployment/test-app \
  -- cat /data/test-file.txt)
echo "Test data before backup: ${TEST_DATA}"
```

## Step 3: Create a Test Backup

```bash
# Create an on-demand backup of the test namespace
velero backup create velero-restore-test-backup \
  --include-namespaces velero-restore-test \
  --storage-location primary \
  --volume-snapshot-locations primary \
  --wait

# Verify backup completed successfully
velero backup describe velero-restore-test-backup

# Check backup status
BACKUP_STATUS=$(velero backup get velero-restore-test-backup \
  -o jsonpath='{.status.phase}')
echo "Backup status: ${BACKUP_STATUS}"

if [ "${BACKUP_STATUS}" != "Completed" ]; then
  echo "ERROR: Backup did not complete successfully"
  velero backup logs velero-restore-test-backup
  exit 1
fi
```

## Step 4: Delete the Test Namespace

```bash
# Simulate the disaster: delete the namespace
kubectl delete namespace velero-restore-test

# Verify the namespace is gone
kubectl get namespace velero-restore-test
# Expected: Error from server (NotFound)

# Also verify the PVC is gone
kubectl get pvc -n velero-restore-test 2>&1
# Expected: No resources found
```

## Step 5: Restore from Backup

```bash
# Restore the namespace from the backup
velero restore create velero-restore-test-restore \
  --from-backup velero-restore-test-backup \
  --include-namespaces velero-restore-test \
  --wait

# Check restore status
RESTORE_STATUS=$(velero restore get velero-restore-test-restore \
  -o jsonpath='{.status.phase}')
echo "Restore status: ${RESTORE_STATUS}"

if [ "${RESTORE_STATUS}" != "Completed" ]; then
  echo "ERROR: Restore did not complete"
  velero restore describe velero-restore-test-restore --details
  velero restore logs velero-restore-test-restore
  exit 1
fi
```

## Step 6: Validate the Restore

```bash
# Verify the namespace exists
kubectl get namespace velero-restore-test

# Check that all pods are running
kubectl wait --for=condition=Ready pod \
  -l app=test-app \
  -n velero-restore-test \
  --timeout=5m

# Verify the PVC was restored
kubectl get pvc -n velero-restore-test

# Verify the persistent data was restored
RESTORED_DATA=$(kubectl exec -n velero-restore-test \
  deployment/test-app \
  -- cat /data/test-file.txt)

echo "Original data: ${TEST_DATA}"
echo "Restored data: ${RESTORED_DATA}"

if [ "${TEST_DATA}" = "${RESTORED_DATA}" ]; then
  echo "SUCCESS: Data integrity verified"
else
  echo "FAILURE: Data mismatch after restore"
  exit 1
fi
```

## Step 7: Automate Restore Testing with a CronJob

```yaml
# infrastructure/velero/restore-tests/restore-test-cronjob.yaml
apiVersion: batch/v1
kind: CronJob
metadata:
  name: velero-restore-test
  namespace: velero
spec:
  # Run restore test every Sunday at 4 AM
  schedule: "0 4 * * 0"
  jobTemplate:
    spec:
      template:
        spec:
          serviceAccountName: velero-restore-tester
          containers:
            - name: restore-tester
              image: bitnami/kubectl:latest
              command:
                - /bin/bash
                - -c
                - |
                  set -e

                  # Get the latest backup for the test namespace
                  LATEST_BACKUP=$(velero backup get \
                    --selector backup-type=test \
                    -o jsonpath='{.items[0].metadata.name}')

                  # Create restore
                  velero restore create "weekly-restore-test-$(date +%Y%m%d)" \
                    --from-backup "${LATEST_BACKUP}" \
                    --include-namespaces velero-restore-test \
                    --wait

                  # Validate
                  kubectl wait --for=condition=Ready pod \
                    -l app=test-app \
                    -n velero-restore-test \
                    --timeout=5m

                  echo "Restore test PASSED"

                  # Cleanup
                  kubectl delete namespace velero-restore-test
          restartPolicy: OnFailure
```

## Step 8: Monitor Backup and Restore Health

```yaml
# infrastructure/velero/alerts/backup-health-alerts.yaml
apiVersion: notification.toolkit.fluxcd.io/v1beta3
kind: Alert
metadata:
  name: velero-backup-failure
  namespace: flux-system
spec:
  providerRef:
    name: slack-infrastructure
  eventSeverity: error
  eventSources:
    - kind: Kustomization
      name: velero-schedules
      namespace: flux-system
```

## Best Practices

- Run restore tests on a schedule, not just after incidents. Weekly automated restore tests catch failures before they become disasters.
- Test restores to a separate namespace or cluster when possible. Restoring to the same namespace where Flux is running the application risks confusing the test with production.
- Validate data integrity, not just pod availability. Pods starting up does not mean the PV data was correctly restored.
- Include restore testing in your team's disaster recovery runbook. Time yourself running through the procedure—if it takes longer than your RTO, optimize it.
- Alert on backup failures within 30 minutes of the scheduled backup time. A missed backup should be treated with the same urgency as an application alert.

## Conclusion

A complete backup and restore testing workflow for Velero in a Flux CD managed cluster is now established. Regular testing validates that backups are complete, restores work correctly, and data integrity is preserved through the backup and restore cycle. Automated weekly restore tests ensure confidence in your disaster recovery capability without requiring manual intervention.
