# How to Troubleshoot Kubernetes API Server Timeout Errors from etcd Latency Spikes

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Kubernetes, etcd, Performance

Description: Learn how to diagnose and fix Kubernetes API server timeout errors caused by etcd latency spikes, including performance tuning and infrastructure optimization strategies.

---

Kubernetes API server timeout errors disrupt cluster operations and prevent deployments, updates, and even basic kubectl commands from completing. When the API server can't communicate with etcd within acceptable timeframes, requests time out and operations fail. etcd latency spikes from disk performance issues, network problems, or excessive load cause these timeouts.

This guide covers diagnosing etcd performance problems, identifying latency sources, and implementing solutions that improve API server reliability.

## Understanding API Server and etcd Relationship

The Kubernetes API server stores all cluster state in etcd. Every kubectl command, controller reconciliation, and scheduler decision involves reading from or writing to etcd. The API server expects etcd responses within milliseconds. When etcd latency exceeds thresholds, API server requests time out.

Common symptoms include kubectl commands hanging or failing with timeout errors, controllers falling behind on reconciliation, admission webhooks timing out, and slow pod creation. The API server remains responsive for requests served from its cache, but any write operation or cache miss requires etcd access.

## Identifying API Server Timeout Errors

Check for timeout errors in API server logs.

```bash
# View API server logs
kubectl logs -n kube-system kube-apiserver-master-1 | grep -i timeout

# Common error patterns:
# etcdserver: request timed out
# context deadline exceeded
# failed to get: context deadline exceeded waiting for result
```

Monitor API server request latency metrics.

```bash
# Port-forward to API server metrics
kubectl port-forward -n kube-system pod/kube-apiserver-master-1 8080:8080

# Query request duration
curl http://localhost:8080/metrics | grep apiserver_request_duration_seconds

# Look for high P99 latencies:
# apiserver_request_duration_seconds{verb="GET",resource="pods"} 0.5  # 500ms - concerning
# apiserver_request_duration_seconds{verb="PUT",resource="nodes"} 2.0  # 2s - critical
```

Check kubectl response times to confirm client-visible impact.

```bash
# Time a simple kubectl command
time kubectl get nodes

# Should complete in < 1 second
# > 5 seconds indicates serious problems

# Time a write operation
time kubectl run test --image=nginx

# Should complete in < 2 seconds
```

## Measuring etcd Performance

Directly measure etcd performance to isolate the problem.

```bash
# Check etcd pod status
kubectl get pods -n kube-system -l component=etcd

# Access etcd pod
kubectl exec -it -n kube-system etcd-master-1 -- sh

# Inside etcd pod, check metrics
ETCDCTL_API=3 etcdctl \
  --endpoints=https://127.0.0.1:2379 \
  --cacert=/etc/kubernetes/pki/etcd/ca.crt \
  --cert=/etc/kubernetes/pki/etcd/server.crt \
  --key=/etc/kubernetes/pki/etcd/server.key \
  endpoint status -w table

# Output shows:
# +----------------+------------------+---------+---------+-----------+
# |    ENDPOINT    |        ID        | VERSION | DB SIZE | IS LEADER |
# +----------------+------------------+---------+---------+-----------+
# | 127.0.0.1:2379 | 8e9e05c52164694d |  3.5.10 |   45 MB |      true |
# +----------------+------------------+---------+---------+-----------+
```

Check etcd request latencies.

```bash
# View etcd metrics
curl https://127.0.0.1:2379/metrics \
  --cacert /etc/kubernetes/pki/etcd/ca.crt \
  --cert /etc/kubernetes/pki/etcd/server.crt \
  --key /etc/kubernetes/pki/etcd/server.key | \
  grep etcd_disk

# Key metrics:
# etcd_disk_backend_commit_duration_seconds - disk write latency
# etcd_disk_wal_fsync_duration_seconds - WAL sync latency
```

## Diagnosing Disk Performance Issues

etcd is extremely sensitive to disk latency. Slow disks cause timeout cascades throughout the cluster.

