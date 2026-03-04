# How to Troubleshoot Stratis Pool and Filesystem Issues on RHEL

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: RHEL, Stratis, Troubleshooting, Storage, Linux

Description: Learn how to diagnose and resolve common Stratis pool and filesystem issues on RHEL, including daemon failures, mount problems, pool exhaustion, and device errors.

---

While Stratis simplifies storage management, issues can still arise from daemon failures, device problems, or configuration errors. This guide covers common Stratis problems on RHEL and how to resolve them.

## Prerequisites

- A RHEL system with root or sudo access
- Stratis packages installed
- Basic familiarity with Stratis concepts

## Issue 1: Stratis Daemon Not Running

### Symptoms

```bash
ERROR: stratisd is not running
```

### Diagnosis

```bash
sudo systemctl status stratisd
sudo journalctl -u stratisd --since "1 hour ago"
```

### Solution

Start and enable the daemon:

```bash
sudo systemctl enable --now stratisd
```

If it fails to start, check for package issues:

```bash
sudo dnf reinstall stratisd stratis-cli
sudo systemctl start stratisd
```

Check for D-Bus issues:

```bash
sudo systemctl status dbus
```

## Issue 2: Filesystems Not Mounting at Boot

### Symptoms

Stratis filesystems are not available after reboot.

### Diagnosis

Check fstab entries:

```bash
grep stratis /etc/fstab
```

Check if the daemon started before mount:

```bash
sudo systemctl status stratisd
```

### Solution

Ensure fstab entries include the systemd dependency:

```bash
UUID=your-uuid /data xfs defaults,x-systemd.requires=stratisd.service 0 0
```

Use UUID rather than device path:

```bash
sudo blkid /dev/stratis/poolname/fsname
```

Regenerate systemd mount units:

```bash
sudo systemctl daemon-reload
```

## Issue 3: Pool Running Out of Space

### Symptoms

- Filesystems become read-only
- Write operations fail with "No space left on device"
- Applications report disk full errors despite `df` showing available space

### Diagnosis

```bash
sudo stratis pool list
sudo stratis filesystem list
```

Compare pool physical usage with filesystem virtual size. The pool may be full even though individual filesystems show available space.

### Solution

Add more storage:

```bash
sudo stratis pool add-data poolname /dev/new_device
```

Remove unnecessary snapshots:

```bash
sudo stratis filesystem destroy poolname old_snapshot
```

Delete unused filesystems:

```bash
sudo umount /unused
sudo stratis filesystem destroy poolname unused_fs
```

After freeing or adding space, filesystems should become writable again.

## Issue 4: Cannot Create a Pool

### Symptoms

```bash
ERROR: Failed to create pool
```

### Diagnosis

Check if the device is already in use:

```bash
sudo lsblk /dev/sdb
sudo blkid /dev/sdb
sudo pvs /dev/sdb
```

### Solution

Remove existing signatures:

```bash
sudo wipefs -a /dev/sdb
```

If the device is part of LVM:

```bash
sudo vgreduce vg_name /dev/sdb
sudo pvremove /dev/sdb
```

If it has partitions:

```bash
sudo sgdisk --zap-all /dev/sdb
sudo wipefs -a /dev/sdb
```

## Issue 5: Cannot Destroy a Pool

### Symptoms

```bash
ERROR: Pool has filesystems
```

### Diagnosis

List filesystems in the pool:

```bash
sudo stratis filesystem list poolname
```

Check for mounted filesystems:

```bash
mount | grep stratis
```

### Solution

Unmount and destroy all filesystems first:

```bash
# Unmount all
sudo umount /mountpoint1
sudo umount /mountpoint2

# Destroy all filesystems (including snapshots)
sudo stratis filesystem destroy poolname fs1
sudo stratis filesystem destroy poolname fs2
sudo stratis filesystem destroy poolname snap1

# Now destroy the pool
sudo stratis pool destroy poolname
```

## Issue 6: Encrypted Pool Not Available After Reboot

### Symptoms

Encrypted pool is not visible after reboot.

### Diagnosis

```bash
sudo stratis pool list
sudo stratis key list
```

### Solution

Set the encryption key:

```bash
sudo stratis key set --capture-key keyname
```

Unlock the pool:

```bash
sudo stratis pool unlock keyring
```

For automatic unlocking, configure Tang or TPM2 binding:

```bash
sudo stratis pool bind nbde poolname keyname --trust-url http://tang-server
```

## Issue 7: Device Mapper Conflicts

### Symptoms

Stratis operations fail with device mapper errors.

### Diagnosis

```bash
sudo dmsetup ls | grep stratis
sudo dmsetup status
```

### Solution

Clear stale device mapper entries:

```bash
sudo systemctl stop stratisd
sudo dmsetup remove_all --force
sudo systemctl start stratisd
```

## Issue 8: Stratis Commands Hanging

### Symptoms

Stratis CLI commands do not return.

### Diagnosis

Check if stratisd is responsive:

```bash
sudo systemctl status stratisd
sudo journalctl -u stratisd -f
```

Check for D-Bus issues:

```bash
sudo busctl list | grep stratis
```

### Solution

Restart the daemon:

```bash
sudo systemctl restart stratisd
```

If it remains unresponsive:

```bash
sudo systemctl stop stratisd
sudo killall stratisd
sudo systemctl start stratisd
```

## Issue 9: Block Device Not Recognized

### Symptoms

A device you want to add is not accepted by Stratis.

### Diagnosis

```bash
sudo lsblk /dev/sdd
sudo blkid /dev/sdd
sudo stratis blockdev list
```

### Solution

Ensure the device is:
- Not mounted
- Not part of LVM
- Not part of another Stratis pool
- Free of existing signatures

```bash
sudo wipefs -a /dev/sdd
sudo stratis pool add-data poolname /dev/sdd
```

## Issue 10: Data Loss After Device Failure

### Symptoms

Pool becomes degraded or unavailable after a disk failure.

### Diagnosis

```bash
sudo stratis pool list
sudo stratis blockdev list
sudo dmesg | grep -i "error\|fail"
```

### Important Note

Stratis does not provide redundancy. If a data device in a pool fails, the pool and all its data may be lost. This is by design - Stratis relies on the underlying storage to provide redundancy if needed.

### Prevention

- Use hardware RAID or mdraid underneath Stratis for redundancy
- Maintain regular backups
- Monitor disk health:

```bash
sudo dnf install smartmontools -y
sudo smartctl -a /dev/sdb
```

## Collecting Diagnostic Information

When troubleshooting complex issues, collect this information:

```bash
# System information
cat /etc/redhat-release
uname -r

# Stratis version
stratis --version
rpm -q stratisd stratis-cli

# Service status
systemctl status stratisd

# Stratis state
stratis pool list
stratis filesystem list
stratis blockdev list

# Device mapper state
dmsetup ls
dmsetup status

# System journal
journalctl -u stratisd --since "1 day ago"

# Block device information
lsblk
blkid
```

## Conclusion

Most Stratis issues on RHEL stem from daemon state, device conflicts, or pool capacity management. By understanding the common failure modes and their solutions, you can quickly diagnose and resolve problems. Remember that Stratis does not provide data redundancy, so always plan for redundancy at the hardware or software RAID level and maintain regular backups for critical data.
