# How to Plan for Recovery Time Based on Data Size

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Rook, Ceph, Recovery, Capacity Planning, Storage

Description: Learn how to estimate Ceph OSD recovery time based on data size, network bandwidth, and recovery settings to plan maintenance windows and assess data risk.

---

## Why Recovery Time Planning Matters

Recovery time determines how long your cluster is in a degraded state. The longer the recovery, the greater the risk that a second failure occurs before full redundancy is restored. Planning helps you:
- Size maintenance windows accurately
- Assess risk during OSD replacements
- Set appropriate recovery throttling levels

## Key Variables That Affect Recovery Time

1. **Amount of data per OSD** - more data means longer recovery
2. **Network bandwidth** - cluster network throughput caps recovery speed
3. **Disk I/O performance** - disk read/write speed limits throughput
4. **Recovery concurrency** - `osd_recovery_max_active` and `osd_max_backfills`
5. **Recovery sleep** - `osd_recovery_sleep` throttling

## Calculating Data Per OSD

Get the total data stored in the cluster:

```bash
ceph df
ceph osd df
```

Example: if a cluster has 100 TB raw with 3x replication, each OSD holds roughly:

```text
total_data_per_osd = (total_raw / num_osds)
```

Check individual OSD usage:

```bash
ceph osd df tree
```

## Estimating Recovery Throughput

Recovery throughput depends on the cluster network and disk speed. Benchmark current recovery rate:

```bash
ceph -s | grep recovering
```

Typical recovery throughput:
- HDD cluster: 50-100 MB/s per OSD
- SSD cluster: 200-500 MB/s per OSD
- NVMe cluster: 500 MB/s - 2 GB/s per OSD

## Recovery Time Estimation Formula

```text
recovery_time_seconds = data_per_osd_bytes / recovery_bandwidth_bytes_per_sec
```

Example calculation for a 10 TB OSD at 100 MB/s:

```bash
python3 -c "
data_per_osd_gb = 10000  # 10 TB in GB
recovery_bandwidth_mb_per_s = 100
time_seconds = (data_per_osd_gb * 1024) / recovery_bandwidth_mb_per_s
print(f'Estimated recovery time: {time_seconds/3600:.1f} hours')
"
```

## Checking Current Cluster Recovery Rate

```bash
ceph status --format json | python3 -c "
import sys, json
s = json.load(sys.stdin)
pg = s.get('pgmap', {})
rate = pg.get('recovering_bytes_per_sec', 0)
remaining = pg.get('degraded_objects', 0)
avg_obj_size = 4 * 1024 * 1024  # assume 4MB average
if rate > 0:
    eta_sec = (remaining * avg_obj_size) / rate
    print(f'Recovery rate: {rate/1024/1024:.1f} MB/s')
    print(f'Estimated ETA: {eta_sec/60:.0f} minutes')
else:
    print('Recovery not active or rate unavailable')
"
```

## Tuning for Faster Recovery

During planned maintenance with no client traffic, maximize recovery speed:

```bash
ceph config set osd osd_recovery_max_active 10
ceph config set osd osd_recovery_sleep_hdd 0
ceph config set osd osd_recovery_sleep_ssd 0
ceph config set osd osd_max_backfills 4
ceph config set osd osd_recovery_op_priority 63
```

Restore conservative settings when clients reconnect:

```bash
ceph config set osd osd_recovery_max_active 3
ceph config set osd osd_recovery_sleep_hdd 0.1
ceph config set osd osd_max_backfills 1
ceph config set osd osd_recovery_op_priority 3
```

## Summary

Recovery time planning requires knowing your data volume per OSD, available recovery bandwidth, and current throttle settings. For large HDD clusters, recovery of a single OSD can take many hours. Using this estimation helps schedule maintenance windows and decide when to increase recovery aggressiveness. Rook allows these tuning parameters to be applied dynamically through the toolbox or persistently via the CephCluster CRD.
