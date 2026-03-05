# How to Test Backup Integrity on Talos Linux

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Talos Linux, Backup, Testing, Data Integrity, Kubernetes

Description: Learn how to systematically test backup integrity on Talos Linux to ensure your disaster recovery plan actually works when you need it.

---

Every operations team has a backup strategy. Far fewer have a backup testing strategy. Taking backups of your Talos Linux cluster is only half the equation. If you have never verified that those backups can actually restore your workloads, you are operating on faith rather than evidence. This guide covers practical approaches to testing backup integrity on Talos Linux clusters, from basic validation to full restore drills.

## Why Backup Testing Matters

Backups fail silently more often than you might think. Storage corruption, incomplete snapshots, expired credentials, and schema changes can all render a backup useless. The only way to know your backups work is to restore from them regularly. On Talos Linux, where the operating system itself is immutable and API-driven, there are some specific considerations that make testing even more important.

## Checking Velero Backup Status

If you are using Velero for backups, the first level of verification is checking that backups complete successfully:

```bash
# List recent backups and their status
velero backup get

# Get detailed information about a specific backup
velero backup describe my-backup-20260303

# Check for any warnings or errors
velero backup logs my-backup-20260303 | grep -E "error|warning|fail"
```

Look for backups with a status of "Completed" and zero errors. Warnings are worth investigating but do not necessarily mean the backup is unusable.

```bash
#!/bin/bash
# check-backup-status.sh
# Validates that recent backups completed without errors

HOURS_THRESHOLD=24

# Get backups from the last N hours
RECENT_BACKUPS=$(velero backup get -o json | jq -r --arg hours "$HOURS_THRESHOLD" \
    '[.items[] | select(
        (.status.completionTimestamp | fromdateiso8601) > (now - ($hours | tonumber * 3600))
    )] | .[] | .metadata.name')

FAILED=0
for backup in $RECENT_BACKUPS; do
    STATUS=$(velero backup get "$backup" -o json | jq -r '.status.phase')
    ERRORS=$(velero backup get "$backup" -o json | jq -r '.status.errors // 0')

    if [ "$STATUS" != "Completed" ] || [ "$ERRORS" -gt 0 ]; then
        echo "FAIL: $backup - Status: $STATUS, Errors: $ERRORS"
        FAILED=$((FAILED + 1))
    else
        echo "OK: $backup"
    fi
done

if [ "$FAILED" -gt 0 ]; then
    echo "WARNING: $FAILED backup(s) have issues"
    exit 1
fi
```

## Level 1: Metadata Validation

The quickest integrity check verifies that backup metadata is intact and the backup contains the expected resources:

```bash
#!/bin/bash
# validate-backup-metadata.sh
# Checks that a backup contains expected resources

BACKUP_NAME=$1

# Get the backup contents summary
velero backup describe "$BACKUP_NAME" --details

# Check resource counts
RESOURCE_COUNT=$(velero backup describe "$BACKUP_NAME" -o json | \
    jq '.status.progress.itemsBackedUp')

if [ "$RESOURCE_COUNT" -lt 1 ]; then
    echo "ERROR: Backup contains no resources"
    exit 1
fi

echo "Backup contains $RESOURCE_COUNT resources"

# Verify expected namespaces are included
EXPECTED_NAMESPACES=("production" "staging" "monitoring")
BACKED_UP_NS=$(velero backup describe "$BACKUP_NAME" -o json | \
    jq -r '.spec.includedNamespaces[]' 2>/dev/null)

for ns in "${EXPECTED_NAMESPACES[@]}"; do
    if echo "$BACKED_UP_NS" | grep -q "$ns"; then
        echo "OK: Namespace $ns is included"
    else
        echo "WARNING: Namespace $ns may not be included"
    fi
done
```

## Level 2: Restore to a Test Namespace

The most reliable test is actually restoring the backup. Use namespace mapping to restore into a test namespace so you do not affect production:

```bash
# Restore production backup into a test namespace
velero restore create integrity-test \
    --from-backup apps-backup-20260303 \
    --namespace-mappings production:restore-test \
    --wait

# Check the restore status
velero restore describe integrity-test
```

Now verify that the restored resources look correct:

```bash
#!/bin/bash
# validate-restore.sh
# Validates a restored namespace against expected state

TEST_NS="restore-test"
SOURCE_NS="production"

# Compare deployment counts
SOURCE_DEPS=$(kubectl get deployments -n "$SOURCE_NS" --no-headers | wc -l | tr -d ' ')
RESTORED_DEPS=$(kubectl get deployments -n "$TEST_NS" --no-headers | wc -l | tr -d ' ')

echo "Deployments - Source: $SOURCE_DEPS, Restored: $RESTORED_DEPS"

if [ "$SOURCE_DEPS" -ne "$RESTORED_DEPS" ]; then
    echo "MISMATCH: Deployment count differs"
fi

# Check that restored pods are running
NOT_RUNNING=$(kubectl get pods -n "$TEST_NS" --no-headers | grep -v Running | grep -v Completed | wc -l | tr -d ' ')

if [ "$NOT_RUNNING" -gt 0 ]; then
    echo "WARNING: $NOT_RUNNING pods are not in Running state"
    kubectl get pods -n "$TEST_NS" --no-headers | grep -v Running | grep -v Completed
fi

# Verify configmaps and secrets exist
SOURCE_CM=$(kubectl get configmaps -n "$SOURCE_NS" --no-headers | wc -l | tr -d ' ')
RESTORED_CM=$(kubectl get configmaps -n "$TEST_NS" --no-headers | wc -l | tr -d ' ')
echo "ConfigMaps - Source: $SOURCE_CM, Restored: $RESTORED_CM"

SOURCE_SEC=$(kubectl get secrets -n "$SOURCE_NS" --no-headers | wc -l | tr -d ' ')
RESTORED_SEC=$(kubectl get secrets -n "$TEST_NS" --no-headers | wc -l | tr -d ' ')
echo "Secrets - Source: $SOURCE_SEC, Restored: $RESTORED_SEC"
```

