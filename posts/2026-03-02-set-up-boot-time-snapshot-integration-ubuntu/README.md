# How to Set Up Boot-Time Snapshot Integration on Ubuntu

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Ubuntu, Snapshot, GRUB, Btrfs, Boot

Description: Configure boot-time snapshot integration on Ubuntu so you can select and boot into system snapshots directly from the GRUB menu for rapid recovery.

---

Being able to restore a snapshot is useful. Being able to boot directly into a snapshot without modifying the running system is better. Boot-time snapshot integration lets you select a previous system state from the GRUB menu - no live USB required, no complex recovery steps.

This guide covers how to set this up on Ubuntu using Btrfs snapshots and a custom GRUB integration script called `grub-btrfs`.

## How Boot-Time Snapshot Integration Works

When `grub-btrfs` is installed, it scans your Btrfs filesystem for read-only snapshots and automatically adds them as bootable entries in the GRUB menu. At boot time, you can select any snapshot and boot into it without modifying any files. The snapshot stays read-only, so you're essentially testing recovery before committing.

The workflow looks like this:

1. Snapshot taken (manually or automatically).
2. `grub-btrfs` detects the snapshot and adds it to GRUB.
3. At the next reboot, the snapshot appears as a bootable option.
4. Boot into the snapshot to verify it works.
5. If good, make the rollback permanent by swapping subvolumes.

## Prerequisites

- Ubuntu with Btrfs root filesystem (`/` must be Btrfs)
- Standard subvolume layout (`@` for root, `@home` for home)
- GRUB as the bootloader

Verify your setup:

```bash
# Check filesystem type
df -T / | awk 'NR==2 {print $2}'

# Check subvolume layout
sudo btrfs subvolume list /
```

## Installing grub-btrfs

`grub-btrfs` is not in Ubuntu's default repositories, so install it from the GitHub source:

```bash
# Install dependencies
sudo apt update
sudo apt install git make inotify-tools

# Clone the repository
git clone https://github.com/Antynea/grub-btrfs.git
cd grub-btrfs

# Install
sudo make install
```

This installs:
- `/etc/grub.d/41_snapshots-btrfs` - GRUB script that generates snapshot entries
- `/usr/lib/systemd/system/grub-btrfsd.service` - Daemon that watches for new snapshots

### Enable the Daemon

The daemon watches for new snapshots and automatically regenerates GRUB entries:

```bash
sudo systemctl enable --now grub-btrfsd
sudo systemctl status grub-btrfsd
```

## Creating Snapshots That Appear in GRUB

`grub-btrfs` looks for **read-only** Btrfs subvolumes in specific locations. The default search path is `/.snapshots`. If you're using Snapper or Timeshift in Btrfs mode, snapshots are placed there automatically.

### Using Snapper for Snapshot Management

Snapper integrates well with `grub-btrfs`:

```bash
sudo apt install snapper

# Create a snapper configuration for the root filesystem
sudo snapper -c root create-config /
```

Snapper places snapshots under `/.snapshots/`. By default, each snapshot directory contains:

```text
/.snapshots/
    1/
        snapshot/   <- the actual Btrfs subvolume
        info.xml    <- metadata
    2/
        snapshot/
        info.xml
```

Create a snapshot:

```bash
sudo snapper -c root create --description "Before major config change" --type single
```

List snapshots:

```bash
sudo snapper -c root list
```

### Manual Read-Only Snapshots

If you prefer manual control without Snapper:

```bash
# Mount Btrfs top level
sudo mount -o subvolid=5 /dev/sda2 /mnt

# Create snapshots directory if it doesn't exist
sudo mkdir -p /mnt/.snapshots

# Take a read-only snapshot
sudo btrfs subvolume snapshot -r /mnt/@ /mnt/.snapshots/before-upgrade

# Unmount
sudo umount /mnt
```

## Generating GRUB Entries

After creating snapshots, regenerate GRUB:

```bash
sudo update-grub
```

You should see output like:

```text
Generating grub configuration file ...
Found Btrfs snapshot: 2026-03-02_10-00-00 - Before major config change
Found Btrfs snapshot: 2026-03-01_02-00-00 - Daily auto-snapshot
done
```

Verify the GRUB config includes the snapshot entries:

```bash
grep -A 5 "snapshot" /boot/grub/grub.cfg | head -30
```

## Configuring grub-btrfs

The main configuration file is `/etc/default/grub-btrfs/config`:

```bash
sudo nano /etc/default/grub-btrfs/config
```

Key settings to review:

