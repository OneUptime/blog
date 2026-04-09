# How to Monitor SMB Connection Performance with Ceph

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Rook, Ceph, SMB, Monitoring, Performance

Description: Learn how to monitor SMB connection performance for Ceph-backed Samba shares using smbstatus, Samba VFS statistics, and Prometheus metrics.

---

## Monitoring Layers

SMB performance monitoring for Ceph spans three layers:
- Samba session and connection statistics
- CephFS I/O metrics at the MDS and OSD level
- System resource utilization on gateway nodes

## Using smbstatus

`smbstatus` shows active connections, open files, and file locks:

```bash
# Show all active sessions
smbstatus

# Show connected shares
smbstatus -S

# Show locked files
smbstatus -L
```

Example output:

```text
Samba version 4.19.0
PID     Username     Group        Machine    Protocol Version  Encryption  Signing
------------------------------------------------------------------------
12345   alice        engineers    10.0.1.100 SMB3_11  -          -

Service      pid     Machine       Connected at                     Encryption  Signing
---------------------------------------------------------------------------
cephshare    12345   10.0.1.100    Tue Mar 31 09:15:12 2026 UTC     -          -
```

## Monitoring with net status

The `net` command provides summary statistics:

```bash
net status sessions
net status shares
```

## CephFS Performance Statistics

Check MDS performance counters relevant to SMB workloads:

```bash
# MDS operation counts
ceph daemon mds.* perf dump | python3 -m json.tool | grep -A2 "req_"

# Client I/O statistics
ceph fs status
```

Monitor active CephFS clients:

```bash
ceph tell mds.0 client ls | python3 -m json.tool | grep -E "client_id|hostname"
```

## Collecting Samba Metrics with Prometheus

Use the Go-based `samba_exporter` to expose Samba metrics to Prometheus. Install it from the project's release packages at [imker25/samba_exporter](https://github.com/imker25/samba_exporter):

```bash
# Install from .deb or .rpm package (not available via pip)
# For Debian/Ubuntu:
sudo dpkg -i samba-exporter_<version>_amd64.deb
sudo systemctl enable --now samba_exporter
```

Key metrics exposed:

```text
samba_client_count
samba_share_count
samba_locked_file_count
samba_pid_count
samba_server_up
```

Scrape configuration for Prometheus:

```yaml
scrape_configs:
  - job_name: 'samba'
    static_configs:
      - targets: ['samba01:9922', 'samba02:9922']
```

## Grafana Dashboard Panels

Create panels for key SMB metrics:

```text
# Active client count over time
samba_client_count

# Active shares over time
samba_share_count

# Locked files over time
samba_locked_file_count

# Server availability
samba_server_up
```

## Identifying Slow Operations

Enable the slow query log in Samba:

```ini
[global]
    log level = 1 smb2:10
    smb2 leases = yes
```

Check for slow operations in the log:

```bash
grep "slow" /var/log/samba/log.smbd | tail -20
```

Monitor CephFS latency for underlying operations:

```bash
ceph daemon mds.0 perf dump | python3 -c "
import sys, json
d = json.load(sys.stdin)
lat = d.get('mds_server', {}).get('req_setattr_latency', {})
avg_seconds = lat.get('avgtime', 0)
print(f'setattr avg latency: {avg_seconds * 1000:.2f}ms')
"
```

## Summary

Monitoring SMB performance for Ceph involves using `smbstatus` for real-time session visibility, CephFS metrics for storage-layer latency, and Prometheus with a Samba exporter for historical trending. Combining these sources in Grafana dashboards provides the visibility needed to identify whether performance issues originate at the SMB gateway, the CephFS metadata layer, or the underlying OSD storage.
