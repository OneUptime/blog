# How to Diagnose High Latency Issues in Ceph

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Ceph, Rook, Latency, Performance, Troubleshooting

Description: Learn how to systematically diagnose high latency in Ceph clusters by examining OSD performance counters, disk I/O, BlueStore metrics, and network path analysis.

---

High latency in Ceph affects every application built on the cluster. Diagnosing it requires distinguishing between disk latency, network latency, CPU saturation, and cluster-level issues like recovery or rebalancing that steal I/O bandwidth.

## Establishing a Latency Baseline

First, measure current latency to understand what "high" means for your cluster:

```bash
# OSD apply and commit latency
ceph osd perf
```

```text
osd  commit_latency(ms)  apply_latency(ms)
 0        2.1                1.8
 1       45.3               44.1   <-- High latency on osd.1
 2        2.3                2.0
```

OSD 1 has anomalously high latency compared to peers.

## Checking Disk Latency on OSD Nodes

SSH to the node hosting the high-latency OSD and measure raw disk performance:

```bash
# Check disk queue depth and I/O wait
iostat -x 1 10 /dev/sdb

# Expected: await < 5ms for SSD, < 20ms for HDD at normal load
```

```text
Device  r/s   w/s    rMB/s  wMB/s  await  svctm  %util
sdb     120   380    0.47   5.2    48.2   2.4    95.3
```

High `%util` and `await` indicate the device is saturated.

## BlueStore Latency Counters

BlueStore exposes detailed internal latency metrics:

```bash
ceph tell osd.1 perf dump | python3 -c "
import json, sys
d = json.load(sys.stdin)
bs = d.get('bluestore', {})
for key in ['state_kv_committing_lat', 'state_io_done_lat', 'state_finishing_lat']:
    if key in bs:
        v = bs[key]
        print(f'{key}: avgtime={v.get(\"avgtime\", 0)}')"
```

Key BlueStore latency stages:

| Stage                      | What it measures                     |
|---------------------------|--------------------------------------|
| `state_io_done_lat`       | Time for device I/O to complete      |
| `state_kv_committing_lat` | RocksDB/WAL commit latency           |
| `state_finishing_lat`     | Post-commit finalization latency     |

## Network Round-Trip Latency

Measure OSD-to-OSD network latency for replication overhead:

```bash
# Measure network latency between primary and replica OSD nodes
ping -c 100 <replica_osd_host> | tail -2

# For detailed path analysis
mtr -n --report <replica_osd_host>
```

For a 3-replica pool, a write must complete on all 3 replicas before acknowledging. 10ms network latency between replicas adds ~10ms to every write.

## Monitoring Recovery Impact on Latency

Active recovery reduces I/O bandwidth for client requests:

```bash
ceph status | grep -A5 "recovery"

# Limit recovery bandwidth to reduce impact on clients
ceph config set osd osd_recovery_max_active_hdd 1
ceph config set osd osd_max_backfills 1
ceph config set osd osd_recovery_op_priority 3
```

## Checking RocksDB Compaction Latency

BlueStore uses RocksDB for metadata. Compaction can spike latency:

```bash
ceph tell osd.1 perf dump | python3 -c "
import json, sys
d = json.load(sys.stdin)
db = d.get('rocksdb', {})
for key, val in db.items():
    if 'compaction' in key.lower():
        print(f'{key}: {val}')"
```

## Prometheus Latency Alerting

Set up Prometheus alerts for sustained high latency:

```yaml
groups:
  - name: ceph_latency
    rules:
      - alert: CephOSDHighCommitLatency
        expr: ceph_osd_commit_latency_ms > 50
        for: 5m
        labels:
          severity: warning
        annotations:
          summary: "OSD {{ $labels.ceph_daemon }} commit latency > 50ms"
```

## OSD Scrub Impact

Deep scrubs cause latency spikes. Schedule scrubs during off-peak hours:

```bash
# Restrict scrubbing to a time window
ceph config set osd osd_scrub_begin_hour 2
ceph config set osd osd_scrub_end_hour 6

# Check if scrubbing is currently active
ceph pg dump | grep scrubbing
```

## Summary

High Ceph latency diagnosis follows a layered approach: start with `ceph osd perf` to identify the affected OSD, then examine raw disk `iostat` metrics, BlueStore internal latency counters, and network round-trip times between replicas. Recovery throttling, scrub scheduling, and RocksDB compaction tuning address the most common non-hardware causes of latency spikes.
