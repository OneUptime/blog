# Optimize Calico etcdv3 Paths

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Calico, Kubernetes, Networking, etcd, etcdv3, Performance, Optimization

Description: Techniques for optimizing Calico's use of etcdv3 key paths to reduce storage usage, improve read/write latency, and maintain healthy etcd performance in large clusters.

---

## Introduction

Calico's etcdv3 path usage can grow significantly in large clusters with many nodes, pods, and policies. Left unoptimized, this growth leads to larger etcd databases that take longer to compact, slower watch notification delivery, and increased memory usage in etcd. In clusters with frequent pod churn, IPAM entries that are not promptly released can compound this growth.

Optimization focuses on reducing unnecessary key accumulation, tuning compaction and defragmentation schedules, choosing efficient data structures, and considering migration to the Kubernetes API datastore mode when etcd performance becomes a bottleneck.

## Prerequisites

- Calico using etcd datastore
- etcd with metrics endpoint enabled
- `calicoctl` and `kubectl` with admin access

## Optimization 1: Enable and Tune etcd Compaction

etcd retains historical versions of every key by default. Compaction reclaims this space:

```bash
# Enable automatic periodic compaction
etcd --auto-compaction-mode=periodic \
     --auto-compaction-retention=1h
```

This removes versions older than 1 hour. For Calico's write patterns, this is typically safe and reduces database size significantly.

## Optimization 2: Run Regular Defragmentation

Compaction marks space as available but defragmentation physically reclaims it:

```bash
# Defragment etcd (safe on individual members with no disruption)
etcdctl defrag --endpoints=https://etcd-member-1:2379 \
  --cacert=ca.crt --cert=admin.crt --key=admin.key
```

Schedule monthly defragmentation:

```yaml
apiVersion: batch/v1
kind: CronJob
metadata:
  name: etcd-defrag
spec:
  schedule: "0 3 1 * *"
  jobTemplate:
    spec:
      template:
        spec:
          containers:
            - name: defrag
              image: quay.io/coreos/etcd:v3.5.0
              command:
                - etcdctl
                - defrag
                - --endpoints=https://etcd:2379
          restartPolicy: OnFailure
```

## Optimization 3: Clean Up Stale IPAM Entries

```mermaid
graph LR
    A[Pod deleted] --> B[IPAM entry lingers]
    B --> C[calicoctl ipam check]
    C --> D[Leaked IP list]
    D --> E[calicoctl ipam gc]
    E --> F[etcd keys reclaimed]
```

```bash
# Identify and fix IPAM leaks
calicoctl ipam check --show-problem-ips

# Garbage collect leaked allocations
calicoctl ipam gc
```

## Optimization 4: Optimize Watch Performance

Felix uses etcd watches to receive policy updates. Minimize watch overhead:

```bash
# Tune etcd max watch operations
# In etcd configuration
--experimental-watch-progress-notify-interval=10s
```

Configure Felix to batch watch events:

```bash
kubectl patch felixconfiguration default \
  --type=merge \
  --patch='{"spec":{"prometheusMetricsEnabled":true}}'
```

## Optimization 5: Consider Kubernetes API Datastore Migration

For clusters exceeding 500 nodes, Kubernetes API datastore mode (KDD) scales better than etcd because it leverages the Kubernetes API server's caching layer:

```bash
# Check if migration is viable
calicoctl datastore migrate export > calico-backup.yaml

# Update Calico to use KDD
kubectl set env ds/calico-node \
  -n kube-system \
  CALICO_DATASTORE_TYPE=kubernetes \
  DATASTORE_TYPE=kubernetes

# Import existing data
calicoctl datastore migrate import -f calico-backup.yaml
```

## Optimization 6: Monitor Key Count Trends

```bash
# Track total Calico key count
etcdctl get /calico/ --prefix --keys-only | wc -l

# Track IPAM key count separately (most volatile)
etcdctl get /calico/v1/ipam/ --prefix --keys-only | wc -l
```

## Conclusion

Optimizing Calico's etcdv3 path usage requires regular compaction and defragmentation to control database size, proactive IPAM garbage collection to prevent leaked entry accumulation, and monitoring of key count trends to detect unexpected growth. For very large clusters, migrating to Kubernetes API datastore mode eliminates etcd as a Calico performance bottleneck entirely.
