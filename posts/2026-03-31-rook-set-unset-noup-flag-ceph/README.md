# How to Set and Unset the noup Flag in Ceph

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Rook, Ceph, OSD, Flag, Maintenance, Storage

Description: Learn how the Ceph noup flag prevents OSDs from being marked up and how to use it to control OSD startup during cluster maintenance.

---

The `noup` flag prevents Ceph OSDs from transitioning to the `up` state, even when their daemon processes are running and reporting to the monitors. This is a powerful tool for controlled cluster startup and maintenance scenarios.

## What noup Does

When an OSD daemon starts, it reports its state to the monitors and normally transitions to `up`. With `noup` set, the monitors acknowledge the OSD but keep it in the `down` state in the OSD map. This means the OSD will not actively serve PGs or handle any client I/O, even though PGs may still be mapped to it via CRUSH.

## Setting the noup Flag

```bash
ceph osd set noup
```

Verify:

```bash
ceph osd dump | grep flags
# flags noup

ceph osd stat
# N osds: N up, N in
```

The number of `up` OSDs will not increase as long as `noup` is set.

## Use Case - Controlled Cluster Startup

After a power outage where all nodes restart simultaneously, you may want to bring OSDs up in a controlled order:

```bash
# Set noup before restarting any OSD services
ceph osd set noup

# Start OSDs on node1 first
ssh node1 systemctl start ceph-osd.target

# Verify they are running but not up
ceph osd tree

# Inspect logs for any errors
journalctl -u ceph-osd@0 -n 50

# When satisfied, allow OSDs to become up
ceph osd unset noup
```

## Use Case - Preventing Split-Brain During Network Partition

During network maintenance that might cause a temporary partition, setting `noup` ensures that OSDs that see the monitors through an alternate path do not prematurely become primary:

```bash
ceph osd set noup
# Perform network maintenance
ceph osd unset noup
```

## Allowing a Specific OSD to Come Up

There is no command to manually mark an individual OSD as `up` - the OSD daemon must report to the monitors itself. The global `noup` flag cannot be overridden on a per-OSD basis. To test a specific OSD while keeping others down, briefly unset the global flag and then re-set it:

```bash
# Unset noup, let the target OSD come up
ceph osd unset noup

# Wait for osd.3 to transition to up
ceph osd tree

# Re-set noup to prevent remaining OSDs from coming up
ceph osd set noup
```

Note that Ceph also supports per-OSD noup flags via `ceph osd add-noup osd.3` and `ceph osd rm-noup osd.3`, but these only add restrictions - they do not override the global `noup` flag.

## Unsetting noup

```bash
ceph osd unset noup
```

After unsetting, all running OSD processes that were held in `down` state will transition to `up` within a few seconds.

```bash
watch ceph osd stat
```

## Combining with Other Flags

During a full cluster restart scenario, combine `noup`, `noout`, and `noin`:

```bash
ceph osd set noup
ceph osd set noout
ceph osd set noin
# Restart OSDs
# Verify all are healthy
ceph osd unset noup
ceph osd unset noout
ceph osd unset noin
```

## Summary

The `noup` flag gives you manual control over when OSD daemons become active in the cluster. It is most valuable during controlled restarts, power recovery situations, and network maintenance where you want to prevent premature OSD state transitions. Always unset it promptly after completing the relevant operation.
