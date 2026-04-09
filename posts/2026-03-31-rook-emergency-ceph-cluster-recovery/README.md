# How to Perform Emergency Ceph Cluster Recovery

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Ceph, Rook, Recovery, Emergency, Disaster

Description: Recover a critically degraded Ceph cluster step by step, covering MON quorum loss, majority OSD failure, HEALTH_ERR states, and cluster unfreezing procedures.

---

A Ceph cluster in HEALTH_ERR with stopped I/O is one of the most stressful situations in storage operations. This guide walks through the recovery steps for the most severe scenarios.

## Assess the Damage First

Before taking any action, understand the scope:

```bash
ceph status
ceph health detail
ceph osd tree
ceph quorum_status
```

Determine:
- Is MON quorum intact?
- How many OSDs are down?
- Are any PGs stuck in inactive state?

## Scenario 1 - MON Quorum Loss

If a majority of MONs are not running, the cluster loses quorum and becomes unavailable:

```bash
# Check which MONs are up
ceph mon stat

# Try to restart failed MONs
systemctl restart ceph-mon@mon-hostname-1
systemctl restart ceph-mon@mon-hostname-2

# If a MON's data is corrupt, rebuild from another MON
ceph-monstore-tool /var/lib/ceph/mon/ceph-mon1 rebuild -- --keyring /etc/ceph/ceph.client.admin.keyring
```

If all MON data is lost, recover using `monmaptool` and a backup:

```bash
monmaptool --print /tmp/monmap.bak
ceph-mon --mkfs -i mon1 --monmap /tmp/monmap.bak --keyring /tmp/ceph.mon.keyring
```

## Scenario 2 - Majority of OSDs Down

With more than half the OSDs down, PGs become inactive:

```bash
# Check OSDs
ceph osd tree | grep "down\|out"

# Try to bring them back up
systemctl start ceph-osd@N

# If crash-looping, check for corruption
ceph-objectstore-tool --data-path /var/lib/ceph/osd/ceph-N --type bluestore --op list-pgs
```

## Scenario 3 - Cluster Frozen with noout Set

If `noout` or `norecover` flags are blocking recovery:

```bash
ceph osd dump | grep flags
# If noout/norecover/noin flags are set
ceph osd unset noout
ceph osd unset norecover
ceph osd unset noin
```

## Scenario 4 - Stuck PGs After OSD Recovery

After OSDs come back, some PGs may remain stuck:

```bash
ceph pg dump_stuck
ceph pg dump_stuck inactive

# For a specific stuck PG, force recovery
ceph pg force-recovery PGID
ceph pg force-backfill PGID
```

## Emergency Freeze to Stop Data Loss

If the cluster is in a state where continuing would cause data loss, set emergency flags:

```bash
ceph osd set pause       # Pause all I/O
ceph osd set noout       # Prevent OSDs from being marked out
ceph osd set norebalance # Stop rebalancing
```

After stabilizing, unset them:

```bash
ceph osd unset pause
ceph osd unset noout
ceph osd unset norebalance
```

## Summary

Emergency Ceph recovery requires assessing the failure scope before acting, then addressing issues in priority order: MON quorum first, OSD availability second, and PG recovery third. Setting `pause` and `noout` before making changes prevents the cluster from making the situation worse while you diagnose. Document all steps taken for the post-mortem.