```bash
# Where to look for snapshots (default: /.snapshots)
GRUB_BTRFS_SNAPSHOT_DIRNAME=".snapshots"

# Prefix shown in GRUB menu for snapshot entries
GRUB_BTRFS_SUBMENUNAME="Btrfs Snapshots"

# Show snapshots as a submenu (default) or in main menu
GRUB_BTRFS_SHOW_SNAPSHOTS_FOUND="true"

# Limit number of snapshots shown (0 = show all)
GRUB_BTRFS_LIMIT="10"

# Show newest snapshots first
GRUB_BTRFS_NEWEST_SNAPSHOT_FIRST="true"
```

After changing config, regenerate GRUB:

```bash
sudo update-grub
```

## Booting Into a Snapshot

At boot time, the GRUB menu will show a "Btrfs Snapshots" submenu. Select it to see available snapshots listed by date and description.

Selecting a snapshot boots into a read-only version of the system at that point in time. You can inspect files, check logs, and confirm the snapshot is the right restore point.

### Making a Rollback Permanent

Once you've confirmed a snapshot is the right state to restore, make it permanent:

```bash
# Boot normally (not into the snapshot)
# Then mount the Btrfs top-level
sudo mount -o subvolid=5 /dev/sda2 /mnt

# Rename current broken root
sudo mv /mnt/@ /mnt/@_broken_$(date +%Y%m%d)

# Create a writable snapshot from the chosen read-only snapshot
sudo btrfs subvolume snapshot /mnt/.snapshots/before-upgrade/snapshot /mnt/@

# Unmount and reboot
sudo umount /mnt
sudo reboot
```

## Automating Snapshot Creation Before Updates

Pair `grub-btrfs` with a pre-upgrade hook for automatic protection:

```bash
sudo nano /etc/apt/apt.conf.d/80snapper-pre-upgrade
```

```text
DPkg::Pre-Invoke {
    "if [ -x /usr/bin/snapper ]; then snapper -c root create --description 'Pre-apt' --type pre --print-number --userdata 'important=yes'; fi"
};

DPkg::Post-Invoke {
    "if [ -x /usr/bin/snapper ]; then snapper -c root create --description 'Post-apt' --type post --pre-number $(snapper -c root list | tail -1 | awk '{print $1}'); fi"
};
```

This creates matching pre/post snapshot pairs around every dpkg operation. Snapper's pre/post pairs are particularly useful because you can compare what changed:

```bash
# Compare pre and post snapshots
sudo snapper -c root diff 1..2
```

## Cleaning Up Old Snapshots

Too many snapshots in GRUB gets unwieldy. Configure Snapper to clean up automatically:

```bash
sudo nano /etc/snapper/configs/root
```

Set retention limits:

```text
NUMBER_CLEANUP="yes"
NUMBER_MIN_AGE="1800"
NUMBER_LIMIT="10"
NUMBER_LIMIT_IMPORTANT="5"

TIMELINE_CLEANUP="yes"
TIMELINE_MIN_AGE="1800"
TIMELINE_LIMIT_HOURLY="5"
TIMELINE_LIMIT_DAILY="7"
TIMELINE_LIMIT_WEEKLY="2"
TIMELINE_LIMIT_MONTHLY="2"
TIMELINE_LIMIT_YEARLY="1"
```

Enable Snapper's cleanup timers:

```bash
sudo systemctl enable --now snapper-cleanup.timer
sudo systemctl enable --now snapper-timeline.timer
```

After cleanup runs, regenerate GRUB:

```bash
sudo update-grub
```

## Troubleshooting

**Snapshots not appearing in GRUB:**
- Ensure snapshots are read-only (`btrfs subvolume list -r /`)
- Check that snapshots are in `/.snapshots/` or the configured path
- Run `sudo update-grub` manually and check for snapshot-related output

**Daemon not detecting new snapshots:**
```bash
sudo systemctl status grub-btrfsd
sudo journalctl -u grub-btrfsd -n 50
```

**Boot entry appears but fails to boot:**
- The kernel and initrd paths inside the snapshot must match what GRUB expects
- Check that `/boot` is not a separate partition (grub-btrfs works best with `/boot` on the Btrfs volume)

## Summary

Boot-time snapshot integration gives you a safety net that's available even before the operating system fully loads. By combining Btrfs snapshots, Snapper for automated creation, and `grub-btrfs` for GRUB integration, you get a robust recovery workflow. Snapshots appear in the boot menu automatically, you can boot into them non-destructively to verify, and commit the rollback only when you're confident.

This setup is particularly valuable on systems where you regularly make configuration changes or run dist-upgrades - situations where things can go wrong in ways that prevent normal booting.
