# How to Diagnose Kubernetes etcd Database Size Exceeded Errors and Compact the Database

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Kubernetes, etcd, Troubleshooting

Description: Learn how to diagnose and fix etcd database size exceeded errors in Kubernetes, including compaction strategies and prevention techniques to maintain cluster health.

---

When etcd reaches its size limit, your entire Kubernetes cluster stops accepting write operations. API requests fail, deployments hang, and operators panic. Understanding how to diagnose and resolve etcd database size issues is critical for maintaining cluster availability.

## Understanding etcd Size Limits

etcd is the backing store for all Kubernetes cluster data. It stores every resource, event, and metadata object. By default, etcd has a 2GB database size quota. When the database approaches this limit, etcd stops accepting writes to prevent corruption.

The database grows from several sources: resource creation, resource updates, historical revisions, and events. Kubernetes creates many transient objects that accumulate over time, slowly filling the database.

## Symptoms of Database Size Issues

When etcd reaches its quota, API operations fail with specific error messages.

```bash
# Typical error when creating or updating resources
Error from server: etcdserver: mvcc: database space exceeded

# kubectl commands fail
kubectl apply -f deployment.yaml
Error from server: etcdserver: mvcc: database space exceeded

# Cluster appears frozen
kubectl get pods
Error from server: etcdserver: mvcc: database space exceeded
```

The cluster becomes read-only. You can still query existing resources, but any operation creating or modifying resources fails.

## Checking etcd Database Size

First, determine the current database size and quota utilization.

```bash
# For managed Kubernetes (check control plane logs)
kubectl logs -n kube-system etcd-master-node

# For kubeadm clusters, access etcd directly
kubectl exec -it -n kube-system etcd-master-node -- /bin/sh

# Inside etcd pod, check database size
ETCDCTL_API=3 etcdctl \
  --endpoints=https://127.0.0.1:2379 \
  --cacert=/etc/kubernetes/pki/etcd/ca.crt \
  --cert=/etc/kubernetes/pki/etcd/server.crt \
  --key=/etc/kubernetes/pki/etcd/server.key \
  endpoint status --write-out=table

# Output shows DB size and quota
+----------------------------+------------------+---------+---------+-----------+------------+-----------+------------+--------------------+--------+
|          ENDPOINT          |        ID        | VERSION | DB SIZE | IS LEADER | IS LEARNER | RAFT TERM | RAFT INDEX | RAFT APPLIED INDEX | ERRORS |
+----------------------------+------------------+---------+---------+-----------+------------+-----------+------------+--------------------+--------+
| https://127.0.0.1:2379     | 8e9e05c52164694d |  3.5.9  | 1.9 GB  |      true |      false |         2 |    8385926 |            8385926 |        |
+----------------------------+------------------+---------+---------+-----------+------------+-----------+------------+--------------------+--------+
```

If DB SIZE approaches 2GB, you're in danger of hitting the quota.

## Checking Database Revision History

etcd maintains multiple revisions of each key. Old revisions consume space and should be compacted.

```bash
# Check current revision number
ETCDCTL_API=3 etcdctl \
  --endpoints=https://127.0.0.1:2379 \
  --cacert=/etc/kubernetes/pki/etcd/ca.crt \
  --cert=/etc/kubernetes/pki/etcd/server.crt \
  --key=/etc/kubernetes/pki/etcd/server.key \
  endpoint status --write-out=json | jq '.[0].Status.header.revision'

# Large revision numbers indicate lots of historical data
```

High revision numbers combined with large database size suggest that compaction hasn't run recently.

## Performing Manual Compaction

Compaction removes old revisions, freeing up space. This is safe and necessary for long-running clusters.

