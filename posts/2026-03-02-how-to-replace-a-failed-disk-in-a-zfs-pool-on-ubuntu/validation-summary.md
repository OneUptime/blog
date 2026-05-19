# Validation Summary: How to Replace a Failed Disk in a ZFS Pool on Ubuntu

## Status
validated

## Post Type
Tutorial / Step-by-step operational guide

## Technologies Covered
- ZFS (OpenZFS on Linux)
- Ubuntu
- zpool CLI (status, offline, replace, scrub, clear, iostat, set, add, detach)
- Linux device management (udevadm, lsblk, /dev/disk/by-id)
- ZFS mirror and RAIDZ vdev topologies
- ZFS hot spares and autoreplace property

## Sources Consulted
- OpenZFS zpoolconcepts(7): https://openzfs.github.io/openzfs-docs/man/master/7/zpoolconcepts.7.html
- OpenZFS zpoolprops(7): https://openzfs.github.io/openzfs-docs/man/master/7/zpoolprops.7.html
- OpenZFS zpool-replace(8): https://openzfs.github.io/openzfs-docs/man/master/8/zpool-replace.8.html
- OpenZFS zpool-status(8): https://openzfs.github.io/openzfs-docs/man/master/8/zpool-status.8.html
- Oracle ZFS Administration Guide — Resolving ZFS Storage Device Problems: https://docs.oracle.com/cd/E26505_01/html/E37384/gbbba.html
- Oracle Solaris 11.3 ZFS — Working With Hot Spares: https://docs.oracle.com/cd/E53394_01/html/E54801/gpegp.html
- openzfs/zfs GitHub discussions on hot spares and autoreplace behavior

## Issues Found

1. **Incorrect status/action message for a FAULTED disk** (Identifying a Failed Disk section). The example showed `status: One or more devices has been removed by the administrator.` with `action: Online the device using 'zpool online' or replace the device with 'zpool replace'.` That message is what ZFS prints when a device has been administratively offlined, not when a device is FAULTED with persistent READ/WRITE/CKSUM errors as depicted. I replaced the status and action lines with the correct messages for a faulted device: `One or more devices are faulted in response to persistent errors. Sufficient replicas exist for the pool to continue functioning in a degraded state.` and `Replace the faulted device, or use 'zpool clear' to mark the device repaired.`

2. **Incorrect state on the `replacing-0` vdev during resilver** (Step 5: Monitor the Resilver section). The example showed `replacing-0 UNAVAIL`, but with one child OFFLINE and the other ONLINE/resilvering, ZFS shows the container `replacing-N` vdev as `DEGRADED` (it would only be UNAVAIL if no child can provide data). Changed to `replacing-0 DEGRADED`.

## Review Notes

- The intro mentions "catastrophic for RAIDZ1 or RAIDZ pools." In ZFS, `raidz` without a numeric suffix is RAIDZ1, so the two terms are equivalent. This is stylistically redundant but not technically wrong; left as-is.
- The hot-spare reintegration workflow (`zpool detach` followed by `zpool add ... spare`) works but is unconventional. The idiomatic approach is `zpool replace pool old_disk new_disk`, after which the spare automatically returns to AVAIL in the spares list. The author's flow is a valid alternative and is not incorrect, so it was left unchanged.
- `autoreplace=on` requires ZED (the ZFS Event Daemon) to be running and acts on devices appearing in the same physical location as a prior pool member. The post correctly mentions the property without going into ZED requirements; this is a reasonable simplification for the article's scope.
- The simplified by-id examples (`ata-WDC-disk1`) are stylized — real-world by-id paths include model and serial (e.g., `ata-WDC_WD40EFRX-68N32N0_WD-WCC7K0CXYZ`). This is acceptable as illustrative shorthand.
