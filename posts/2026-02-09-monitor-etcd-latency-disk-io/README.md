# How to Monitor etcd Latency and Disk IO for Cluster Health

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Kubernetes, etcd, Monitoring, Performance

Description: Learn how to monitor etcd latency and disk IO metrics to ensure Kubernetes cluster health, identify performance bottlenecks, and prevent control plane degradation.

---

etcd performance directly impacts Kubernetes cluster responsiveness. Slow etcd operations cause API server timeouts, scheduler delays, and controller lag. The primary factors affecting etcd performance are disk IO latency and network latency between members. This guide shows you how to monitor these critical metrics and identify problems before they impact your cluster.

## Understanding etcd Performance Requirements

etcd requires consistent low latency for both disk and network operations. The Raft consensus protocol uses heartbeats and leader elections that are sensitive to latency. Slow disk writes delay consensus, causing leader elections and cluster instability.

Critical performance thresholds:

- Disk fsync latency should be below 10ms for the 99th percentile
- Backend commit latency should be below 25ms for the 99th percentile
- Network round-trip time between members should be below 50ms
- WAL (Write-Ahead Log) fsync latency should be below 10ms

Exceeding these thresholds leads to degraded performance and potential cluster disruption.

## Checking Built-in etcd Metrics

etcd exposes Prometheus metrics on port 2381. Query these metrics directly:

```bash
# Check if metrics endpoint is accessible
curl http://localhost:2381/metrics

# Get specific latency metrics
curl http://localhost:2381/metrics | grep -E "etcd_disk|etcd_network|duration"

# Watch metrics in real-time
watch -n 1 'curl -s http://localhost:2381/metrics | grep etcd_disk_wal_fsync_duration_seconds'
```

Key metrics to monitor:

```bash
# Disk fsync latency (should be < 10ms for p99)
curl -s http://localhost:2381/metrics | \
  grep 'etcd_disk_wal_fsync_duration_seconds_bucket'

# Backend commit latency
curl -s http://localhost:2381/metrics | \
  grep 'etcd_disk_backend_commit_duration_seconds_bucket'

# Network peer round-trip time
curl -s http://localhost:2381/metrics | \
  grep 'etcd_network_peer_round_trip_time_seconds'
```

## Using etcdctl to Check Performance

The etcdctl tool includes a performance check command:

```bash
# Set up environment
export ETCDCTL_API=3
export ETCDCTL_ENDPOINTS=https://127.0.0.1:2379
export ETCDCTL_CACERT=/etc/kubernetes/pki/etcd/ca.crt
export ETCDCTL_CERT=/etc/kubernetes/pki/etcd/server.crt
export ETCDCTL_KEY=/etc/kubernetes/pki/etcd/server.key

# Run performance check
etcdctl check perf

# Example output:
# 60 / 60 Boooooooooooooooooooooooooooooooooom  !
# PASS: Throughput is 150 writes/s
# PASS: Slowest request took 0.025s
# PASS: Stddev is 0.005s
# PASS
```

Check individual operation latencies:

```bash
# Measure read latency
time etcdctl get /registry/namespaces/default

# Measure write latency
time etcdctl put /test/latency "test-value"

# Clean up test key
etcdctl del /test/latency
```

## Monitoring Disk IO with iostat

Monitor disk performance for the etcd data volume:

```bash
# Install sysstat if not available
sudo apt-get install sysstat

# Find the disk hosting etcd data
df -h /var/lib/etcd
# Output: /dev/sda1       50G   10G   38G  21% /var/lib/etcd

# Monitor IO stats
iostat -x 1

# Watch etcd disk specifically
iostat -x 1 /dev/sda1

# Key metrics to watch:
# - await: average time for IO requests (should be < 10ms)
# - %util: disk utilization (should be < 80%)
# - w/s: writes per second
# - r/s: reads per second
```

Example output:

