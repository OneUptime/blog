# How to Troubleshoot Boot Failures Caused by Incorrect fstab Entries on RHEL

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: RHEL, fstab, Troubleshooting, Boot, Recovery, Linux

Description: Learn how to diagnose and fix RHEL boot failures caused by misconfigured /etc/fstab entries, including recovery techniques and prevention strategies.

---

A single incorrect line in `/etc/fstab` can prevent your RHEL system from booting. Whether it is a wrong UUID, a missing partition, or an invalid file system type, the result is often the same: the system drops into emergency mode or hangs during boot. Knowing how to recover from these situations is an essential skill for any system administrator.

## Common fstab Errors That Prevent Booting

The most frequent mistakes include:

- Incorrect or mistyped UUID
- Referencing a device that no longer exists
- Wrong file system type specified
- Invalid mount options
- Missing mount point directory
- Syntax errors such as missing fields

## Recognizing fstab-Related Boot Failures

When RHEL encounters a bad fstab entry during boot, you will typically see one of these scenarios:

1. **Emergency mode prompt** - The system drops to a root shell with a message about failed mounts
2. **Dependency failure** - systemd reports that a mount unit failed and dependent services cannot start
3. **Boot hang** - The system appears to hang while waiting for a device that will never appear

## Recovery Using Emergency Mode

If the system drops into emergency mode, you already have a root shell:

```bash
# You may need to enter the root password
# First, check the current fstab
cat /etc/fstab

# Check which mounts failed
systemctl --failed
journalctl -b | grep -i mount
```

The root file system may be mounted read-only. Remount it read-write:

```bash
mount -o remount,rw /
```

Now edit fstab and fix the problematic entry:

```bash
vi /etc/fstab
```

After fixing, test:

```bash
mount -a
```

If no errors appear, reboot:

```bash
systemctl reboot
```

## Recovery Using a RHEL Installation Media

If you cannot access emergency mode, boot from RHEL installation media:

1. Insert the RHEL installation ISO or USB
2. Boot from the media
3. Select "Troubleshooting" from the boot menu
4. Select "Rescue a Red Hat Enterprise Linux system"

The rescue environment will attempt to find your installation and mount it under `/mnt/sysimage`:

```bash
# Change root into your installation
chroot /mnt/sysimage

# Edit fstab
vi /etc/fstab

# Exit chroot and reboot
exit
reboot
```

## Recovery Using GRUB and Single User Mode

You can also access a recovery shell through GRUB:

1. Reboot the system
2. When the GRUB menu appears, press `e` to edit the boot entry
3. Find the line starting with `linux` and add `systemd.unit=emergency.target` at the end
4. Press `Ctrl+X` to boot with the modified parameters

This boots directly into emergency mode where you can fix fstab.

## Identifying the Problematic Entry

Once you have a shell, use these commands to identify the issue:

```bash
# Check for devices that fstab references
blkid

# Compare UUIDs in fstab with actual UUIDs
cat /etc/fstab
blkid

# Try mounting each entry manually
mount UUID=your-uuid-here /mount/point
```

## Using findmnt to Validate fstab

Before rebooting after fixes, validate the entire fstab:

```bash
findmnt --verify --verbose
```

This reports any issues it finds, such as:

- Unknown file system types
- Duplicate mount points
- Missing source devices

## Preventing fstab Boot Failures

### Use nofail for Non-Critical Mounts

Add `nofail` to any mount that is not essential for booting:

```text
UUID=...  /data  xfs  defaults,nofail  0 0
```

### Set Device Timeouts

Prevent indefinite hangs by setting timeouts:

```text
UUID=...  /data  xfs  defaults,nofail,x-systemd.device-timeout=10  0 0
```

### Always Test Before Rebooting

After any fstab change:

```bash
sudo mount -a
sudo findmnt --verify
```

### Keep a Backup

```bash
sudo cp /etc/fstab /etc/fstab.bak
```

### Use Comments

Document each entry so future administrators understand the purpose:

```text
# Data partition on second SSD
UUID=...  /data  xfs  defaults,nosuid,noexec  0 0
```

## Recovering Specific Issues

### Wrong UUID

Compare fstab UUIDs with actual UUIDs:

```bash
grep UUID /etc/fstab
blkid | grep UUID
```

### Missing Partition

If a partition was removed or the disk failed:

```bash
# Comment out the entry temporarily
# UUID=...  /data  xfs  defaults  0 0
```

### Wrong File System Type

If you see "wrong fs type" errors:

```bash
blkid /dev/sdb1
```

Check the TYPE field and update fstab to match.

## Summary

Boot failures from fstab errors are common but recoverable. Always have access to emergency mode through GRUB or installation media. Use `nofail` and device timeouts for non-critical mounts to prevent hangs. Test every fstab change with `mount -a` and `findmnt --verify` before rebooting. Keep backups of your fstab and document each entry to reduce the risk of errors.
