# How to View Detailed Pool Breakdown in Ceph

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Ceph, Rook, Pool Statistics, OMAP, Compression

Description: View detailed Ceph pool breakdowns including OMAP usage, compression savings, quota consumption, and per-pool I/O statistics for capacity planning and troubleshooting.

---

## Overview of Pool Detail Commands

Ceph provides several commands to get a comprehensive view of pool internals. Understanding OMAP usage, compression ratios, and quota consumption is essential for capacity planning and performance troubleshooting.

## Basic Pool Statistics

```bash
# High-level pool usage
ceph df

# Detailed pool stats with more columns
ceph df detail
```

The `detail` output shows:

```text
POOL     ID   PGS  STORED  OBJECTS  USED    %USED  MAX AVAIL  QUOTA BYTES  QUOTA OBJECTS
mypool   5    128  45 GiB  10000    135 GiB   15%   300 GiB    100 GiB      N/A
```

Key columns:
- `STORED`: Logical (uncompressed) bytes stored by clients
- `USED`: Actual bytes used on disk (includes replication/EC overhead)
- `%USED`: Percentage of max available capacity

## Viewing Compression Statistics

```bash
# Check compression ratio via df detail
ceph df detail --format json-pretty | python3 -c "
import sys, json
data = json.load(sys.stdin)
for p in data.get('pools', []):
    name = p.get('name')
    stats = p.get('stats', {})
    stored = stats.get('stored', 0)
    compress_bytes_used = stats.get('compress_bytes_used', 0)
    compress_under_bytes = stats.get('compress_under_bytes', 0)
    if compress_under_bytes > 0:
        ratio = compress_bytes_used / compress_under_bytes
        savings = compress_under_bytes - compress_bytes_used
        print(f'{name}: saved {savings/(1024**3):.2f} GiB, ratio {ratio:.3f}')
"
```

## Viewing OMAP Statistics

OMAP is used by RGW bucket indexes and CephFS directory entries. Excessive OMAP can cause performance issues.

```bash
# Check for large OMAP object health warnings
ceph health detail | grep -i omap

# View OMAP bytes per pool (Reef+ includes stored_omap in df detail)
ceph df detail --format json-pretty | python3 -c "
import sys, json
data = json.load(sys.stdin)
for p in data.get('pools', []):
    stats = p.get('stats', {})
    omap = stats.get('stored_omap', 0)
    if omap > 0:
        print(f\"Pool {p['name']}: omap_stored={omap/(1024**2):.1f}MiB\")
"
```

Check for pools with high OMAP key counts (indicates bucket index bloat):

```bash
# Check specific pool omap usage
rados -p .rgw.buckets.index ls | head -10
rados -p .rgw.buckets.index stat <bucket-shard-object>

# Count omap keys in a specific object
rados -p .rgw.buckets.index listomapkeys <bucket-shard>
```

## Viewing Quota Consumption

```bash
# View quotas and current usage
ceph osd pool get-quota mypool

# For all pools with quotas
ceph osd pool ls --format json | python3 -c "
import sys, json, subprocess
pools = json.load(sys.stdin)
for p in pools:
    result = subprocess.run(['ceph', 'osd', 'pool', 'get-quota', p, '--format', 'json'],
                          capture_output=True, text=True)
    data = json.loads(result.stdout) if result.returncode == 0 else {}
    max_bytes = data.get('quota_max_bytes', 0)
    max_objects = data.get('quota_max_objects', 0)
    if max_bytes > 0 or max_objects > 0:
        print(f'{p}: max_bytes={max_bytes/(1024**3):.1f}GiB, max_objects={max_objects}')
"
```

## Per-Pool PG Breakdown

```bash
# View PG distribution across pools
ceph pg dump --format json-pretty | python3 -c "
import sys, json
data = json.load(sys.stdin)
pool_pg = {}
for pg in data.get('pg_stats', []):
    pgid = pg['pgid']
    pool_id = pgid.split('.')[0]
    state = pg['state']
    pool_pg.setdefault(pool_id, {}).setdefault(state, 0)
    pool_pg[pool_id][state] += 1
for pool, states in pool_pg.items():
    print(f'Pool {pool}: {states}')
"
```

## Checking Pool I/O Statistics

```bash
# Current I/O rates per pool
ceph osd pool stats

# Detailed I/O breakdown
ceph osd pool stats --format json-pretty | python3 -c "
import sys, json
pools = json.load(sys.stdin)
for p in pools:
    cs = p.get('client_io_rate', {})
    print(f\"{p['pool_name']}: reads={cs.get('read_bytes_sec',0)//(1024**2)}MB/s writes={cs.get('write_bytes_sec',0)//(1024**2)}MB/s read_ops={cs.get('read_op_per_sec',0)}/s write_ops={cs.get('write_op_per_sec',0)}/s\")
"
```

## BlueStore Per-OSD Pool Breakdown

For granular per-OSD pool usage:

```bash
# Query specific OSD for pool stats
ceph daemon osd.0 perf dump | grep -A 5 "pool"

# List in-flight OSD operations
ceph daemon osd.0 dump_ops_in_flight
```

## Summary Script

```bash
#!/bin/bash
echo "=== Pool Summary ==="
ceph df detail

echo ""
echo "=== Quotas ==="
for pool in $(ceph osd pool ls); do
  quota=$(ceph osd pool get-quota $pool 2>/dev/null)
  if echo "$quota" | grep -qv "N/A"; then
    echo "Pool $pool: $quota"
  fi
done

echo ""
echo "=== Compression ==="
ceph df detail --format json-pretty | python3 -c "
import sys, json
data = json.load(sys.stdin)
for p in data.get('pools', []):
    s = p.get('stats', {})
    cb = s.get('compress_bytes_used', 0)
    cu = s.get('compress_under_bytes', 0)
    if cu > 0:
        print(f\"{p['name']}: {cu/(1024**3):.1f}GiB compressible, {cb/(1024**3):.1f}GiB on disk\")
"
```

## Summary

Viewing detailed Ceph pool breakdowns requires combining multiple commands: `ceph df detail` for capacity and compression, `ceph osd pool stats` for I/O metrics, `ceph osd pool get-quota` for quota consumption, and RADOS omap introspection for OMAP-heavy pools. JSON output with Python or jq parsing enables automated pool auditing scripts. These metrics are essential for capacity planning, identifying bloated pools, and validating that compression is providing expected savings.
