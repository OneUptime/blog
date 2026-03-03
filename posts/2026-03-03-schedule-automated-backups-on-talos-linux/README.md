# How to Schedule Automated Backups on Talos Linux

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Talos Linux, Automated Backups, Kubernetes, Velero, Disaster Recovery

Description: Learn how to set up automated backup schedules on Talos Linux for Kubernetes resources, persistent volumes, and etcd data.

---

Manual backups are unreliable. People forget, processes get skipped, and when disaster strikes you find out your last backup was from three weeks ago. Automated backups eliminate this risk by running on a predictable schedule without human intervention. On Talos Linux, where everything is API-driven and declarative, automated backups fit naturally into the operational model.

This guide covers setting up comprehensive automated backup schedules for a Talos Linux cluster, including Kubernetes resources, persistent volumes, etcd snapshots, and Talos machine configurations.

## Backup Strategy Overview

A good backup strategy uses multiple layers with different frequencies:

| Backup Type | Frequency | Retention | Tool |
|---|---|---|---|
| Critical namespaces | Hourly | 48 hours | Velero |
| Full cluster | Daily | 30 days | Velero |
| Full cluster + PVs | Weekly | 90 days | Velero |
| etcd snapshot | Every 6 hours | 7 days | talosctl + CronJob |
| Talos machine config | On change | Indefinite | Custom script |

## Setting Up Velero Schedules

Velero has built-in scheduling support using cron syntax.

### Hourly Backup of Critical Namespaces

```bash
# Hourly backup of production and critical system namespaces
velero schedule create hourly-critical \
  --schedule "0 * * * *" \
  --include-namespaces production,payments,auth \
  --default-volumes-to-fs-backup \
  --ttl 48h \
  --labels backup-tier=critical

# Verify the schedule was created
velero schedule get
velero schedule describe hourly-critical
```

### Daily Full Cluster Backup

```bash
# Daily backup at 2 AM, retain for 30 days
velero schedule create daily-full \
  --schedule "0 2 * * *" \
  --exclude-namespaces velero,kube-system \
  --ttl 720h \
  --labels backup-tier=daily

# Include persistent volumes in the daily backup
velero schedule create daily-full-with-pvs \
  --schedule "0 2 * * *" \
  --exclude-namespaces velero,kube-system \
  --default-volumes-to-fs-backup \
  --ttl 720h \
  --labels backup-tier=daily-pvs
```

### Weekly Full Backup with Extended Retention

```bash
# Weekly backup on Sunday at 3 AM, retain for 90 days
velero schedule create weekly-full \
  --schedule "0 3 * * 0" \
  --default-volumes-to-fs-backup \
  --ttl 2160h \
  --labels backup-tier=weekly
```

### Monthly Archive Backup

```bash
# Monthly backup on the first of each month, retain for 1 year
velero schedule create monthly-archive \
  --schedule "0 4 1 * *" \
  --default-volumes-to-fs-backup \
  --ttl 8760h \
  --labels backup-tier=monthly
```

## Automated etcd Snapshots

etcd is the brain of your Kubernetes cluster. While Velero backs up Kubernetes resources through the API, etcd snapshots capture the raw database, which can be useful for complete cluster recovery.

```yaml
# etcd-backup-cronjob.yaml
apiVersion: batch/v1
kind: CronJob
metadata:
  name: etcd-backup
  namespace: kube-system
spec:
  schedule: "0 */6 * * *"  # Every 6 hours
  concurrencyPolicy: Forbid
  successfulJobsHistoryLimit: 3
  failedJobsHistoryLimit: 3
  jobTemplate:
    spec:
      template:
        spec:
          # Run on control plane nodes
          nodeSelector:
            node-role.kubernetes.io/control-plane: ""
          tolerations:
            - key: node-role.kubernetes.io/control-plane
              effect: NoSchedule
          containers:
            - name: etcd-backup
              image: ghcr.io/siderolabs/talosctl:latest
              command:
                - /bin/sh
                - -c
                - |
                  TIMESTAMP=$(date +%Y%m%d-%H%M%S)
                  BACKUP_FILE="/backups/etcd-snapshot-${TIMESTAMP}.db"

                  echo "Taking etcd snapshot at $(date)"
                  talosctl etcd snapshot "${BACKUP_FILE}" \
                    --talosconfig /talos/config \
                    --nodes ${NODE_IP}

                  if [ $? -eq 0 ]; then
                    echo "Snapshot saved to ${BACKUP_FILE}"
                    # Upload to S3
                    aws s3 cp "${BACKUP_FILE}" \
                      "s3://etcd-backups-talos/snapshots/${BACKUP_FILE}"
                    echo "Uploaded to S3"
                  else
                    echo "ERROR: etcd snapshot failed"
                    exit 1
                  fi

                  # Clean up old local snapshots (keep last 5)
                  ls -t /backups/etcd-snapshot-*.db | tail -n +6 | xargs rm -f
              env:
                - name: NODE_IP
                  valueFrom:
                    fieldRef:
                      fieldPath: status.hostIP
              volumeMounts:
                - name: backups
                  mountPath: /backups
                - name: talos-config
                  mountPath: /talos
          volumes:
            - name: backups
              hostPath:
                path: /var/etcd-backups
            - name: talos-config
              secret:
                secretName: talosctl-config
          restartPolicy: OnFailure
```

