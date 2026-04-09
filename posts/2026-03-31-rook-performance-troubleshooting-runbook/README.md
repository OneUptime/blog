# How to Create a Ceph Performance Troubleshooting Runbook

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Rook, Ceph, Performance, Runbook, Troubleshooting, Kubernetes

Description: A practical performance troubleshooting runbook for Ceph in Rook, covering slow I/O diagnosis, OSD latency analysis, network bottlenecks, and tuning strategies.

---

## Step 1: Check for Slow Requests

The first sign of performance problems is slow OSD requests:

```bash
kubectl -n rook-ceph exec -it deploy/rook-ceph-tools -- ceph health detail | grep slow
kubectl -n rook-ceph exec -it deploy/rook-ceph-tools -- ceph osd perf
```

The `osd perf` output shows commit and apply latency per OSD. Flag any OSD with latency above 50ms for investigation.

## Step 2: Inspect I/O Stats

Get real-time I/O throughput and IOPS:

```bash
kubectl -n rook-ceph exec -it deploy/rook-ceph-tools -- ceph iostat -p 5
```

For detailed OSD-level stats:

```bash
kubectl -n rook-ceph exec -it deploy/rook-ceph-tools -- \
  ceph tell osd.0 perf dump | python3 -m json.tool
```

## Step 3: Check for Recovery Impacting Performance

Background recovery can saturate disk I/O:

```bash
kubectl -n rook-ceph exec -it deploy/rook-ceph-tools -- ceph status
# Look for: recovery 100 MiB/s
```

Temporarily reduce recovery priority if impacting production:

```bash
kubectl -n rook-ceph exec -it deploy/rook-ceph-tools -- \
  ceph config set osd osd_max_backfills 1
kubectl -n rook-ceph exec -it deploy/rook-ceph-tools -- \
  ceph config set osd osd_recovery_max_active 1
```

## Step 4: Identify Network Bottlenecks

Check if the cluster network is the bottleneck:

```bash
# On the Kubernetes node, check OSD network traffic
kubectl -n rook-ceph exec -it rook-ceph-osd-0-<pod> -- \
  cat /proc/net/dev | grep eth

# Use iperf3 between nodes to measure raw bandwidth (install first if needed)
kubectl -n rook-ceph exec -it deploy/rook-ceph-tools -- \
  dnf install -y iperf3 && \
kubectl -n rook-ceph exec -it deploy/rook-ceph-tools -- \
  iperf3 -c <osd-node-ip> -t 10
```

## Step 5: Check BlueStore Performance

For BlueStore OSDs, check cache hit rates:

```bash
kubectl -n rook-ceph exec -it deploy/rook-ceph-tools -- \
  ceph tell osd.0 perf dump | python3 -c "
import json, sys
d = json.load(sys.stdin)
bs = d.get('bluestore', {})
print('Onode cache hits:', bs.get('onode_hits', 'N/A'))
print('Onode cache misses:', bs.get('onode_misses', 'N/A'))
print('Buffer hit bytes:', bs.get('buffer_hit_bytes', 'N/A'))
print('Buffer miss bytes:', bs.get('buffer_miss_bytes', 'N/A'))
"
```

## Step 6: PG Distribution Analysis

Uneven PG distribution causes hot spots:

```bash
kubectl -n rook-ceph exec -it deploy/rook-ceph-tools -- ceph osd df tree
kubectl -n rook-ceph exec -it deploy/rook-ceph-tools -- \
  ceph pg dump | awk '{print $1, $14}' | head -20
```

Rebalance using the CRUSH weight:

```bash
kubectl -n rook-ceph exec -it deploy/rook-ceph-tools -- \
  ceph osd crush reweight osd.5 2.0
```

## Benchmark Testing

Use the built-in benchmarking tool to establish baselines:

```bash
kubectl -n rook-ceph exec -it deploy/rook-ceph-tools -- \
  rados bench -p replicapool 60 write --no-cleanup

kubectl -n rook-ceph exec -it deploy/rook-ceph-tools -- \
  rados bench -p replicapool 60 seq
```

## Summary

Ceph performance troubleshooting starts with slow request detection, then narrows to OSD latency, recovery impact, network saturation, and CRUSH imbalances. The `ceph osd perf`, `ceph iostat`, and `rados bench` commands are essential tools in this runbook.
