# How to Expand a ZFS Pool by Adding New Disks on Ubuntu

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Ubuntu, ZFS, Storage, Linux, Disk Management

Description: Expand a ZFS pool's capacity on Ubuntu by adding new vdevs or replacing disks with larger ones, with examples for mirrors, RAIDZ, and spare configurations.

---

ZFS pool expansion works differently than LVM. In LVM, you add a disk to a Volume Group and immediately have more contiguous space. ZFS has specific rules about how you can expand, depending on your pool's vdev topology. Understanding these rules upfront prevents confusion later.

## The Fundamental ZFS Expansion Rule

ZFS stores data across vdevs using striping. When you add a new vdev to a pool, ZFS stripes new data across all vdevs. Data already on existing vdevs stays there - it doesn't automatically rebalance.

**What you CAN do:**
- Add a new vdev of the same type to expand the pool (e.g., add a second mirror pair to a pool that has one mirror pair)
- Replace a disk in an existing vdev with a larger disk and then expand (requires all disks in the vdev to be replaced)

**What you CANNOT do:**
- Add a single disk to an existing RAIDZ vdev to change its width
- Add a disk to a mirror to change it to RAIDZ
- Change the RAIDZ level of an existing vdev

For RAIDZ pools, the most practical expansion strategy is usually adding an entirely new RAIDZ vdev (same RAIDZ level, same width).

## Checking Current Pool Configuration

```bash
sudo zpool status tank
```

```text
  pool: tank
 state: ONLINE
  scan: scrub repaired 0 in 01:23:45 with 0 errors
config:

        NAME           STATE
        tank           ONLINE
          raidz2-0     ONLINE
            sdb        ONLINE
            sdc        ONLINE
            sdd        ONLINE
            sde        ONLINE

errors: No known data errors
```

```bash
# Check current capacity
sudo zpool list tank
```

```text
NAME  SIZE  ALLOC   FREE  FRAG    CAP
tank  7.27T  5.52T  1.75T  35%    75%
```

The pool is 75% full - time to expand.

## Method 1: Add a New vdev

Adding a new vdev increases pool capacity immediately. For a RAIDZ2 pool with 4 disks, you'd add another group of 4 disks as a second RAIDZ2 vdev.

### Add a mirror vdev to a mirror pool

```bash
# Existing pool has: mirror of disk1+disk2
# Add another mirror pair

sudo zpool add tank mirror \
  /dev/disk/by-id/ata-newdisk1 \
  /dev/disk/by-id/ata-newdisk2
```

The pool now has two mirror vdevs, with double the capacity.

### Add a RAIDZ2 vdev to a RAIDZ2 pool

```bash
# Add a second group of 4 disks as RAIDZ2
sudo zpool add tank raidz2 \
  /dev/disk/by-id/ata-newdisk1 \
  /dev/disk/by-id/ata-newdisk2 \
  /dev/disk/by-id/ata-newdisk3 \
  /dev/disk/by-id/ata-newdisk4
```

### Verify after adding

```bash
sudo zpool status tank
```

```text
config:

        NAME           STATE
        tank           ONLINE
          raidz2-0     ONLINE
            sdb        ONLINE
            sdc        ONLINE
            sdd        ONLINE
            sde        ONLINE
          raidz2-1     ONLINE    <- New vdev
            sdf        ONLINE
            sdg        ONLINE
            sdh        ONLINE
            sdi        ONLINE
```

```bash
sudo zpool list tank
```

```text
NAME   SIZE   ALLOC   FREE  FRAG  CAP
tank  14.55T  5.52T  9.02T  18%   37%
```

Capacity roughly doubled. The existing 5.52T of data remains on the original vdev; new writes will be striped across both vdevs.

## Method 2: Replace Disks with Larger Ones (Online Expansion)

If your pool is a mirror, you can replace disks one at a time with larger ones and then expand the vdev's usable size once all members are replaced.

### Step-by-step mirror expansion

Starting pool: mirror of two 1TB disks, replace with 2TB disks.

**Step 1: Replace the first disk**

```bash
# Take the first disk offline
sudo zpool offline tank /dev/disk/by-id/ata-old-disk1

# Physically replace it with a larger disk (or remove and re-attach)
# ZFS will show the device as offline/removed

# Replace with the new disk
sudo zpool replace tank /dev/disk/by-id/ata-old-disk1 /dev/disk/by-id/ata-new-disk1
```

ZFS immediately begins resilvering (copying data from the remaining mirror member to the new disk):

```bash
sudo zpool status tank
```

