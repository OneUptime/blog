# How to Analyze Ceph OSD Slow Request Logs

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Rook, Ceph, OSD, Performance, Slow Request, Troubleshooting

Description: Identify and diagnose slow OSD requests in Ceph by analyzing log patterns, using perf dump commands, and correlating with disk and network metrics.

---

Slow OSD requests are one of the most common performance issues in Ceph clusters. They occur when an OSD takes longer than expected to process a read or write operation and are logged with the prefix "slow request." Systematic analysis of these logs reveals root causes.

## Understanding Slow Request Logs

When an OSD request exceeds `osd_op_complaint_time` (default 30 seconds), Ceph logs a warning:

```text
2024-01-15T10:23:45.123+0000 osd.2 slow request 30.123 seconds old, received at 2024-01-15T10:23:15
```

The log includes the request age, the originating OSD, and the affected placement groups.

## Find Slow Requests in Pod Logs

Search OSD pod logs for slow request warnings:

```bash
kubectl -n rook-ceph logs -l app=rook-ceph-osd --tail=2000 | \
  grep "slow request" | \
  awk '{print $1, $2, $5, "seconds"}' | \
  sort -k3 -rn | head -20
```

Count slow requests per OSD:

```bash
kubectl -n rook-ceph logs -l app=rook-ceph-osd --tail=5000 | \
  grep "slow request" | \
  awk '{print $3}' | sort | uniq -c | sort -rn
```

## Check Current In-Flight Slow Requests

Query the Ceph cluster for current slow requests:

```bash
kubectl -n rook-ceph exec -it deploy/rook-ceph-tools -- \
  ceph health detail | grep "slow ops"

kubectl -n rook-ceph exec -it deploy/rook-ceph-tools -- \
  ceph osd perf
```

Dump detailed perf counters for a specific OSD:

```bash
kubectl -n rook-ceph exec -it deploy/rook-ceph-tools -- \
  ceph tell osd.2 dump_ops_in_flight
```

## Adjust the Slow Request Threshold

Lower the threshold to catch borderline slow requests:

```bash
kubectl -n rook-ceph exec -it deploy/rook-ceph-tools -- \
  ceph config set osd osd_op_complaint_time 10
```

## Identify Root Causes

Correlate slow requests with disk I/O on the node:

```bash
# Check disk saturation
kubectl -n rook-ceph exec -it <osd-pod> -- iostat -x 2 5

# Check BlueStore stats
kubectl -n rook-ceph exec -it deploy/rook-ceph-tools -- \
  ceph tell osd.2 perf dump | python3 -c \
  "import sys,json; d=json.load(sys.stdin); print(d.get('bluestore', {}))"
```

Common causes:
- Disk hardware failure or degraded performance
- Network congestion between OSDs
- Insufficient memory causing BlueStore cache misses
- Overloaded placement groups

## Monitor with Prometheus

Track slow ops with a PromQL query:

```bash
rate(ceph_osd_op_r_latency_sum[5m]) / rate(ceph_osd_op_r_latency_count[5m])
```

## Summary

OSD slow request analysis starts with searching pod logs for the "slow request" string, counting occurrences per OSD to find outliers, and then using `ceph tell osd.N dump_ops_in_flight` for real-time visibility. Correlating slow request timing with disk I/O stats and network metrics points to whether the bottleneck is hardware, network, or cluster configuration.
