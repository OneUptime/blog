# How to Replace a Failed Disk in a ZFS Pool on Ubuntu

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Ubuntu, ZFS, Storage, Disk Recovery, Linux

Description: Step-by-step guide to replacing a failed disk in a ZFS mirror or RAIDZ pool on Ubuntu, including resilvering, monitoring, and verifying pool health after replacement.

---

Disk failures happen. The advantage of running ZFS with redundancy (mirror or RAIDZ) is that a single disk failure doesn't cause data loss - but you need to replace the failed disk promptly. Leaving a pool in a degraded state for extended periods increases the risk of another disk failing during resilvering, which could be catastrophic for RAIDZ1 or RAIDZ pools.

## Identifying a Failed Disk

ZFS makes failed disks obvious in pool status:

```bash
sudo zpool status -v
```

```text
  pool: tank
 state: DEGRADED
status: One or more devices has been removed by the administrator.
action: Online the device using 'zpool online' or replace the device with 'zpool replace'.
  scan: scrub repaired 0 in 01:23:45 with 0 errors on Sun Mar  1 03:00:00 2026
config:

        NAME                STATE     READ WRITE CKSUM
        tank                DEGRADED     0     0     0
          mirror-0          DEGRADED     0     0     0
            sdb             ONLINE       0     0     0
            sdc             FAULTED    153    92   211

errors: No known data errors
```

The `DEGRADED` state on the pool means redundancy is reduced but the pool is still accessible. `FAULTED` on `/dev/sdc` means that disk has failed.

### Types of failure states

- **FAULTED**: The disk has completely failed or is unresponsive
- **REMOVED**: The disk was physically removed or disconnected
- **UNAVAIL**: ZFS cannot open the device
- **DEGRADED**: The vdev is operational but not fully redundant

### Get disk error details

```bash
sudo zpool status -v tank
```

The `-v` flag shows verbose error information including which files are affected.

## Step 1: Identify the Physical Disk

Map the ZFS device name to a physical disk:

```bash
# See the full device path
sudo zpool status tank | grep FAULTED

# Find more details
sudo udevadm info /dev/sdc
ls -la /dev/disk/by-id/ | grep sdc
```

The disk's serial number, model, and port information help identify which physical disk to replace.

### For disks identified by ID

```bash
sudo zpool status tank
```

If the pool was created with by-id paths:

```text
          mirror-0          DEGRADED
            ata-WDC-disk1   ONLINE
            ata-WDC-disk2   FAULTED
```

This directly tells you which disk to replace.

## Step 2: Take the Failed Disk Offline

```bash
sudo zpool offline tank /dev/sdc
```

Or if using by-id:

```bash
sudo zpool offline tank /dev/disk/by-id/ata-WDC-disk2
```

Verify it's offline:

```bash
sudo zpool status tank | grep sdc
```

```text
            sdc             OFFLINE
```

## Step 3: Physical Disk Replacement

Power down if the server doesn't support hot-swap:

```bash
sudo shutdown -h now
```

Many enterprise servers and NAS devices support hot-swap - you can pull the failed drive and insert the new one without powering down. Check your hardware documentation.

After inserting the new disk:

```bash
# Confirm the new disk is visible
lsblk

# Find its by-id path
ls -la /dev/disk/by-id/ | grep -v part
```

The new disk appears as a raw device with no partitions.

## Step 4: Replace the Disk in ZFS

```bash
# Syntax: zpool replace <pool> <old-device> <new-device>
sudo zpool replace tank /dev/sdc /dev/sdd
```

If the old disk is completely gone (physically removed), you can reference it by the name ZFS still has for it:

```bash
# If /dev/sdc no longer exists, reference by whatever name ZFS shows
sudo zpool replace tank sdc /dev/sdd
```

For by-id paths:

```bash
sudo zpool replace tank \
  /dev/disk/by-id/ata-WDC-failed-disk \
  /dev/disk/by-id/ata-WDC-new-disk
```

## Step 5: Monitor the Resilver

After the replace command, ZFS immediately starts resilvering - copying data from healthy disks to the new disk to restore full redundancy:

```bash
sudo zpool status tank
```