```
Device    r/s    w/s    rMB/s    wMB/s  avgrq-sz  avgqu-sz  await  r_await  w_await  svctm  %util
sda1     12.0   89.0     0.05     2.34     48.51      0.15   1.45     0.82     1.56   0.65   6.52
```

In this output, await of 1.45ms and %util of 6.52% indicate healthy disk performance.

## Setting Up Prometheus Monitoring

Deploy Prometheus to scrape etcd metrics:

```yaml
apiVersion: v1
kind: Service
metadata:
  name: etcd-metrics
  namespace: kube-system
  labels:
    component: etcd
spec:
  type: ClusterIP
  ports:
  - name: metrics
    port: 2381
    targetPort: 2381
  selector:
    component: etcd
---
apiVersion: v1
kind: Endpoints
metadata:
  name: etcd-metrics
  namespace: kube-system
subsets:
- addresses:
  - ip: 10.0.1.10  # Control plane node 1
  - ip: 10.0.1.11  # Control plane node 2
  - ip: 10.0.1.12  # Control plane node 3
  ports:
  - name: metrics
    port: 2381
---
apiVersion: monitoring.coreos.com/v1
kind: ServiceMonitor
metadata:
  name: etcd
  namespace: monitoring
spec:
  jobLabel: component
  selector:
    matchLabels:
      component: etcd
  namespaceSelector:
    matchNames:
    - kube-system
  endpoints:
  - port: metrics
    interval: 30s
    scheme: http
```

Apply the configuration:

```bash
kubectl apply -f etcd-servicemonitor.yaml
```

## Creating Prometheus Alert Rules

Define alerts for etcd performance issues:

```yaml
apiVersion: monitoring.coreos.com/v1
kind: PrometheusRule
metadata:
  name: etcd-alerts
  namespace: monitoring
spec:
  groups:
  - name: etcd
    interval: 30s
    rules:
    # Alert on high disk fsync latency
    - alert: EtcdHighDiskFsyncLatency
      expr: |
        histogram_quantile(0.99,
          rate(etcd_disk_wal_fsync_duration_seconds_bucket[5m])
        ) > 0.01
      for: 5m
      labels:
        severity: warning
      annotations:
        summary: "etcd disk fsync latency is high"
        description: "etcd member {{ $labels.instance }} fync latency is {{ $value }}s (> 10ms)"

    # Alert on high backend commit latency
    - alert: EtcdHighBackendCommitLatency
      expr: |
        histogram_quantile(0.99,
          rate(etcd_disk_backend_commit_duration_seconds_bucket[5m])
        ) > 0.025
      for: 5m
      labels:
        severity: warning
      annotations:
        summary: "etcd backend commit latency is high"
        description: "etcd member {{ $labels.instance }} commit latency is {{ $value }}s (> 25ms)"

    # Alert on slow network
    - alert: EtcdHighNetworkLatency
      expr: |
        histogram_quantile(0.99,
          rate(etcd_network_peer_round_trip_time_seconds_bucket[5m])
        ) > 0.05
      for: 5m
      labels:
        severity: warning
      annotations:
        summary: "etcd network latency is high"
        description: "Network RTT to {{ $labels.To }} is {{ $value }}s (> 50ms)"

    # Alert on leader changes
    - alert: EtcdFrequentLeaderChanges
      expr: |
        rate(etcd_server_leader_changes_seen_total[15m]) > 3
      for: 5m
      labels:
        severity: warning
      annotations:
        summary: "etcd cluster has frequent leader changes"
        description: "etcd instance {{ $labels.instance }} has seen {{ $value }} leader changes"

    # Alert on failed proposals
    - alert: EtcdHighNumberOfFailedProposals
      expr: |
        increase(etcd_server_proposals_failed_total[1h]) > 5
      for: 5m
      labels:
        severity: warning
      annotations:
        summary: "etcd cluster has failed proposals"
        description: "etcd instance {{ $labels.instance }} has {{ $value }} failed proposals"
```

