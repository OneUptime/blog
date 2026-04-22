# How to Fix BLUESTORE_LEGACY_STATFS Health Check in Ceph

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Ceph, Rook, BlueStore, Upgrade, Migration

Description: Learn how to resolve the BLUESTORE_LEGACY_STATFS health warning in Ceph by upgrading OSDs to use per-pool and per-omap statfs tracking for accurate usage reporting.

---

## Understanding BLUESTORE_LEGACY_STATFS

`BLUESTORE_LEGACY_STATFS` fires when one or more OSDs are using the legacy (global) statfs format rather than the per-pool statfs format introduced in Ceph Nautilus (14.x). The legacy format means `ceph df` cannot report accurate per-pool usage statistics, and the cluster cannot properly enforce pool quotas.

Check current health:

```bash
ceph health detail
```

Example output:

```text
HEALTH_WARN bluestore OSDs are using legacy statfs
[WRN] BLUESTORE_LEGACY_STATFS: 4 OSDs are using legacy (not per-pool) statfs
    osd.0, osd.1, osd.2, osd.3 are not tracking per-pool stats
```

## Identifying Affected OSDs

Check which OSDs use legacy statfs:

```bash
ceph health detail | grep BLUESTORE_LEGACY_STATFS -A 10
```

All OSDs created before Nautilus (14.x) will have the legacy format. After upgrading the cluster to Nautilus or later, new OSDs automatically use per-pool statfs.

## Fixing via OSD Restart

For OSDs running on Nautilus v14.2.5 or later that still show legacy statfs, the fix is to restart each OSD with BlueStore's migration enabled. BlueStore migrates to per-pool statfs automatically on startup if the Ceph version supports it (Nautilus v14.2.5+ introduced auto-repair on mount; earlier Nautilus releases require manual repair with `ceph-bluestore-tool`).

In Rook, restart OSD pods:

```bash
kubectl -n rook-ceph rollout restart deployment rook-ceph-osd-0
kubectl -n rook-ceph rollout restart deployment rook-ceph-osd-1
```

Monitor:

```bash
kubectl -n rook-ceph rollout status deployment rook-ceph-osd-0
```

## Fixing via ceph-bluestore-tool

For persistent legacy statfs after restart, use the BlueStore tool directly. The OSD must be stopped:

```bash
# Stop the OSD
systemctl stop ceph-osd@0

# Migrate to per-pool statfs
ceph-bluestore-tool repair --path /var/lib/ceph/osd/ceph-0

# Restart
systemctl start ceph-osd@0
```

## Performing a Deep Scrub

After migrating OSDs to per-pool statfs (via restart or `ceph-bluestore-tool repair`), a deep scrub forces BlueStore to recalculate and verify object stats:

```bash
# Scrub all PGs on the affected OSDs
ceph pg deep-scrub <pg-id>

# Or scrub all PGs on a specific OSD (may be slow)
ceph osd deep-scrub osd.0
ceph osd deep-scrub osd.1
```

Note: Deep scrub does not trigger the statfs format migration itself - it only recalculates stats within the current format. The migration must be done via OSD restart or `ceph-bluestore-tool repair`.

## Verifying the Fix

After migration, check that the warning is gone:

```bash
ceph health detail
```

Verify per-pool stats are now working:

```bash
ceph df detail
```

You should see accurate per-pool `USED` statistics.

## Understanding the Impact

Until OSDs are migrated to per-pool statfs:
- `ceph df` shows approximate pool usage
- Pool quotas may not be enforced accurately
- The dashboard may show incorrect pool utilization

This is a correctness issue, not a performance issue.

## In Rook Deployments

Rook creates OSDs with per-pool statfs automatically when using Nautilus or later images. If you see this warning after upgrading Rook, ensure the CephCluster image is updated:

```bash
kubectl -n rook-ceph patch cephcluster rook-ceph --type=merge \
  -p '{"spec":{"cephVersion":{"image":"quay.io/ceph/ceph:v18.2.0"}}}'
```

After image update, Rook rolls out new OSD pods that initialize with per-pool statfs.

## Summary

`BLUESTORE_LEGACY_STATFS` indicates OSDs are using an old per-cluster statfs format instead of per-pool tracking. Fix by restarting OSD pods/daemons on Nautilus or later - BlueStore migrates automatically on startup. If that does not work, use `ceph-bluestore-tool repair` while the OSD is stopped. Verify with `ceph df detail` that per-pool usage is now accurately reported.