```text
  pool: tank
 state: ONLINE
status: One or more devices is currently being resilvered.
  scan: resilver in progress since Mon Mar  2 10:00:00 2026
        512G scanned at 350M/s, 256G issued, 1000G total
        0 repaired, 25.60% done, 00:21:00 to go
config:

        NAME                     STATE
        tank                     ONLINE
          mirror-0               ONLINE
            replacing-0          ONLINE
              ata-old-disk1      OFFLINE
              ata-new-disk1      ONLINE   (resilvering)
            ata-old-disk2        ONLINE
```

Wait for resilvering to complete:

```bash
# Watch progress
watch -n 10 'sudo zpool status tank | grep scan'
```

**Step 2: Replace the second disk**

Once the first resilver completes, replace the second disk:

```bash
sudo zpool offline tank /dev/disk/by-id/ata-old-disk2
sudo zpool replace tank /dev/disk/by-id/ata-old-disk2 /dev/disk/by-id/ata-new-disk2
```

Wait for the second resilver to complete.

**Step 3: Expand the pool to use the new disk size**

After both disks are replaced with larger ones, the pool doesn't automatically use the additional space. Enable `autoexpand` to trigger the expansion:

```bash
sudo zpool set autoexpand=on tank
```

If autoexpand doesn't trigger automatically, force it:

```bash
# Online expand the pool
sudo zpool online -e tank /dev/disk/by-id/ata-new-disk1
sudo zpool online -e tank /dev/disk/by-id/ata-new-disk2
```

Verify the expanded size:

```bash
sudo zpool list tank
```

```text
NAME   SIZE   ALLOC  FREE  FRAG  CAP
tank  1.82T  0.99T  840G  22%   54%
```

The pool now uses the full capacity of the larger disks.

## Method 3: Add a Hot Spare

Spares don't add usable capacity but provide a standby disk for automatic replacement on failure:

```bash
# Add a hot spare
sudo zpool add tank spare /dev/disk/by-id/ata-spare-disk
```

```bash
sudo zpool status tank
```

```text
config:

        NAME               STATE
        tank               ONLINE
          raidz2-0         ONLINE
            sdb            ONLINE
            sdc            ONLINE
            sdd            ONLINE
            sde            ONLINE
        spares
          ata-spare-disk   AVAIL
```

Enable autoreplace:

```bash
sudo zpool set autoreplace=on tank
```

When a disk in the pool fails, ZFS automatically starts resilvering to the spare.

## Adding a Read Cache (L2ARC)

Add an SSD as a read cache to improve read performance without adding redundancy:

```bash
sudo zpool add tank cache /dev/disk/by-id/nvme-Samsung-SSD-xxxx
```

```bash
sudo zpool status tank | grep cache
```

```text
        cache
          nvme-Samsung-SSD  ONLINE
```

The L2ARC (Level 2 Adaptive Replacement Cache) supplements RAM-based ARC. Effective for read-heavy workloads with working sets larger than RAM.

Remove cache device:

```bash
sudo zpool remove tank /dev/disk/by-id/nvme-Samsung-SSD-xxxx
```

## Adding a Write Log (SLOG)

A separate log device (SLOG) improves synchronous write performance:

```bash
# Mirror the SLOG for reliability (SLOG failure = potential data loss)
sudo zpool add tank log mirror \
  /dev/disk/by-id/nvme-ssd1 \
  /dev/disk/by-id/nvme-ssd2
```

SLOG is most beneficial for NFS servers, databases with `fsync()` intensive workloads, and other synchronous-write heavy applications.

## Verifying Pool Expansion

After any expansion operation:

```bash
# Full pool details
sudo zpool list -v tank

# I/O across vdevs
sudo zpool iostat -v tank 2

# Verify pool health
sudo zpool status tank
```

```text
NAME        SIZE  ALLOC   FREE  READ  WRITE
tank       14.5T  5.52T  9.02T     0      0
  raidz2   7.27T  5.52T  1.75T     0      0
    sdb        -      -      -      0      0
    sdc        -      -      -      0      0
    sdd        -      -      -      0      0
    sde        -      -      -      0      0
  raidz2   7.27T      0  7.27T     0      0
    sdf        -      -      -      0      0
    sdg        -      -      -      0      0
    sdh        -      -      -      0      0
    sdi        -      -      -      0      0
```

The new RAIDZ2 vdev shows all free space (new data will flow there over time as old vdev fills).

## Important Caveats

**No disk removal from RAIDZ**: You cannot remove a disk from a RAIDZ vdev. The only way to reduce a RAIDZ pool is to migrate data to a new, smaller pool.

**Mirror vdev removal**: As of recent ZFS versions, mirror vdevs can sometimes be removed with `zpool remove`, but this requires rebalancing data which is a long operation.

**Expansion is permanent**: Adding vdevs to a pool is a one-way operation. Plan your pool layout carefully.

ZFS expansion strategy comes down to planning the right vdev topology initially, then expanding by adding matching vdevs rather than changing what already exists.
