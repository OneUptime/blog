# How to Set and Unset the noout Flag in Ceph

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Rook, Ceph, OSD, Flag, Maintenance, Storage

Description: Learn how to use the Ceph noout flag to prevent OSDs from being marked out during planned maintenance and how to safely remove it afterward.

---

The `noout` flag prevents Ceph from automatically marking OSDs as `out` when they stop reporting to the monitors. This is essential during planned maintenance windows to avoid unnecessary data rebalancing.

## Why noout Matters

By default, if an OSD is `down` for more than `mon_osd_down_out_interval` seconds (default 600), Ceph marks it `out`. This triggers PG remapping and recovery across the cluster, which consumes significant I/O bandwidth. During a planned node reboot or upgrade, this behavior is counterproductive.

## Setting the noout Flag

```bash
ceph osd set noout
```

Verify the flag is active:

```bash
ceph osd dump | grep flags
# Output should include: flags noout
```

Or via the status summary:

```bash
ceph status
# HEALTH_WARN: noout flag(s) set
```

## Setting noout on a Specific OSD

Since Ceph Nautilus, you can set the flag per OSD instead of cluster-wide:

```bash
ceph osd set-group noout osd.2 osd.3
```

This is safer because it scopes the effect to the specific OSDs being maintained.

## Performing Maintenance

With `noout` set, you can safely stop an OSD daemon without triggering rebalancing:

```bash
# Stop the OSD on the node
systemctl stop ceph-osd@2.service

# Perform maintenance (kernel update, disk swap, etc.)
# ...

# Restart the OSD
systemctl start ceph-osd@2.service
```

Wait for the OSD to rejoin and all PGs to return to `active+clean`:

```bash
watch ceph status
```

## Unsetting the noout Flag

After maintenance is complete and the cluster is healthy:

```bash
ceph osd unset noout
```

Or for per-OSD flags:

```bash
ceph osd unset-group noout osd.2 osd.3
```

Verify the flag is removed:

```bash
ceph osd dump | grep flags
ceph health
```

## Common Mistake - Forgetting to Unset

Leaving `noout` set permanently means Ceph will never remap PGs away from failed OSDs, which can eventually lead to data unavailability. Always unset the flag and confirm cluster health after maintenance.

## Summary

The `noout` flag is a critical maintenance tool that prevents Ceph from rebalancing data away from temporarily unavailable OSDs. Set it before planned downtime, perform your work, restart the OSD, confirm cluster health, and then immediately unset the flag to restore normal OSD failure handling.
