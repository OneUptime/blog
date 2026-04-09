# How to Diagnose Slow Requests in Ceph

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Ceph, Rook, Slow Request, Performance, Troubleshooting

Description: Learn how to diagnose slow OSD requests in Ceph by interpreting health warnings, examining op traces, and identifying root causes like disk latency and network issues.

---

Slow requests are one of the most common Ceph performance issues. They appear as `HEALTH_WARN` messages and indicate that client I/O operations are taking longer than expected. Systematically diagnosing them requires understanding OSD op traces, hardware metrics, and cluster state.

## Recognizing Slow Requests

Slow requests appear in cluster health:

```bash
ceph health detail
```

```text
HEALTH_WARN 3 slow ops, oldest one blocked for 32 sec, osd.4 has slow ops
```

The warning shows how many ops are slow, the oldest blocked time, and which OSD is affected.

## Listing Slow Ops on an OSD

Query an OSD directly for its slow request details (run on the OSD host):

```bash
ceph daemon osd.4 dump_ops_in_flight
```

Example output:

```json
{
  "num_ops": 3,
  "ops": [
    {
      "description": "osd_op client.12345.0:15 pg 1.3 [write 0~4096]",
      "initiated_at": "2026-03-31T09:14:22",
      "age": 32.5,
      "duration": 32.5,
      "type_data": {
        "op": "write",
        "size": 4096,
        "state": "waiting for subop from 5,6"
      }
    }
  ]
}
```

Key fields:
- `age` - How long the op has been running in seconds
- `state` - Current stage of op processing
- `waiting for subop` - Indicates a replica OSD (5 or 6) is slow

## Reading OSD Op States

Common op states and their meaning:

| State                          | Likely Cause                     |
|--------------------------------|----------------------------------|
| `waiting for subop`            | Replica OSD is slow or down      |
| `waiting for ondisk`           | Disk I/O latency on this OSD     |
| `waiting for commit`           | Journal/BlueStore commit delay   |
| `waiting for pg to become active` | PG recovery in progress       |

## Checking OSD Disk Latency

High `waiting for ondisk` times point to storage device latency:

```bash
# Check disk I/O stats on the OSD node
iostat -x 1 10

# Or via OSD perf dump
ceph daemon osd.4 perf dump | python3 -c "
import json, sys
data = json.load(sys.stdin)
lat = data['osd']['op_w_latency']
print(f'Write latency avg: {lat[\"sum\"] / lat[\"avgcount\"]}s over {lat[\"avgcount\"]} ops')"
```

## Checking Network Between OSDs

Slow subop waits often indicate network issues between primary and replica OSDs:

```bash
# Ping replica OSD nodes
ping -c 10 <osd5_host>
ping -c 10 <osd6_host>

# Check for packet loss
mtr --report --report-cycles=20 <osd5_host>
```

## Checking OSD Commit Latency via Prometheus

```bash
# Query apply and commit latency via Prometheus
curl -s 'http://192.168.1.10:9283/metrics' | grep "ceph_osd_apply_latency_ms\|ceph_osd_commit_latency_ms"
```

Alert on P99 commit latency above 50ms for production workloads.

## Enabling OSD Op Logging

For detailed slow op traces, increase OSD log level temporarily:

```bash
ceph tell osd.4 config set debug_osd 5
tail -f /var/log/ceph/ceph-osd.4.log | grep "slow request"
# Reset after diagnosis
ceph tell osd.4 config set debug_osd 1/5
```

## Blacklisting Slow OSDs Temporarily

If one OSD is causing cluster-wide slowdowns, temporarily mark it out:

```bash
ceph osd out 4
# Investigate and fix the OSD
ceph osd in 4
```

## Summary

Diagnosing Ceph slow requests starts with `ceph health detail` and `ceph daemon osd.X dump_ops_in_flight` to identify which OSD and which op stage is blocked. The op state (waiting for subop, ondisk, or commit) points to either a replica OSD, disk, or network issue. OSD perf dump and Prometheus latency metrics provide quantitative data, while increased debug logging captures full op traces for deep analysis.