```text
  pool: tank
 state: DEGRADED
status: One or more devices is currently being resilvered.
  scan: resilver in progress since Mon Mar  2 14:00:00 2026
        2.17T scanned at 425M/s, 1.04T issued at 204M/s, 4.00T total
        0 repaired, 26.10% done, 02:50:14 to go
config:

        NAME              STATE     READ WRITE CKSUM
        tank              DEGRADED     0     0     0
          mirror-0        DEGRADED     0     0     0
            sdb           ONLINE       0     0     0
            replacing-0   UNAVAIL      0     0     0
              sdc         OFFLINE      0     0     0
              sdd         ONLINE       0     0     0 (resilvering)

errors: No known data errors
```

The resilver time depends on pool size, disk speed, and system load. For a 4TB pool:
- Spinning disks: 4-8 hours
- SSDs: 1-2 hours

### Monitor progress with a watch loop

```bash
watch -n 30 'sudo zpool status tank | grep -E "scan:|done"'
```

```text
  scan: resilver in progress since Mon Mar  2 14:00:00 2026
        3.21T scanned at 412M/s, 2.88T issued at 370M/s, 4.00T total
        0 repaired, 72.01% done, 00:52:07 to go
```

### Check resilver speed and I/O

```bash
sudo zpool iostat tank 5
```

Don't interrupt the resilver. If you must reboot:

```bash
sudo reboot
# ZFS will resume the resilver automatically after boot
```

## Step 6: Verify Pool Health After Resilver

```bash
sudo zpool status tank
```

After successful resilver:

```text
  pool: tank
 state: ONLINE
  scan: resilvered 4.00T in 04:12:33 with 0 errors on Mon Mar  2 18:12:33 2026
config:

        NAME        STATE     READ WRITE CKSUM
        tank        ONLINE       0     0     0
          mirror-0  ONLINE       0     0     0
            sdb     ONLINE       0     0     0
            sdd     ONLINE       0     0     0     <- New disk, fully integrated

errors: No known data errors
```

The pool is back to `ONLINE` with full redundancy restored.

### Run a scrub to verify data integrity

After a disk failure and replacement, run a scrub to verify all data is intact:

```bash
sudo zpool scrub tank
```

Wait for completion:

```bash
sudo zpool status tank | grep scan
```

## Replacing with Autoreplace and Hot Spares

If you have a hot spare configured:

```bash
sudo zpool status tank
```

```text
        spares
          sde    AVAIL
```

When a disk fails, ZFS automatically starts resilvering to the spare (if `autoreplace=on` is set):

```bash
sudo zpool set autoreplace=on tank
```

After replacing the failed disk physically, you may want to re-add it as a spare:

```bash
sudo zpool add tank spare /dev/disk/by-id/ata-new-replacement-disk
```

And detach the now-integrated former spare back to available state if needed:

```bash
sudo zpool detach tank /dev/sde
sudo zpool add tank spare /dev/sde
```

## Handling RAIDZ Pool Disk Replacement

RAIDZ disk replacement follows the same process - the resilver will reconstruct data from parity:

```bash
sudo zpool status raidz_pool
```

```text
          raidz2-0          DEGRADED
            sdb             ONLINE
            sdc             FAULTED    <- This disk failed
            sdd             ONLINE
            sde             ONLINE
```

```bash
# Replace faulted disk
sudo zpool replace raidz_pool /dev/sdc /dev/sdf
```

RAIDZ resilvers are generally slower than mirror resilvers because parity must be read from all remaining disks to reconstruct the missing data.

## Clearing Stale Errors After Replacement

After a successful replacement, clear error counters:

```bash
sudo zpool clear tank
```

This resets the READ/WRITE/CKSUM counters for all devices. Run a scrub first to ensure the pool is actually healthy before clearing.

## What Not to Do

**Don't force-online a failing disk**: If a disk shows errors but is still ONLINE, resist the urge to keep using it. Monitor it and replace proactively.

**Don't delay replacement**: A RAIDZ1 pool with one failed disk has zero redundancy. A second failure during that window loses the pool.

**Don't reformat the new disk first**: `zpool replace` handles formatting - just point it at the raw new disk.

**Don't add the new disk as a new vdev**: If you want to replace rather than expand, use `zpool replace`, not `zpool add`.

Following this procedure ensures your ZFS pool returns to full health with minimum downtime and risk.