```bash
# Get current revision
CURRENT_REV=$(ETCDCTL_API=3 etcdctl \
  --endpoints=https://127.0.0.1:2379 \
  --cacert=/etc/kubernetes/pki/etcd/ca.crt \
  --cert=/etc/kubernetes/pki/etcd/server.crt \
  --key=/etc/kubernetes/pki/etcd/server.key \
  endpoint status --write-out=json | jq -r '.[0].Status.header.revision')

echo "Current revision: $CURRENT_REV"

# Compact up to current revision
ETCDCTL_API=3 etcdctl \
  --endpoints=https://127.0.0.1:2379 \
  --cacert=/etc/kubernetes/pki/etcd/ca.crt \
  --cert=/etc/kubernetes/pki/etcd/server.crt \
  --key=/etc/kubernetes/pki/etcd/server.key \
  compact $CURRENT_REV

# Defragment to reclaim space
ETCDCTL_API=3 etcdctl \
  --endpoints=https://127.0.0.1:2379 \
  --cacert=/etc/kubernetes/pki/etcd/ca.crt \
  --cert=/etc/kubernetes/pki/etcd/server.crt \
  --key=/etc/kubernetes/pki/etcd/server.key \
  defrag

# Disarm the alarm if database was over quota
ETCDCTL_API=3 etcdctl \
  --endpoints=https://127.0.0.1:2379 \
  --cacert=/etc/kubernetes/pki/etcd/ca.crt \
  --cert=/etc/kubernetes/pki/etcd/server.crt \
  --key=/etc/kubernetes/pki/etcd/server.key \
  alarm disarm

# Verify new database size
ETCDCTL_API=3 etcdctl \
  --endpoints=https://127.0.0.1:2379 \
  --cacert=/etc/kubernetes/pki/etcd/ca.crt \
  --cert=/etc/kubernetes/pki/etcd/server.crt \
  --key=/etc/kubernetes/pki/etcd/server.key \
  endpoint status --write-out=table
```

Compaction and defragmentation can reduce database size significantly, often by 50% or more.

## Automating Compaction

Configure automatic compaction to prevent future quota issues. Most Kubernetes distributions enable this by default, but verify settings.

```yaml
# etcd configuration (in etcd.yaml or etcd flags)
apiVersion: v1
kind: Pod
metadata:
  name: etcd
  namespace: kube-system
spec:
  containers:
  - name: etcd
    image: k8s.gcr.io/etcd:3.5.9-0
    command:
    - etcd
    - --auto-compaction-retention=1  # Keep 1 hour of history
    - --auto-compaction-mode=periodic
    - --quota-backend-bytes=2147483648  # 2GB quota
    # ... other flags
```

The `--auto-compaction-retention` flag controls how much history to retain. A value of 1 hour is reasonable for most clusters.

## Identifying Space-Consuming Resources

Find which resources consume the most etcd space to address the root cause.

```bash
# Count objects by type
kubectl get all -A --no-headers | awk '{print $1}' | sort | uniq -c | sort -rn

# Count events (major contributor to database size)
kubectl get events -A --no-headers | wc -l

# Check for excessive events in specific namespace
kubectl get events -n problematic-namespace --sort-by='.lastTimestamp'

# Find pods creating many events
kubectl get events -A --sort-by='.lastTimestamp' | grep -i "pod/" | head -50
```

Events are a common culprit. Kubernetes retains events for 1 hour by default, but pods in crash loops or with frequent updates generate thousands of events.

## Cleaning Up Excessive Events

Events accumulate quickly in clusters with unhealthy pods. While events auto-expire, reducing event generation helps.

```bash
# Find pods in CrashLoopBackOff
kubectl get pods -A | grep -i "crash\|error\|backoff"

# Delete problematic pods to stop event generation
kubectl delete pod problem-pod -n namespace --force --grace-period=0

# For development clusters, manually delete old events
kubectl delete events -A --field-selector reason=Failed,reason=FailedScheduling
```

Fix the underlying issues causing excessive events. CrashLoopBackOff pods should be debugged and fixed, not ignored.

## Reducing Resource Churn

High resource churn causes database growth. Deployments that update frequently create many revisions.

```bash
# Find resources with many revisions
kubectl get deployments -A -o json | \
  jq -r '.items[] | "\(.metadata.namespace)/\(.metadata.name) - Generation: \(.metadata.generation)"' | \
  sort -t: -k2 -rn | head -20

# Check for resources being recreated frequently
kubectl get pods -A --sort-by='.metadata.creationTimestamp' | head -50
```

Resources with high generation numbers or frequent recreation contribute to database growth.

## Configuring Event TTL

Shorten event retention to reduce database size. This doesn't affect core resource data.

```yaml
# API server configuration
apiVersion: v1
kind: Pod
metadata:
  name: kube-apiserver
  namespace: kube-system
spec:
  containers:
  - name: kube-apiserver
    image: k8s.gcr.io/kube-apiserver:v1.28.0
    command:
    - kube-apiserver
    - --event-ttl=30m  # Retain events for 30 minutes instead of 1 hour
    # ... other flags
```

Reducing event TTL helps but won't solve fundamental database size issues from resource proliferation.

## Increasing etcd Quota

If your cluster legitimately needs more space, increase the quota. This should be a last resort after compaction and cleanup.