Apply the rules:

```bash
kubectl apply -f etcd-prometheus-rules.yaml
```

## Building Grafana Dashboards

Create a comprehensive etcd monitoring dashboard. Import this dashboard JSON:

```json
{
  "dashboard": {
    "title": "etcd Cluster Monitoring",
    "panels": [
      {
        "title": "Disk WAL Fsync Latency (P99)",
        "targets": [{
          "expr": "histogram_quantile(0.99, rate(etcd_disk_wal_fsync_duration_seconds_bucket[5m]))"
        }],
        "yaxes": [{
          "format": "s"
        }]
      },
      {
        "title": "Backend Commit Latency (P99)",
        "targets": [{
          "expr": "histogram_quantile(0.99, rate(etcd_disk_backend_commit_duration_seconds_bucket[5m]))"
        }],
        "yaxes": [{
          "format": "s"
        }]
      },
      {
        "title": "Network Peer Round Trip Time",
        "targets": [{
          "expr": "histogram_quantile(0.99, rate(etcd_network_peer_round_trip_time_seconds_bucket[5m]))"
        }],
        "yaxes": [{
          "format": "s"
        }]
      },
      {
        "title": "Database Size",
        "targets": [{
          "expr": "etcd_mvcc_db_total_size_in_bytes"
        }],
        "yaxes": [{
          "format": "bytes"
        }]
      }
    ]
  }
}
```

Key queries for the dashboard:

```promql
# Disk fsync latency percentiles
histogram_quantile(0.99, rate(etcd_disk_wal_fsync_duration_seconds_bucket[5m]))
histogram_quantile(0.95, rate(etcd_disk_wal_fsync_duration_seconds_bucket[5m]))
histogram_quantile(0.50, rate(etcd_disk_wal_fsync_duration_seconds_bucket[5m]))

# Backend commit latency
histogram_quantile(0.99, rate(etcd_disk_backend_commit_duration_seconds_bucket[5m]))

# Network peer latency
histogram_quantile(0.99, rate(etcd_network_peer_round_trip_time_seconds_bucket[5m]))

# Leader changes
rate(etcd_server_leader_changes_seen_total[5m])

# Database size growth
rate(etcd_mvcc_db_total_size_in_bytes[1h])

# Key total
etcd_debugging_mvcc_keys_total

# Throughput
rate(etcd_server_proposals_applied_total[5m])
```

## Monitoring Disk IO with Node Exporter

Deploy node exporter to collect disk metrics:

```yaml
apiVersion: apps/v1
kind: DaemonSet
metadata:
  name: node-exporter
  namespace: monitoring
spec:
  selector:
    matchLabels:
      app: node-exporter
  template:
    metadata:
      labels:
        app: node-exporter
    spec:
      hostNetwork: true
      hostPID: true
      containers:
      - name: node-exporter
        image: prom/node-exporter:v1.7.0
        args:
        - --path.procfs=/host/proc
        - --path.sysfs=/host/sys
        - --path.rootfs=/host/root
        - --collector.filesystem.mount-points-exclude=^/(sys|proc|dev|host|etc)($$|/)
        ports:
        - containerPort: 9100
        volumeMounts:
        - name: proc
          mountPath: /host/proc
          readOnly: true
        - name: sys
          mountPath: /host/sys
          readOnly: true
        - name: root
          mountPath: /host/root
          readOnly: true
      volumes:
      - name: proc
        hostPath:
          path: /proc
      - name: sys
        hostPath:
          path: /sys
      - name: root
        hostPath:
          path: /
```

Query disk IO metrics:

```promql
# Disk IO wait time
rate(node_disk_io_time_seconds_total{device="sda"}[5m])

# Disk read latency
rate(node_disk_read_time_seconds_total{device="sda"}[5m]) /
rate(node_disk_reads_completed_total{device="sda"}[5m])

# Disk write latency
rate(node_disk_write_time_seconds_total{device="sda"}[5m]) /
rate(node_disk_writes_completed_total{device="sda"}[5m])

# Disk utilization
rate(node_disk_io_time_seconds_total{device="sda"}[5m]) * 100
```

