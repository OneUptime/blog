# How to Diagnose the Top 10 Most Common Ceph Issues

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Ceph, Rook, Troubleshooting, OSD, Diagnostic

Description: Diagnose the 10 most common Ceph cluster issues including OSD down, full cluster, slow requests, PG stuck, and authentication failures with targeted commands.

---

Most Ceph incidents fall into a predictable set of categories. This guide covers the top 10 issues with the exact commands to diagnose and resolve each one.

## 1 - OSD Down

```bash
ceph osd tree | grep "down"
journalctl -u ceph-osd@N --since "1 hour ago" -p err
```

Common causes: disk failure, out of memory, network partition.

## 2 - Cluster Near Full or Full

```bash
ceph df
ceph health detail | grep "NEARFULL\|FULL"
```

Resolution: add OSDs, delete data, or increase `mon_osd_full_ratio` temporarily:

```bash
ceph osd set-full-ratio 0.97
```

## 3 - PGs Not Clean

```bash
ceph pg stat
ceph pg dump_stuck
ceph pg dump_stuck unclean
```

Most unclean PGs resolve automatically when OSDs recover. Investigate if stuck for more than 10 minutes.

## 4 - Slow Requests

```bash
ceph health detail | grep "slow"
ceph daemon osd.N dump_ops_in_flight
```

Check disk I/O on the affected OSD host:

```bash
iostat -xz 1 5 /dev/sdX
```

## 5 - MON Quorum Lost

```bash
ceph quorum_status
ceph mon stat
```

If fewer than half the MONs are responding, quorum is lost. Restart failed MONs:

```bash
systemctl restart ceph-mon@$(hostname)
```

## 6 - Clock Skew Between MONs

```bash
ceph health detail | grep "clock skew"
ntpq -p
timedatectl status
```

Resolution: synchronize NTP across all MON hosts.

## 7 - Authentication Errors

```bash
ceph auth list
ceph health detail | grep "auth\|denied"
```

Re-create a missing keyring:

```bash
ceph auth get-or-create client.admin osd "allow *" mon "allow *" mgr "allow *" mds "allow *"
```

## 8 - RBD Image Locked

```bash
rbd lock list POOL/IMAGE
```

Remove a stale lock:

```bash
rbd lock remove POOL/IMAGE "LOCKID" "LOCKER"
```

## 9 - Full Pool Blocking Writes

```bash
ceph osd pool stats POOL
ceph osd pool get-quota POOL
```

Temporarily increase quota:

```bash
ceph osd pool set-quota POOL max_bytes 107374182400  # 100 GB
```

## 10 - CephFS Client Eviction

```bash
ceph tell mds.* client ls
ceph tell mds.* client evict id=CLIENT_ID
```

Check MDS health:

```bash
ceph mds stat
ceph fs status
```

## Summary

The top 10 Ceph issues all have specific diagnostic commands that point directly to the cause. OSDs down, full clusters, slow requests, and PG issues account for the majority of incidents. Learning to quickly reach the right `ceph daemon`, `ceph osd`, and `ceph health detail` output for each issue type dramatically reduces time-to-resolution.
