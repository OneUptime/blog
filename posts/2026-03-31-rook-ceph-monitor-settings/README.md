# How to Configure Monitor Settings in Ceph

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Rook, Ceph, Monitor, Configuration, Storage, Quorum

Description: Learn how to configure Ceph monitor settings for quorum behavior, clock drift tolerance, pool deletion permissions, and monitor data storage.

---

## Monitor Configuration Overview

Ceph monitors are the authoritative source of cluster state. Configuring them correctly ensures cluster stability, proper quorum behavior, and safe cluster management operations. Most monitor settings can be applied at runtime via `ceph config set mon` or in the `[mon]` section of `ceph.conf`.

## Monitor Data Directory

Each monitor stores its database in a dedicated directory:

```ini
[mon]
mon_data = /var/lib/ceph/mon/$cluster-$id
```

In Rook, monitor data is stored in PersistentVolumes:

```yaml
apiVersion: ceph.rook.io/v1
kind: CephCluster
spec:
  mon:
    count: 3
    volumeClaimTemplate:
      spec:
        storageClassName: standard
        resources:
          requests:
            storage: 10Gi
```

## Clock Drift Settings

Monitors require synchronized clocks. The default maximum allowed clock drift is 0.05 seconds:

```bash
# Get current clock drift tolerance
ceph config get mon mon_clock_drift_allowed

# Allow slightly more drift (not recommended to increase much)
ceph config set mon mon_clock_drift_allowed 0.1

# Warning threshold before acting on drift
ceph config set mon mon_clock_drift_warn_backoff 5
```

Check for clock skew issues:

```bash
ceph health detail | grep clock
ceph quorum_status | python3 -m json.tool | grep skew
```

## Monitor Count and Quorum

```bash
# View current monitor count
ceph mon stat

# View quorum members
ceph quorum_status | python3 -m json.tool
```

In Rook, set monitor count in the CephCluster CRD:

```yaml
spec:
  mon:
    count: 3                    # Always odd: 3 or 5
    allowMultiplePerNode: false  # Prevent multiple mons per node
```

## Pool Deletion Prevention

By default, Ceph prevents pools from being deleted to protect against accidental data loss:

```bash
# Check current setting
ceph config get mon mon_allow_pool_delete

# Allow pool deletion (enable with caution in production)
ceph config set mon mon_allow_pool_delete true

# Re-disable after deletion
ceph config set mon mon_allow_pool_delete false
```

## OSD Map History

Monitors retain a history of OSD map versions for recovery purposes:

```bash
# Minimum number of OSD map epochs to retain
ceph config get mon mon_min_osdmap_epochs

# Maximum number of log epochs to retain
ceph config get mon mon_max_log_epochs

# Compact monitor store (removes old map versions)
ceph tell mon.* compact
```

## Monitor Log Settings

```bash
# Enable monitor log to file
ceph config set mon log_to_file true
ceph config set mon log_file /var/log/ceph/ceph-mon.$id.log

# Increase monitor debug level
ceph config set mon debug_mon 10
ceph config set mon debug_ms 1

# Reset to defaults after debugging
ceph config rm mon debug_mon
ceph config rm mon debug_ms
```

## Monitor Timeouts

```bash
# How long to wait for a monitor response (seconds)
ceph config set mon mon_lease 5

# How quickly the leader refreshes its lease
ceph config set mon mon_lease_renew_interval_factor 0.6

# Subscription refresh interval for client map updates (seconds)
ceph config set mon mon_subscribe_interval 86400
```

## Checking Monitor Health

```bash
kubectl exec -it rook-ceph-tools -n rook-ceph -- bash

# Overall monitor health
ceph mon stat

# Detailed monitor info
ceph mon dump

# Monitor metadata (version, hostname, etc.)
ceph mon metadata
```

Expected healthy `ceph mon stat` output:

```text
e3: 3 mons at {a=[v2:192.168.1.10:3300/0,v1:192.168.1.10:6789/0],...},
election epoch 12, leader 0 a, quorum 0,1,2 a,b,c
```

## Summary

Monitor configuration controls cluster quorum stability, clock drift tolerance, pool management safety, and log verbosity. Key settings include monitor count (always odd), clock drift tolerance (keep below 0.1s), pool deletion protection (enabled by default), and lease timeouts that affect failover speed. In Rook, monitor count and storage are managed through the CephCluster CRD. Regularly checking `ceph mon stat` and `ceph quorum_status` ensures the monitor layer remains healthy and responsive.
