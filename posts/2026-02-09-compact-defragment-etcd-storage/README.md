# How to Compact and Defragment etcd to Reclaim Storage Space

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Kubernetes, etcd, Storage, Performance

Description: Learn how to compact and defragment etcd databases to reclaim disk space, improve performance, and maintain healthy Kubernetes cluster storage with automated maintenance procedures.

---

etcd stores every change to Kubernetes cluster state as a new revision. Over time, these revisions accumulate and consume disk space. While etcd keeps old revisions for history and consistency, most are no longer needed. Compaction removes old revisions, and defragmentation reclaims the freed space by rewriting the database file.

## Understanding etcd Storage Growth

etcd uses a multi-version concurrency control (MVCC) model. Each write creates a new revision while keeping old revisions. This allows point-in-time reads and watch operations to see historical state. However, unlimited history would fill the disk.

Check current database size and revision count:

```bash
# Set up etcdctl environment
export ETCDCTL_API=3
export ETCDCTL_ENDPOINTS=https://127.0.0.1:2379
export ETCDCTL_CACERT=/etc/kubernetes/pki/etcd/ca.crt
export ETCDCTL_CERT=/etc/kubernetes/pki/etcd/server.crt
export ETCDCTL_KEY=/etc/kubernetes/pki/etcd/server.key

# Check database size
etcdctl endpoint status --cluster -w table

# Get detailed status
etcdctl endpoint status --endpoints=$ETCDCTL_ENDPOINTS -w json | \
  jq '{dbSize: .Status.dbSize, leader: .Status.leader, revision: .Status.revision}'
```

Check current history retention:

```bash
# Get compaction revision
etcdctl get --prefix "" --keys-only --limit 1 -w json | \
  jq .header.revision

# Calculate approximate number of stored revisions
# This is the difference between current revision and compacted revision
```

## Performing Manual Compaction

Compaction marks old revisions for deletion. Specify which revision to compact to:

```bash
# Get current revision
CURRENT_REVISION=$(etcdctl endpoint status -w json | \
  jq -r '.[] | .Status.revision')

echo "Current revision: $CURRENT_REVISION"

# Compact to current revision (removes all old revisions)
# Keep a small buffer (e.g., keep last 1000 revisions)
COMPACT_REVISION=$((CURRENT_REVISION - 1000))

etcdctl compact $COMPACT_REVISION

# Verify compaction
etcdctl endpoint status -w table
```

After compaction, the database size (DB SIZE) will not immediately decrease. The space is marked as free but not reclaimed until defragmentation.

## Defragmenting the Database

Defragmentation rewrites the database file to reclaim space:

```bash
# Check size before defragmentation
etcdctl endpoint status -w table

# Defragment all cluster members
# This must be done on each member separately
for endpoint in https://10.0.1.10:2379 https://10.0.1.11:2379 https://10.0.1.12:2379; do
  echo "Defragmenting $endpoint"
  etcdctl --endpoints=$endpoint defrag
  echo "Completed $endpoint"
  sleep 5
done

# Check size after defragmentation
etcdctl endpoint status -w table
```

Defragmentation blocks writes to that member, so do one member at a time to maintain cluster availability.

## Setting Up Automatic Compaction

Configure etcd to automatically compact old revisions:

```bash
# Edit etcd configuration
sudo nano /etc/etcd/etcd.conf
```

Add auto-compaction settings:

```bash
# Compact revisions older than 5 minutes
ETCD_AUTO_COMPACTION_MODE=periodic
ETCD_AUTO_COMPACTION_RETENTION=5m

# Alternative: Keep only last 1000 revisions
# ETCD_AUTO_COMPACTION_MODE=revision
# ETCD_AUTO_COMPACTION_RETENTION=1000
```

Restart etcd to apply changes:

```bash
sudo systemctl restart etcd

# Verify auto-compaction is enabled
journalctl -u etcd | grep -i compaction
```

For kubeadm clusters, edit the API server manifest to pass auto-compaction to etcd:

```bash
sudo nano /etc/kubernetes/manifests/kube-apiserver.yaml
```

Add these flags:

```yaml
spec:
  containers:
  - command:
    - kube-apiserver
    - --etcd-compaction-interval=5m
    # Other flags...
```

## Creating a Defragmentation Cron Job

Automate defragmentation with a cron job:

```bash
# Create defragmentation script
sudo nano /usr/local/bin/etcd-defrag.sh
```

Add this content:

```bash
#!/bin/bash
# etcd-defrag.sh

set -e

# etcd configuration
export ETCDCTL_API=3
export ETCDCTL_CACERT=/etc/kubernetes/pki/etcd/ca.crt
export ETCDCTL_CERT=/etc/kubernetes/pki/etcd/server.crt
export ETCDCTL_KEY=/etc/kubernetes/pki/etcd/server.key

# Log file
LOGFILE=/var/log/etcd-defrag.log

# Get cluster endpoints
ENDPOINTS=$(etcdctl --endpoints=https://127.0.0.1:2379 member list -w json | \
  jq -r '.members[].clientURLs[]' | paste -sd,)

echo "$(date): Starting etcd defragmentation" >> $LOGFILE

# Get size before
BEFORE=$(etcdctl --endpoints=https://127.0.0.1:2379 endpoint status -w json | \
  jq -r '.[] | .Status.dbSize')

echo "$(date): Database size before: $BEFORE bytes" >> $LOGFILE

# Defragment each member
for endpoint in $(echo $ENDPOINTS | tr ',' ' '); do
  echo "$(date): Defragmenting $endpoint" >> $LOGFILE

  if etcdctl --endpoints=$endpoint defrag >> $LOGFILE 2>&1; then
    echo "$(date): Successfully defragmented $endpoint" >> $LOGFILE
  else
    echo "$(date): Failed to defragment $endpoint" >> $LOGFILE
  fi

  # Wait between members
  sleep 10
done

# Get size after
AFTER=$(etcdctl --endpoints=https://127.0.0.1:2379 endpoint status -w json | \
  jq -r '.[] | .Status.dbSize')

SAVED=$((BEFORE - AFTER))
echo "$(date): Database size after: $AFTER bytes" >> $LOGFILE
echo "$(date): Space reclaimed: $SAVED bytes" >> $LOGFILE
echo "$(date): Defragmentation complete" >> $LOGFILE
```

Make it executable:

```bash
sudo chmod +x /usr/local/bin/etcd-defrag.sh
```

Create a cron job to run it weekly:

```bash
# Edit crontab
sudo crontab -e

# Add this line to run every Sunday at 2 AM
0 2 * * 0 /usr/local/bin/etcd-defrag.sh
```

## Deploying a Kubernetes CronJob for Defragmentation

For managed etcd, use a Kubernetes CronJob:

```yaml
apiVersion: v1
kind: ServiceAccount
metadata:
  name: etcd-defrag
  namespace: kube-system
---
apiVersion: rbac.authorization.k8s.io/v1
kind: ClusterRole
metadata:
  name: etcd-defrag
rules:
- apiGroups: [""]
  resources: ["pods", "pods/exec"]
  verbs: ["get", "list", "create"]
---
apiVersion: rbac.authorization.k8s.io/v1
kind: ClusterRoleBinding
metadata:
  name: etcd-defrag
roleRef:
  apiGroup: rbac.authorization.k8s.io
  kind: ClusterRole
  name: etcd-defrag
subjects:
- kind: ServiceAccount
  name: etcd-defrag
  namespace: kube-system
---
apiVersion: batch/v1
kind: CronJob
metadata:
  name: etcd-defrag
  namespace: kube-system
spec:
  schedule: "0 2 * * 0"  # Every Sunday at 2 AM
  concurrencyPolicy: Forbid
  successfulJobsHistoryLimit: 3
  failedJobsHistoryLimit: 3
  jobTemplate:
    spec:
      template:
        spec:
          serviceAccountName: etcd-defrag
          hostNetwork: true
          containers:
          - name: defrag
            image: registry.k8s.io/etcd:3.5.9-0
            command:
            - /bin/sh
            - -c
            - |
              set -e

              export ETCDCTL_API=3
              export ETCDCTL_CACERT=/etc/kubernetes/pki/etcd/ca.crt
              export ETCDCTL_CERT=/etc/kubernetes/pki/etcd/server.crt
              export ETCDCTL_KEY=/etc/kubernetes/pki/etcd/server.key

              echo "Starting defragmentation..."

              # Get current size
              BEFORE=$(etcdctl --endpoints=https://127.0.0.1:2379 endpoint status -w json | \
                jq -r '.[] | .Status.dbSize')
              echo "Database size before: $BEFORE bytes"

              # Compact
              REVISION=$(etcdctl --endpoints=https://127.0.0.1:2379 endpoint status -w json | \
                jq -r '.[] | .Status.revision')
              COMPACT_REV=$((REVISION - 1000))
              etcdctl --endpoints=https://127.0.0.1:2379 compact $COMPACT_REV
              echo "Compacted to revision $COMPACT_REV"

              # Defragment
              etcdctl --endpoints=https://127.0.0.1:2379 defrag
              echo "Defragmentation complete"

              # Get new size
              AFTER=$(etcdctl --endpoints=https://127.0.0.1:2379 endpoint status -w json | \
                jq -r '.[] | .Status.dbSize')
              SAVED=$((BEFORE - AFTER))
              echo "Database size after: $AFTER bytes"
              echo "Space reclaimed: $SAVED bytes"
            volumeMounts:
            - name: etcd-certs
              mountPath: /etc/kubernetes/pki/etcd
              readOnly: true
          restartPolicy: OnFailure
          nodeSelector:
            node-role.kubernetes.io/control-plane: ""
          tolerations:
          - effect: NoSchedule
            operator: Exists
          volumes:
          - name: etcd-certs
            hostPath:
              path: /etc/kubernetes/pki/etcd
              type: Directory
```