## Using Systemd Journal for Latency Analysis

Analyze etcd logs for latency warnings:

```bash
# Watch for slow operations
journalctl -u etcd -f | grep -E "slow|latency|took"

# Find entries with high latency
journalctl -u etcd --since "1 hour ago" | \
  grep "took" | \
  awk '{print $NF}' | \
  sort -n | \
  tail -20

# Count slow operations
journalctl -u etcd --since "24 hours ago" | \
  grep -c "slow"

# Extract and analyze apply duration
journalctl -u etcd --since "1 hour ago" -o json | \
  jq -r 'select(.MESSAGE | contains("apply request took")) | .MESSAGE' | \
  awk '{print $(NF-1)}' | \
  sort -n
```

## Creating a Latency Monitoring Script

Automate latency monitoring with a script:

```bash
#!/bin/bash
# monitor-etcd-latency.sh

set -e

ETCDCTL_API=3
ETCDCTL_ENDPOINTS=https://127.0.0.1:2379
ETCDCTL_CACERT=/etc/kubernetes/pki/etcd/ca.crt
ETCDCTL_CERT=/etc/kubernetes/pki/etcd/server.crt
ETCDCTL_KEY=/etc/kubernetes/pki/etcd/server.key

METRICS_URL="http://localhost:2381/metrics"
THRESHOLD_MS=10

# Check fsync latency
FSYNC_P99=$(curl -s $METRICS_URL | \
  grep 'etcd_disk_wal_fsync_duration_seconds_bucket{le="0.01"}' | \
  awk '{print $2}')

# Check backend commit latency
COMMIT_P99=$(curl -s $METRICS_URL | \
  grep 'etcd_disk_backend_commit_duration_seconds_bucket{le="0.025"}' | \
  awk '{print $2}')

# Test write latency
START=$(date +%s%N)
etcdctl put /test/latency-check "$(date)"
END=$(date +%s%N)
LATENCY_MS=$(( (END - START) / 1000000 ))

echo "Write latency: ${LATENCY_MS}ms"

if [ $LATENCY_MS -gt $THRESHOLD_MS ]; then
  echo "WARNING: Latency ${LATENCY_MS}ms exceeds threshold ${THRESHOLD_MS}ms"

  # Check disk stats
  iostat -x 1 5

  # Check etcd logs
  journalctl -u etcd -n 50 --no-pager | grep -E "slow|error"
fi

# Cleanup
etcdctl del /test/latency-check
```

Make it executable and run periodically:

```bash
chmod +x /usr/local/bin/monitor-etcd-latency.sh

# Add to cron
echo "*/5 * * * * /usr/local/bin/monitor-etcd-latency.sh >> /var/log/etcd-latency.log 2>&1" | \
  sudo crontab -
```

## Troubleshooting High Latency

When you detect high latency, investigate these common causes:

```bash
# Check disk queue depth
cat /sys/block/sda/queue/nr_requests

# Monitor real-time IO
sudo iotop -o

# Check for competing IO workloads
sudo iotop -P | grep -v etcd

# Verify etcd is using fast storage
lsblk -d -o name,rota
# Output: NAME  ROTA
#         sda      0   (0 = SSD, 1 = HDD)

# Check filesystem type (ext4 or xfs recommended)
df -T /var/lib/etcd

# Verify no swap is being used
free -h
sudo swapoff -a  # Disable swap if active

# Check CPU usage
top -b -n 1 | grep etcd
```

Monitoring etcd latency and disk IO proactively prevents cluster performance degradation. Set up comprehensive monitoring with Prometheus and Grafana, configure alerts for threshold violations, and investigate issues before they impact cluster operations.