```bash
# On etcd node, check disk performance
ssh master-1

# Run fio benchmark
sudo fio --name=etcd-test \
  --filename=/var/lib/etcd/test \
  --size=2G \
  --rw=write \
  --ioengine=libaio \
  --direct=1 \
  --bs=4k \
  --numjobs=1 \
  --time_based \
  --runtime=60

# etcd requires:
# - 99th percentile write latency < 10ms
# - Sequential write throughput > 50MB/s

# Check actual disk latency
sudo iostat -x 1 10

# Look at await (average wait time):
# await > 10ms indicates disk problems
```

Check if etcd is on network storage or slow disks.

```bash
# Find etcd data directory
kubectl get pods -n kube-system etcd-master-1 -o jsonpath='{.spec.volumes[?(@.name=="etcd-data")].hostPath.path}'

# Check filesystem type
df -Th /var/lib/etcd

# Should be on local SSD/NVMe, not NFS or network storage
```

## Fixing Disk Performance

Move etcd to faster storage if it's on slow disks.

```bash
# Stop etcd (on single-node clusters, plan for downtime)
sudo systemctl stop kubelet

# Backup etcd data
sudo tar -czf /backup/etcd-$(date +%Y%m%d).tar.gz /var/lib/etcd

# Mount faster disk at /var/lib/etcd-new
# Copy data
sudo rsync -av /var/lib/etcd/ /var/lib/etcd-new/

# Update kubelet to use new path
sudo vim /etc/kubernetes/manifests/etcd.yaml
# Change hostPath from /var/lib/etcd to /var/lib/etcd-new

# Start kubelet
sudo systemctl start kubelet
```

For cloud environments, use provisioned IOPS disks.

```bash
# AWS - create GP3 volume with high IOPS
aws ec2 create-volume \
  --availability-zone us-east-1a \
  --size 100 \
  --volume-type gp3 \
  --iops 16000 \
  --throughput 1000

# GCP - use SSD persistent disks
gcloud compute disks create etcd-disk \
  --size=100GB \
  --type=pd-ssd
```

## Tuning etcd Configuration

Optimize etcd configuration for better performance.

```yaml
# /etc/kubernetes/manifests/etcd.yaml
apiVersion: v1
kind: Pod
metadata:
  name: etcd
  namespace: kube-system
spec:
  containers:
  - command:
    - etcd
    - --quota-backend-bytes=8589934592  # 8GB quota
    - --heartbeat-interval=100  # Default 100ms
    - --election-timeout=1000  # Default 1000ms
    - --snapshot-count=10000  # Snapshot every 10k operations
    - --max-request-bytes=1572864  # 1.5MB max request size
    # Performance tuning
    - --auto-compaction-mode=periodic
    - --auto-compaction-retention=5m
    image: registry.k8s.io/etcd:3.5.10-0
    name: etcd
    resources:
      requests:
        cpu: 2
        memory: 4Gi
      limits:
        cpu: 4
        memory: 8Gi
```

Enable etcd auto-compaction to reduce database size.

```bash
# Check current etcd DB size
ETCDCTL_API=3 etcdctl \
  --endpoints=https://127.0.0.1:2379 \
  --cacert=/etc/kubernetes/pki/etcd/ca.crt \
  --cert=/etc/kubernetes/pki/etcd/server.crt \
  --key=/etc/kubernetes/pki/etcd/server.key \
  endpoint status -w json | jq '.[].Status.dbSize'

# Manual compaction if DB is large
ETCDCTL_API=3 etcdctl \
  --endpoints=https://127.0.0.1:2379 \
  --cacert=/etc/kubernetes/pki/etcd/ca.crt \
  --cert=/etc/kubernetes/pki/etcd/server.crt \
  --key=/etc/kubernetes/pki/etcd/server.key \
  compact $(etcdctl endpoint status -w json | jq '.[].Status.header.revision')

# Defragment etcd database
ETCDCTL_API=3 etcdctl \
  --endpoints=https://127.0.0.1:2379 \
  --cacert=/etc/kubernetes/pki/etcd/ca.crt \
  --cert=/etc/kubernetes/pki/etcd/server.crt \
  --key=/etc/kubernetes/pki/etcd/server.key \
  defrag
```

## Reducing API Server Load on etcd

Optimize API server caching to reduce etcd queries.