```yaml
# etcd configuration
apiVersion: v1
kind: Pod
metadata:
  name: etcd
  namespace: kube-system
spec:
  containers:
  - name: etcd
    image: k8s.gcr.io/etcd:3.5.9-0
    command:
    - etcd
    - --quota-backend-bytes=8589934592  # Increase to 8GB
    # ... other flags
```

Larger quotas require more memory and can slow down etcd performance. Only increase if necessary.

## Monitoring etcd Size

Set up monitoring and alerts to catch database size issues before they cause outages.

```yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: prometheus-rules
  namespace: monitoring
data:
  etcd-rules.yml: |
    groups:
    - name: etcd_size
      interval: 30s
      rules:
      - record: etcd_database_size_bytes
        expr: etcd_mvcc_db_total_size_in_bytes

      - record: etcd_database_quota_bytes
        expr: etcd_server_quota_backend_bytes

      - record: etcd_database_usage_percent
        expr: |
          (etcd_mvcc_db_total_size_in_bytes / etcd_server_quota_backend_bytes) * 100

      - alert: EtcdDatabaseSizeHigh
        expr: etcd_database_usage_percent > 80
        for: 10m
        labels:
          severity: warning
        annotations:
          summary: "etcd database size high"
          description: "etcd database using {{ $value | humanizePercentage }} of quota"

      - alert: EtcdDatabaseSizeCritical
        expr: etcd_database_usage_percent > 95
        for: 5m
        labels:
          severity: critical
        annotations:
          summary: "etcd database size critical"
          description: "etcd database using {{ $value | humanizePercentage }} of quota - cluster writes will fail soon"
```

These alerts give you time to compact the database before hitting the quota.

## Backup Before Compaction

Always backup etcd before performing maintenance operations.

```bash
# Create etcd snapshot
ETCDCTL_API=3 etcdctl \
  --endpoints=https://127.0.0.1:2379 \
  --cacert=/etc/kubernetes/pki/etcd/ca.crt \
  --cert=/etc/kubernetes/pki/etcd/server.crt \
  --key=/etc/kubernetes/pki/etcd/server.key \
  snapshot save /backup/etcd-snapshot-$(date +%Y%m%d-%H%M%S).db

# Verify snapshot
ETCDCTL_API=3 etcdctl \
  --endpoints=https://127.0.0.1:2379 \
  --cacert=/etc/kubernetes/pki/etcd/ca.crt \
  --cert=/etc/kubernetes/pki/etcd/server.crt \
  --key=/etc/kubernetes/pki/etcd/server.key \
  snapshot status /backup/etcd-snapshot-*.db --write-out=table
```

Store snapshots safely off-cluster. You'll need them if compaction causes unexpected issues.

## Multi-Node etcd Clusters

In multi-node etcd clusters, compact and defragment each member individually.

```bash
# Get list of etcd members
ETCDCTL_API=3 etcdctl \
  --endpoints=https://127.0.0.1:2379 \
  --cacert=/etc/kubernetes/pki/etcd/ca.crt \
  --cert=/etc/kubernetes/pki/etcd/server.crt \
  --key=/etc/kubernetes/pki/etcd/server.key \
  member list

# Defragment each endpoint individually
for endpoint in https://node1:2379 https://node2:2379 https://node3:2379; do
  echo "Defragmenting $endpoint..."
  ETCDCTL_API=3 etcdctl \
    --endpoints=$endpoint \
    --cacert=/etc/kubernetes/pki/etcd/ca.crt \
    --cert=/etc/kubernetes/pki/etcd/server.crt \
    --key=/etc/kubernetes/pki/etcd/server.key \
    defrag
done
```

Defragmentation causes brief latency spikes. Perform during maintenance windows or one node at a time.

## Best Practices

Enable auto-compaction with reasonable retention periods. Monitor database size and set alerts at 80% utilization.

Regular backups protect against compaction issues. Test restore procedures periodically.

Investigate and fix root causes of excessive events or resource churn. These indicate underlying cluster problems.

Schedule regular maintenance windows for manual defragmentation. Even with auto-compaction, periodic defragmentation keeps databases healthy.

## Conclusion

etcd database size exceeded errors completely halt cluster operations, but they're preventable and fixable. Regular compaction and defragmentation keep the database healthy. Monitor database size, identify resources causing excessive growth, and configure appropriate auto-compaction settings. With proactive maintenance, your etcd database will remain well below quota limits, ensuring continuous cluster availability.