Apply the CronJob:

```bash
kubectl apply -f etcd-defrag-cronjob.yaml

# Verify it's created
kubectl get cronjobs -n kube-system

# Manually trigger a job to test
kubectl create job --from=cronjob/etcd-defrag etcd-defrag-manual -n kube-system

# Watch the job
kubectl get jobs -n kube-system -w

# Check logs
kubectl logs -n kube-system -l job-name=etcd-defrag-manual
```

## Monitoring Compaction and Defragmentation

Track compaction and defragmentation effectiveness:

```bash
# Check compaction metrics
etcdctl endpoint status --endpoints=$ETCDCTL_ENDPOINTS -w json | \
  jq '{
    dbSize: .Status.dbSize,
    revision: .Status.revision,
    dbSizeMB: (.Status.dbSize / 1024 / 1024)
  }'

# Monitor disk usage trends
df -h /var/lib/etcd

# Check etcd logs for compaction events
journalctl -u etcd | grep -i "compaction\|defrag"

# Set up Prometheus metrics
cat <<EOF | kubectl apply -f -
apiVersion: v1
kind: ServiceMonitor
metadata:
  name: etcd
  namespace: monitoring
spec:
  selector:
    matchLabels:
      component: etcd
  endpoints:
  - port: metrics
    interval: 30s
EOF
```

Create Grafana dashboard queries:

```promql
# Database size
etcd_mvcc_db_total_size_in_bytes

# Number of keys
etcd_debugging_mvcc_keys_total

# Compaction duration
histogram_quantile(0.99,
  rate(etcd_disk_backend_commit_duration_seconds_bucket[5m]))

# Defragmentation duration
rate(etcd_debugging_mvcc_db_compaction_total_duration_milliseconds[5m])
```

## Handling Large Databases

For very large etcd databases, take extra precautions:

```bash
# Check if database is too large (over 2GB is concerning)
SIZE=$(etcdctl endpoint status -w json | jq -r '.[] | .Status.dbSize')
SIZE_GB=$(echo "scale=2; $SIZE / 1024 / 1024 / 1024" | bc)

echo "Database size: ${SIZE_GB}GB"

if (( $(echo "$SIZE_GB > 2" | bc -l) )); then
  echo "WARNING: Database is large. Defragmentation may take a long time."
  echo "Consider scheduling during maintenance window."
fi

# For very large databases, compact more aggressively
CURRENT_REV=$(etcdctl endpoint status -w json | jq -r '.[] | .Status.revision')
# Keep only last 100 revisions for aggressive compaction
COMPACT_REV=$((CURRENT_REV - 100))

etcdctl compact $COMPACT_REV

# Then defragment
etcdctl defrag
```

## Troubleshooting Compaction Issues

Debug compaction and defragmentation problems:

```bash
# Check for compaction errors
journalctl -u etcd | grep -i "compaction.*error"

# Verify auto-compaction is working
journalctl -u etcd | grep "finished scheduled compaction"

# Check if defragmentation succeeded
journalctl -u etcd | grep "defragment.*success"

# If defragmentation hangs, check locks
etcdctl --endpoints=https://127.0.0.1:2379 get --prefix / --keys-only | wc -l

# Check for corrupted database
etcdctl check perf

# View detailed database info
etcdctl --endpoints=https://127.0.0.1:2379 endpoint status -w json | jq .
```

Regular compaction and defragmentation prevent etcd from consuming excessive disk space and maintain query performance. Set up automated processes to run these operations during low-traffic periods, and monitor disk usage trends to catch issues before they cause outages.
