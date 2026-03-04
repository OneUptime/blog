# How to Roll Back System Changes with Btrfs Snapshots on Ubuntu

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Ubuntu, Btrfs, Snapshots, System Recovery, Filesystems

Description: A practical guide to using Btrfs snapshots on Ubuntu to roll back system changes, recover from failed upgrades, and protect your installation.

---

Btrfs snapshots are one of the most powerful features of the Btrfs filesystem. When your Ubuntu system runs on Btrfs, you can take near-instant snapshots and roll back changes in seconds - whether you broke something during an upgrade, a misconfigured daemon, or a runaway package install.

This guide covers how to take Btrfs snapshots, roll back using them, and set up an automated workflow for ongoing protection.

## Prerequisites

Your Ubuntu root filesystem must be Btrfs. Check what filesystem you're using:

```bash
df -T /
```

If the output shows `btrfs` in the Type column, you're good. If you see `ext4` or another filesystem, Btrfs snapshots won't work directly - you'd need to reinstall or use Timeshift's rsync mode instead.

### Checking Subvolume Layout

Ubuntu's Timeshift expects a specific Btrfs subvolume layout. Check your current layout:

```bash
sudo btrfs subvolume list /
```

A typical Ubuntu Btrfs layout looks like:

```text
ID 256 gen 12345 top level 5 path @
ID 257 gen 12340 top level 5 path @home
```

If you see `@` for root and `@home` for home, Timeshift will work perfectly. If not, you can still use raw `btrfs` commands.

## Taking Manual Btrfs Snapshots

### Snapshot the Root Subvolume

Mount the Btrfs top-level filesystem first:

```bash
# Find the device for your root partition
lsblk -f

# Mount the Btrfs top-level (subvolid=5)
sudo mount -o subvolid=5 /dev/sda2 /mnt
```

Replace `/dev/sda2` with your actual root partition. Then take a snapshot:

```bash
# Create a read-only snapshot of the @ subvolume
sudo btrfs subvolume snapshot -r /mnt/@ /mnt/snapshots/@_before_upgrade

# Verify the snapshot was created
sudo btrfs subvolume list /mnt
```

The `-r` flag makes it read-only, which is safer for archive snapshots. Omit it if you need a writable snapshot.

### Snapshot the Home Subvolume

```bash
sudo btrfs subvolume snapshot -r /mnt/@home /mnt/snapshots/@home_before_upgrade
```

### Unmount After Snapshotting

```bash
sudo umount /mnt
```

## Rolling Back to a Snapshot

Rolling back means replacing the current subvolume with the snapshot. This should be done from a live environment or a separate boot entry, but here's the full procedure.

### Rolling Back from a Live USB

Boot a Ubuntu live USB, then:

```bash
# Mount the Btrfs volume
sudo mount /dev/sda2 /mnt

# List snapshots
sudo btrfs subvolume list /mnt

# Rename the broken root subvolume
sudo mv /mnt/@ /mnt/@_broken

# Create a writable snapshot from the saved snapshot
sudo btrfs subvolume snapshot /mnt/snapshots/@_before_upgrade /mnt/@

# Unmount and reboot
sudo umount /mnt
sudo reboot
```

The system will boot into the restored state.

### Rolling Back from a Running System (with Caution)

If the system is still functional but you want to roll back, you need to reboot into the snapshot. Modify `/etc/fstab` or use a GRUB entry:

```bash
# Check current fstab
cat /etc/fstab
```

Find the root entry, which might look like:

```text
UUID=abc123 / btrfs defaults,subvol=@ 0 1
```

To test booting into a snapshot temporarily, add a custom GRUB menu entry. Edit `/etc/grub.d/40_custom`:

```bash
sudo nano /etc/grub.d/40_custom
```

```text
menuentry 'Ubuntu - Rollback Snapshot' {
    insmod btrfs
    search --no-floppy --fs-uuid --set=root abc123
    linux /@_before_upgrade/boot/vmlinuz root=UUID=abc123 rootflags=subvol=@_before_upgrade ro quiet splash
    initrd /@_before_upgrade/boot/initrd.img
}
```

Update GRUB:

```bash
sudo update-grub
```

Reboot and select the rollback entry from the GRUB menu. If it works, make it permanent by updating fstab.

## Using Timeshift for Btrfs Snapshots

Timeshift handles Btrfs snapshots cleanly when the standard subvolume layout is present.

### Install and Configure

```bash
sudo apt install timeshift
sudo timeshift --btrfs
```

This forces Btrfs mode. Timeshift will detect the `@` and `@home` subvolumes automatically.

### Create a Snapshot

```bash
sudo timeshift --create --comments "Before system update" --tags O
```

### List Snapshots

```bash
sudo timeshift --list
```

### Restore a Snapshot

```bash
sudo timeshift --restore --snapshot '2026-03-01_14-00-00'
```

Timeshift handles the subvolume swapping and GRUB reconfiguration automatically, which makes it much easier than doing it by hand.

## Automating Pre-Upgrade Snapshots

The most useful automation is snapshotting before every apt upgrade:

```bash
sudo nano /etc/apt/apt.conf.d/80btrfs-snapshot
```

```text
DPkg::Pre-Invoke {
    "if [ -x /usr/bin/timeshift ]; then timeshift --create --comments 'Pre-dpkg snapshot' --tags O --scripted; fi"
};
```

This creates a snapshot before any dpkg operation, giving you an automatic rollback point.

## Managing Snapshot Disk Usage

Btrfs snapshots share data with the original subvolume, so they start out nearly free. Over time, as data diverges, they consume more space. Monitor usage:

```bash
# Overall filesystem usage
sudo btrfs filesystem usage /

# Per-subvolume usage (requires quotas enabled)
sudo btrfs quota enable /
sudo btrfs qgroup show /
```

Enable quotas to track per-subvolume disk usage:

```bash
sudo btrfs quota enable /
sudo btrfs subvolume list / | awk '{print $NF}' | while read sv; do
    echo "--- $sv ---"
    sudo btrfs qgroup show / 2>/dev/null | grep "$sv"
done
```

### Deleting Old Snapshots

```bash
# List snapshots at the top level
sudo mount -o subvolid=5 /dev/sda2 /mnt
sudo btrfs subvolume list /mnt | grep snapshot

# Delete a specific snapshot
sudo btrfs subvolume delete /mnt/snapshots/@_old_snapshot

sudo umount /mnt
```

Or with Timeshift:

```bash
sudo timeshift --delete --snapshot '2026-02-01_02-00-00'
```

## Verifying a Snapshot Before Rollback

Before committing to a rollback, you can mount a snapshot read-only and inspect it:

```bash
sudo mount -o subvolid=5 /dev/sda2 /mnt
sudo mount -o subvol=snapshots/@_before_upgrade,ro /dev/sda2 /tmp/snapshot-inspect

# Inspect files
ls /tmp/snapshot-inspect/etc/
cat /tmp/snapshot-inspect/etc/apt/sources.list

sudo umount /tmp/snapshot-inspect
sudo umount /mnt
```

This lets you confirm the snapshot contains what you expect before swapping it in.

## Summary

Btrfs snapshots offer a fast and space-efficient way to protect your Ubuntu system. The key operations - snapshot, rollback, and delete - all happen at the filesystem level without copying data block by block. Paired with Timeshift for automation and GRUB configuration for boot-time selection, Btrfs snapshots make system recovery a matter of minutes rather than hours.

The main limitation is that your root partition must use Btrfs. If you're planning a fresh Ubuntu install and want snapshot capability, selecting Btrfs during installation is worth the slight learning curve.