## Level 3: Data Integrity Verification

For stateful workloads, you need to verify that the actual data is intact, not just the Kubernetes resources:

```bash
#!/bin/bash
# verify-database-backup.sh
# Checks that database data was properly backed up and restored

TEST_NS="restore-test"

# Port-forward to the restored database
kubectl port-forward -n "$TEST_NS" svc/postgres 15432:5432 &
PF_PID=$!
sleep 3

# Run integrity checks
PGPASSWORD=test psql -h localhost -p 15432 -U app -d mydb -c "
    -- Check table count
    SELECT count(*) as table_count
    FROM information_schema.tables
    WHERE table_schema = 'public';
"

PGPASSWORD=test psql -h localhost -p 15432 -U app -d mydb -c "
    -- Check row counts for critical tables
    SELECT 'users' as table_name, count(*) as row_count FROM users
    UNION ALL
    SELECT 'orders', count(*) FROM orders
    UNION ALL
    SELECT 'products', count(*) FROM products;
"

# Kill the port-forward
kill $PF_PID

# Compare with expected counts (you should track these)
echo "Compare the above counts with your production baselines"
```

## Level 4: Application-Level Testing

The gold standard is running your application's test suite against the restored environment:

```bash
#!/bin/bash
# run-restore-tests.sh
# Runs application tests against a restored backup

TEST_NS="restore-test"

# Wait for all pods to be ready
kubectl wait --for=condition=ready pods --all -n "$TEST_NS" --timeout=300s

# Get the service endpoint
APP_URL=$(kubectl get svc -n "$TEST_NS" my-app -o jsonpath='{.spec.clusterIP}')

# Run health checks
HTTP_STATUS=$(kubectl run curl-test --rm -i --restart=Never \
    --image=curlimages/curl -- \
    curl -s -o /dev/null -w "%{http_code}" "http://$APP_URL:8080/health")

echo "Health check returned: $HTTP_STATUS"

if [ "$HTTP_STATUS" -ne 200 ]; then
    echo "FAIL: Application health check failed"
    exit 1
fi

# Run smoke tests
kubectl run smoke-test --rm -i --restart=Never \
    --image=curlimages/curl -- \
    curl -s "http://$APP_URL:8080/api/v1/status" | jq .
```

## Automating Integrity Tests with CronJobs

Run these tests automatically on a schedule:

```yaml
apiVersion: batch/v1
kind: CronJob
metadata:
  name: backup-integrity-test
  namespace: backup-system
spec:
  schedule: "0 4 * * 1"  # Every Monday at 4 AM
  jobTemplate:
    spec:
      template:
        spec:
          serviceAccountName: backup-tester
          containers:
          - name: tester
            image: bitnami/kubectl:latest
            command: ["/bin/bash", "-c"]
            args:
            - |
              # Get the latest backup name
              LATEST=$(velero backup get -o json | \
                  jq -r '[.items[] | select(.status.phase=="Completed")] | sort_by(.status.completionTimestamp) | last | .metadata.name')

              # Restore to test namespace
              velero restore create "integrity-$(date +%Y%m%d)" \
                  --from-backup "$LATEST" \
                  --namespace-mappings production:integrity-test \
                  --wait

              # Run validation
              /scripts/validate-restore.sh

              # Clean up
              kubectl delete namespace integrity-test --wait=false
          restartPolicy: OnFailure
```

## Testing Talos Machine Config Backups

On Talos Linux, you should also verify your machine configuration backups:

```bash
# Export and verify current machine config
talosctl get machineconfig -o yaml --nodes $NODE_IP > config-backup.yaml

# Validate the config syntax
talosctl validate --config config-backup.yaml --mode metal

# Compare with your stored backup
diff <(talosctl get machineconfig -o yaml --nodes $NODE_IP) \
     /backups/talos-configs/node1-config.yaml
```

## Cleanup After Testing

Always clean up test resources to avoid wasting cluster capacity:

```bash
#!/bin/bash
# cleanup-restore-tests.sh
# Removes test namespaces and restore objects

# Delete test namespaces
kubectl delete namespace restore-test --wait=false 2>/dev/null
kubectl delete namespace integrity-test --wait=false 2>/dev/null

# Clean up old Velero restore objects
velero restore get -o json | jq -r \
    '.items[] | select(.metadata.name | startswith("integrity-")) | .metadata.name' | \
    while read restore; do
        velero restore delete "$restore" --confirm
    done

echo "Cleanup complete"
```

## Wrapping Up

Testing backup integrity is not optional - it is the difference between having backups and having recoverable backups. Start with basic status checks, graduate to namespace-level restores, and eventually work your way up to full application-level validation. Schedule these tests to run automatically and alert when they fail. The worst time to discover your backups are broken is during an actual outage.