## Backup Verification Jobs

Automated backups are useless if they are corrupted. Set up automated verification.

```yaml
# backup-verification-job.yaml
apiVersion: batch/v1
kind: CronJob
metadata:
  name: backup-verification
  namespace: velero
spec:
  schedule: "0 8 * * *"  # Run daily at 8 AM
  jobTemplate:
    spec:
      template:
        spec:
          serviceAccountName: velero-admin
          containers:
            - name: verifier
              image: velero/velero:latest
              command:
                - /bin/sh
                - -c
                - |
                  echo "=== Backup Verification Report ==="
                  echo "Date: $(date)"
                  echo ""

                  # Check for recent successful backups
                  echo "--- Recent Backups (last 24h) ---"
                  RECENT=$(velero backup get -o json | \
                    jq -r '.items[] |
                    select(.status.phase == "Completed") |
                    select(.status.completionTimestamp > (now - 86400 | strftime("%Y-%m-%dT%H:%M:%SZ"))) |
                    "\(.metadata.name): \(.status.phase) (\(.status.completionTimestamp))"')

                  if [ -z "$RECENT" ]; then
                    echo "WARNING: No successful backups in the last 24 hours!"
                    exit 1
                  else
                    echo "$RECENT"
                  fi

                  echo ""
                  echo "--- Failed Backups ---"
                  FAILED=$(velero backup get -o json | \
                    jq -r '.items[] | select(.status.phase == "Failed" or .status.phase == "PartiallyFailed") | "\(.metadata.name): \(.status.phase)"')

                  if [ -n "$FAILED" ]; then
                    echo "WARNING: Found failed backups:"
                    echo "$FAILED"
                  else
                    echo "No failed backups found"
                  fi

                  echo ""
                  echo "--- Schedule Status ---"
                  velero schedule get

                  echo ""
                  echo "--- Storage Location Status ---"
                  velero backup-location get

                  echo ""
                  echo "Verification completed at $(date)"
          restartPolicy: OnFailure
```

## Automated Test Restores

The only way to be sure backups work is to test the restore process.

```yaml
# test-restore-cronjob.yaml
apiVersion: batch/v1
kind: CronJob
metadata:
  name: test-restore
  namespace: velero
spec:
  schedule: "0 6 * * 6"  # Every Saturday at 6 AM
  jobTemplate:
    spec:
      template:
        spec:
          serviceAccountName: velero-admin
          containers:
            - name: restore-tester
              image: velero/velero:latest
              command:
                - /bin/sh
                - -c
                - |
                  set -e
                  TIMESTAMP=$(date +%Y%m%d)

                  # Find the latest successful backup
                  LATEST_BACKUP=$(velero backup get -o json | \
                    jq -r '[.items[] | select(.status.phase == "Completed")] | sort_by(.status.completionTimestamp) | last | .metadata.name')

                  echo "Testing restore from: $LATEST_BACKUP"

                  # Restore to a test namespace
                  velero restore create "test-restore-${TIMESTAMP}" \
                    --from-backup "$LATEST_BACKUP" \
                    --include-namespaces production \
                    --namespace-mappings production:restore-test \
                    --wait

                  # Verify resources exist
                  DEPLOY_COUNT=$(kubectl get deployments -n restore-test --no-headers 2>/dev/null | wc -l)
                  SVC_COUNT=$(kubectl get services -n restore-test --no-headers 2>/dev/null | wc -l)

                  echo "Restored: ${DEPLOY_COUNT} deployments, ${SVC_COUNT} services"

                  if [ "$DEPLOY_COUNT" -eq 0 ]; then
                    echo "ERROR: No deployments restored - backup may be empty or corrupted"
                    exit 1
                  fi

                  echo "Test restore successful!"

                  # Clean up the test namespace
                  kubectl delete namespace restore-test --wait=false
                  echo "Cleanup initiated"
          restartPolicy: OnFailure
```

