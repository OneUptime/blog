# How to View OSD Performance Counters in Ceph

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Ceph, Rook, OSD, Performance, Monitoring, Metric

Description: Access Ceph OSD performance counters to measure IOPS, latency, throughput, and operation queues for diagnosing performance issues.

---

## What Are Performance Counters?

Ceph daemons expose internal performance counters via the admin socket. These counters track IOPS, byte throughput, operation latency histograms, journal performance, and queue depths. They are the primary source of low-level I/O diagnostics.

## Accessing via `ceph tell`

The simplest way to get performance counters without SSH:

```bash
ceph tell osd.0 perf dump
```

This returns a large JSON blob. Filter for key metrics:

```bash
ceph tell osd.0 perf dump | python3 -c "
import json, sys
data = json.load(sys.stdin)
op = data.get('osd', {})
print('op_r:', op.get('op_r', 0))
print('op_w:', op.get('op_w', 0))
lat = op.get('op_r_latency', {})
print('op_r_latency (avg s):', lat.get('avgtime', 0))
"
```

## Accessing via the Admin Socket

On the OSD host directly:

```bash
ceph daemon osd.0 perf dump
```

## Key Performance Counters

| Counter | Description |
|---------|-------------|
| `osd.op_r` | Total read operations |
| `osd.op_w` | Total write operations |
| `osd.op_r_latency` | Read latency histogram |
| `osd.op_w_latency` | Write latency histogram |
| `osd.op_r_process_latency` | Time processing reads |
| `filestore.journal_latency` | Journal write latency (FileStore) |
| `bluestore.submit_lat` | BlueStore submit latency |
| `osd.op_in_bytes` | Bytes received |
| `osd.op_out_bytes` | Bytes sent |

## Real-Time Monitoring with `ceph daemon`

Poll counters continuously:

```bash
watch -n 2 "ceph daemon osd.0 perf dump | python3 -c \"
import json,sys
d=json.load(sys.stdin)
osd=d.get('osd',{})
print('reads:', osd.get('op_r',0))
print('writes:', osd.get('op_w',0))
print('read_latency_avg:', osd.get('op_r_latency',{}).get('avgtime',0))
\""
```

## Cluster-Wide Counter Collection

To collect performance counters from all OSDs at once:

```bash
ceph tell osd.* perf dump
```

This queries counters from every OSD daemon. To see all available counter definitions with types and descriptions for a specific OSD:

```bash
ceph tell osd.0 perf schema
```

## BlueStore-Specific Counters

For BlueStore OSDs, check storage layer metrics:

```bash
ceph daemon osd.0 perf dump | python3 -c "
import json,sys
d=json.load(sys.stdin)
bs=d.get('bluestore',{})
print('kv_sync_lat:', bs.get('kv_sync_lat',{}).get('avgtime',0))
print('kv_final_lat:', bs.get('kv_final_lat',{}).get('avgtime',0))
"
```

## Summary

Ceph OSD performance counters are accessed via `ceph tell osd.<id> perf dump` for remote access or `ceph daemon osd.<id> perf dump` locally. Focus on `op_r_latency`, `op_w_latency`, and BlueStore `kv_sync_lat` to diagnose I/O performance problems. Use `ceph tell osd.* perf dump` for a cluster-wide view.
