# How to Recover Ubuntu from Emergency Mode

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Ubuntu, System Recovery, Boot, Troubleshooting

Description: A practical guide to diagnosing and recovering an Ubuntu system that boots into emergency mode, covering common causes and step-by-step fixes.

---

When Ubuntu drops you into emergency mode on boot, the screen shows something like "Welcome to emergency mode! After logging in, type 'journalctl -xb' to view system logs." It's alarming if you're not familiar with it, but it's usually fixable without reinstalling.

Emergency mode is a minimal recovery environment that systemd activates when it cannot reach multi-user or graphical targets. This guide walks through diagnosing the root cause and getting back to a working system.

## What Causes Emergency Mode

The most common culprits are:

- A bad or missing entry in `/etc/fstab` referencing a drive that's gone or changed UUID
- A corrupted filesystem on one of the mounted partitions
- A failed systemd unit that's marked as required
- Disk hardware failure

Understanding which category your situation falls into determines the fix.

## Step 1: Log In and Read the Logs

When the emergency mode prompt appears, log in as root using your root password. If you haven't set a root password, you may need to use `sudo -i` after logging in with your regular account, though in some minimal emergency shells only root works.

Once logged in:

```bash
# View recent boot logs with context
journalctl -xb

# Look specifically at failed units
systemctl --failed

# Check the last few hundred lines for errors
journalctl -b -p err
```

The `journalctl -xb` output will usually point directly at the problem. Look for red lines, particularly around mount failures or dependency errors.

## Step 2: Check /etc/fstab for Bad Entries

The most frequent cause of emergency mode is a bad `/etc/fstab` entry. This happens after:

- Moving to a new disk where UUIDs changed
- Removing an external drive that was mounted at boot
- Manually editing fstab and making a typo

```bash
# View the current fstab
cat /etc/fstab

# List block devices with their UUIDs to compare
blkid

# Check what's actually mounted right now
mount | grep -v tmpfs
```

Compare the UUIDs in `/etc/fstab` against what `blkid` reports. If you see a UUID in fstab that doesn't appear in `blkid`, that's your problem.

To fix it, open fstab in an editor:

```bash
# nano works in emergency mode
nano /etc/fstab
```

Comment out the offending line by adding `#` at the start, or correct the UUID. For entries that aren't critical (like a data drive), adding the `nofail` option prevents this from triggering emergency mode in future:

```bash
# Example: adding nofail so a missing drive doesn't halt boot
UUID=abc123  /mnt/data  ext4  defaults,nofail  0  2
```

## Step 3: Check Filesystem Integrity

If fstab looks correct, the issue might be filesystem corruption. Emergency mode often gets triggered when the kernel or systemd detects a dirty filesystem.

```bash
# Check which filesystems need repair
dmesg | grep -i "error\|corrupt\|EXT4"

# Run fsck on an unmounted partition (never run on mounted filesystems)
# First unmount if possible
umount /dev/sda2

# Run the check (replace sda2 with your actual partition)
fsck -y /dev/sda2
```

The `-y` flag automatically answers yes to repair questions. After fsck completes, reboot:

```bash
reboot
```

If the root filesystem itself needs checking, you'll need to boot from a live USB since you can't unmount root while it's in use.

## Step 4: Identify Failed Systemd Units

Sometimes a required service fails to start and pulls the system into emergency mode. Check for this:

```bash
# List failed units
systemctl --failed

# Get details on a specific failed unit
systemctl status some-service.service

# View the unit's journal entries
journalctl -u some-service.service -b
```

Common fixes:

```bash
# Mask a unit that's not needed but keeps failing
systemctl mask problem-unit.service

# Disable a unit from starting at boot
systemctl disable problem-unit.service
```

After masking or disabling, test with:

```bash
systemctl start multi-user.target
```

## Step 5: Remount Root as Read-Write

In emergency mode, the root filesystem is often mounted read-only. Before editing any files, remount it with write access:

```bash
# Remount root as read-write
mount -o remount,rw /

# Verify it's now writable
touch /testfile && rm /testfile && echo "Writable"
```

## Step 6: Check for Disk Hardware Issues

If filesystem checks pass and fstab is clean, investigate hardware:

```bash
# Check SMART status (install smartmontools first if needed)
smartctl -a /dev/sda

# Look for I/O errors in kernel ring buffer
dmesg | grep -i "ata\|scsi\|error\|failed"

# Check disk health summary
smartctl -H /dev/sda
```

If SMART reports failures, the disk is dying. Back up data immediately and plan a replacement.

## Exiting Emergency Mode After Fixes

Once you've made your corrections, you can exit emergency mode without rebooting:

```bash
# Try to start the default target
systemctl default

# Or explicitly start multi-user (no GUI)
systemctl start multi-user.target

# Or start graphical target if you want the desktop
systemctl start graphical.target
```

If that works, great. If it still fails, check the logs again - there may be a second issue lurking.

## Preventing Future Emergency Mode Boots

A few practices keep systems out of emergency mode:

```bash
# Always validate fstab before rebooting after edits
mount -a

# Test that all fstab entries mount correctly
findmnt --verify

# Keep a backup of working fstab
cp /etc/fstab /etc/fstab.bak.$(date +%Y%m%d)
```

When adding drives, prefer using `nofail` for non-critical mounts so a missing drive doesn't bring down the whole boot process. For truly critical filesystems, make sure the UUID is correct and the filesystem is healthy before adding it to fstab.

Emergency mode is systemd's safety net - it's telling you something went wrong before it was willing to proceed. With the diagnostics above, you can usually identify and fix the problem within a few minutes.