## Monitoring Backup Health

Set up comprehensive monitoring for your backup infrastructure.

```yaml
# backup-monitoring-rules.yaml
apiVersion: monitoring.coreos.com/v1
kind: PrometheusRule
metadata:
  name: backup-monitoring
  namespace: monitoring
spec:
  groups:
    - name: backup-health
      rules:
        # Alert if no successful backup in 24 hours
        - alert: NoRecentBackup
          expr: |
            time() - velero_backup_last_successful_timestamp{schedule!=""} > 86400
          for: 30m
          labels:
            severity: critical
          annotations:
            summary: "No successful backup for schedule {{ $labels.schedule }} in 24 hours"

        # Alert on backup failures
        - alert: BackupFailed
          expr: |
            increase(velero_backup_failure_total[1h]) > 0
          for: 0m
          labels:
            severity: warning
          annotations:
            summary: "Velero backup failure detected"

        # Alert on high backup duration
        - alert: BackupTakingTooLong
          expr: |
            velero_backup_duration_seconds{phase="InProgress"} > 3600
          for: 10m
          labels:
            severity: warning
          annotations:
            summary: "Backup has been running for over 1 hour"

        # Alert on backup storage issues
        - alert: BackupStorageUnavailable
          expr: |
            velero_backup_storage_location_is_available == 0
          for: 5m
          labels:
            severity: critical
          annotations:
            summary: "Velero backup storage location is unavailable"
```

## Retention Management

Properly manage backup retention to avoid running out of storage.

```bash
# List all backups and their expiration
velero backup get -o json | \
  jq -r '.items[] | "\(.metadata.name) | Phase: \(.status.phase) | Expires: \(.status.expiration)"' | \
  column -t -s '|'

# Manually delete old backups if needed
velero backup delete old-backup-name --confirm

# Delete all backups older than a specific date
velero backup get -o json | \
  jq -r '.items[] | select(.metadata.creationTimestamp < "2024-01-01") | .metadata.name' | \
  xargs -I {} velero backup delete {} --confirm
```

## Backup Notification Pipeline

Send notifications when backups complete or fail.

```yaml
# backup-notifier.yaml
apiVersion: batch/v1
kind: CronJob
metadata:
  name: backup-status-notifier
  namespace: velero
spec:
  schedule: "30 8 * * *"  # Daily at 8:30 AM
  jobTemplate:
    spec:
      template:
        spec:
          containers:
            - name: notifier
              image: curlimages/curl:latest
              command:
                - /bin/sh
                - -c
                - |
                  # Count backup statuses from the last 24 hours
                  COMPLETED=$(velero backup get -o json | \
                    jq '[.items[] | select(.status.phase == "Completed")] | length')
                  FAILED=$(velero backup get -o json | \
                    jq '[.items[] | select(.status.phase == "Failed" or .status.phase == "PartiallyFailed")] | length')

                  # Send to Slack webhook
                  curl -X POST "$SLACK_WEBHOOK_URL" \
                    -H 'Content-type: application/json' \
                    -d "{
                      \"text\": \"Backup Status Report\\n- Completed: ${COMPLETED}\\n- Failed: ${FAILED}\"
                    }"
              env:
                - name: SLACK_WEBHOOK_URL
                  valueFrom:
                    secretKeyRef:
                      name: slack-webhook
                      key: url
          restartPolicy: OnFailure
```

## Wrapping Up

Automated backups on Talos Linux remove the human factor from disaster recovery preparedness. By layering Velero schedules for Kubernetes resources, etcd snapshots for cluster state, and verification jobs for confidence, you build a backup system that works without manual intervention. The key principles are: automate everything, verify regularly, monitor for failures, and test restores periodically. On Talos Linux, where the OS can be rebuilt from config but your Kubernetes data cannot, automated backups are not optional - they are fundamental to running a production cluster responsibly.
