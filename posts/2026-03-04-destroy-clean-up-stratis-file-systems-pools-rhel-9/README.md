# How to Destroy and Clean Up Stratis File Systems and Pools on RHEL

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: RHEL, Stratis, Storage, Cleanup, Linux

Description: Learn how to properly destroy Stratis file systems and pools on RHEL, including unmounting, removing fstab entries, and cleaning up block devices.

---

When you need to decommission Stratis storage, repurpose disks, or clean up test environments, it is important to follow the correct sequence of steps to avoid leaving orphaned configurations. This guide covers the complete process of destroying Stratis file systems and pools on RHEL.

## Prerequisites

- A RHEL system with root or sudo access
- Existing Stratis pools and filesystems to remove
- Stratis daemon running

## Understanding the Destruction Order

Stratis resources must be destroyed in the correct order:

1. Unmount all filesystems
2. Remove fstab entries
3. Destroy snapshots (they are filesystems too)
4. Destroy filesystems
5. Destroy the pool
6. Optionally wipe the block devices

You cannot destroy a pool that contains filesystems, and you cannot destroy a filesystem that is mounted.

## Step 1: Identify What to Remove

List all pools:

```bash
sudo stratis pool list
```

List all filesystems:

```bash
sudo stratis filesystem list
```

List all block devices:

```bash
sudo stratis blockdev list
```

## Step 2: Unmount All Filesystems

Find and unmount all Stratis filesystems in the target pool:

```bash
# Find mounted Stratis filesystems
mount | grep stratis

# Unmount each one
sudo umount /documents
sudo umount /projects
sudo umount /backups
```

If a filesystem is busy:

```bash
sudo fuser -mv /documents
# Stop the processes using the filesystem
sudo umount /documents
```

Or force unmount:

```bash
sudo umount -l /documents
```

## Step 3: Remove fstab Entries

Edit `/etc/fstab` and remove or comment out entries for the Stratis filesystems:

```bash
sudo vi /etc/fstab
```

Remove lines like:

```
UUID=xxx /documents xfs defaults,x-systemd.requires=stratisd.service 0 0
```

Verify no Stratis entries remain:

```bash
grep stratis /etc/fstab
```

## Step 4: Destroy Snapshots

Snapshots must be destroyed before the source filesystem:

```bash
# List filesystems to identify snapshots
sudo stratis filesystem list datapool

# Destroy each snapshot
sudo stratis filesystem destroy datapool documents-snap-20260304
sudo stratis filesystem destroy datapool documents-snap-20260305
```

## Step 5: Destroy Filesystems

Remove each filesystem from the pool:

```bash
sudo stratis filesystem destroy datapool documents
sudo stratis filesystem destroy datapool projects
sudo stratis filesystem destroy datapool backups
```

Verify all filesystems are removed:

```bash
sudo stratis filesystem list datapool
```

## Step 6: Destroy the Pool

With all filesystems removed, destroy the pool:

```bash
sudo stratis pool destroy datapool
```

Verify:

```bash
sudo stratis pool list
```

## Step 7: Clean Up Block Devices (Optional)

After destroying the pool, the block devices are released but may retain Stratis signatures. To reuse them for other purposes, wipe the signatures:

```bash
sudo wipefs -a /dev/sdb
sudo wipefs -a /dev/sdc
```

Verify the devices are clean:

```bash
sudo blkid /dev/sdb
sudo blkid /dev/sdc
```

## Scripted Cleanup

For automated cleanup of a pool and all its contents:

```bash
sudo tee /usr/local/bin/stratis-cleanup.sh << 'SCRIPT'
#!/bin/bash
POOL="$1"

if [ -z "$POOL" ]; then
    echo "Usage: $0 <pool_name>"
    exit 1
fi

echo "This will destroy pool '$POOL' and ALL its filesystems."
echo "This action is IRREVERSIBLE."
read -p "Type 'yes' to confirm: " confirm

if [ "$confirm" != "yes" ]; then
    echo "Aborted."
    exit 1
fi

# Unmount all filesystems in the pool
for fs in $(stratis filesystem list "$POOL" --no-headers 2>/dev/null | awk '{print $2}'); do
    device="/dev/stratis/${POOL}/${fs}"
    mountpoint=$(findmnt -n -o TARGET "$device" 2>/dev/null)
    if [ -n "$mountpoint" ]; then
        echo "Unmounting $mountpoint..."
        umount "$mountpoint"
    fi
done

# Destroy all filesystems
for fs in $(stratis filesystem list "$POOL" --no-headers 2>/dev/null | awk '{print $2}'); do
    echo "Destroying filesystem: $fs"
    stratis filesystem destroy "$POOL" "$fs"
done

# Destroy the pool
echo "Destroying pool: $POOL"
stratis pool destroy "$POOL"

echo "Pool '$POOL' has been destroyed."
echo "Remember to:"
echo "  1. Remove related entries from /etc/fstab"
echo "  2. Run 'wipefs -a' on released block devices if reusing them"
SCRIPT
sudo chmod +x /usr/local/bin/stratis-cleanup.sh
```

Usage:

```bash
sudo /usr/local/bin/stratis-cleanup.sh datapool
```

## Cleaning Up a Partially Failed Pool

If a pool is in a bad state and normal destruction fails:

```bash
# Force stop the Stratis daemon
sudo systemctl stop stratisd

# Wipe Stratis metadata from all devices
sudo wipefs -a /dev/sdb
sudo wipefs -a /dev/sdc

# Clear device mapper entries
sudo dmsetup ls | grep stratis
sudo dmsetup remove_all --force

# Restart stratisd
sudo systemctl start stratisd

# Verify clean state
sudo stratis pool list
```

## Verifying Complete Cleanup

After destruction, confirm everything is clean:

```bash
# No pools
sudo stratis pool list

# No filesystems
sudo stratis filesystem list

# No Stratis block devices
sudo stratis blockdev list

# No Stratis device mapper entries
sudo dmsetup ls | grep stratis

# No Stratis entries in fstab
grep stratis /etc/fstab

# No Stratis mounts
mount | grep stratis
```

## Conclusion

Properly destroying Stratis file systems and pools on RHEL requires following a specific order: unmount, remove fstab entries, destroy snapshots, destroy filesystems, destroy the pool, and optionally wipe block devices. Skipping steps can leave orphaned configurations that interfere with future storage setup. By following this systematic approach, you ensure a clean removal that frees all resources for reuse.