```yaml
# /etc/kubernetes/manifests/kube-apiserver.yaml
apiVersion: v1
kind: Pod
metadata:
  name: kube-apiserver
  namespace: kube-system
spec:
  containers:
  - command:
    - kube-apiserver
    # Increase watch cache size
    - --watch-cache-sizes=nodes#1000,pods#5000,configmaps#1000
    # Request timeout
    - --request-timeout=60s
    # etcd settings
    - --etcd-servers-overrides=/events#https://127.0.0.1:2381
    image: registry.k8s.io/kube-apiserver:v1.28.0
    name: kube-apiserver
```

Use a separate etcd cluster for Events to reduce load.

```yaml
# Deploy second etcd cluster for Events
apiVersion: v1
kind: Pod
metadata:
  name: etcd-events
  namespace: kube-system
spec:
  containers:
  - command:
    - etcd
    - --listen-client-urls=https://127.0.0.1:2381
    - --advertise-client-urls=https://127.0.0.1:2381
    # Other etcd configuration
    image: registry.k8s.io/etcd:3.5.10-0
    name: etcd-events
```

## Implementing etcd Monitoring

Deploy Prometheus monitoring for etcd metrics.

```yaml
apiVersion: v1
kind: ServiceMonitor
metadata:
  name: etcd
  namespace: kube-system
spec:
  endpoints:
  - port: metrics
    interval: 30s
    scheme: https
    tlsConfig:
      caFile: /etc/prometheus/secrets/etcd-certs/ca.crt
      certFile: /etc/prometheus/secrets/etcd-certs/client.crt
      keyFile: /etc/prometheus/secrets/etcd-certs/client.key
  selector:
    matchLabels:
      component: etcd
```

Create alerts for etcd performance degradation.

```yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: prometheus-alerts
  namespace: monitoring
data:
  alerts.yaml: |
    groups:
    - name: etcd
      rules:
      - alert: HighEtcdDiskLatency
        expr: |
          histogram_quantile(0.99,
            rate(etcd_disk_wal_fsync_duration_seconds_bucket[5m])
          ) > 0.01
        for: 10m
        labels:
          severity: warning
        annotations:
          summary: "etcd disk latency high"
          description: "P99 fsync latency is {{ $value }}s"

      - alert: EtcdDatabaseTooLarge
        expr: |
          etcd_mvcc_db_total_size_in_bytes > 8589934592
        for: 5m
        labels:
          severity: warning
        annotations:
          summary: "etcd database size is {{ $value }} bytes"

      - alert: APIServerEtcdTimeout
        expr: |
          rate(etcd_request_duration_seconds_count{code="Timeout"}[5m]) > 0
        for: 5m
        labels:
          severity: critical
        annotations:
          summary: "API server experiencing etcd timeouts"
```

## Scaling etcd Cluster

For high-load clusters, run multi-node etcd clusters.

```yaml
# Deploy 3-node etcd cluster for high availability
# Node 1
apiVersion: v1
kind: Pod
metadata:
  name: etcd-1
spec:
  containers:
  - command:
    - etcd
    - --name=etcd-1
    - --initial-advertise-peer-urls=https://192.168.1.10:2380
    - --listen-peer-urls=https://0.0.0.0:2380
    - --advertise-client-urls=https://192.168.1.10:2379
    - --listen-client-urls=https://0.0.0.0:2379
    - --initial-cluster=etcd-1=https://192.168.1.10:2380,etcd-2=https://192.168.1.11:2380,etcd-3=https://192.168.1.12:2380
    - --initial-cluster-state=new
    image: registry.k8s.io/etcd:3.5.10-0
    name: etcd
```

Load balance API server requests across etcd members.

```yaml
# kube-apiserver configuration
- --etcd-servers=https://192.168.1.10:2379,https://192.168.1.11:2379,https://192.168.1.12:2379
```

API server timeout errors from etcd latency indicate fundamental performance problems that affect entire cluster operations. By ensuring etcd runs on fast local storage, optimizing configuration, implementing proper monitoring, and scaling when necessary, you create a responsive API server that handles cluster operations without timeouts. Combined with load reduction strategies and proactive capacity planning, these practices maintain cluster stability under heavy load.
