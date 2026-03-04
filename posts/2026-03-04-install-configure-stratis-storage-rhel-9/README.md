# How to Install and Configure Stratis Storage on RHEL

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: RHEL, Stratis, Storage, Linux

Description: Learn how to install and configure Stratis storage management on RHEL, a modern volume-managing filesystem that simplifies storage administration with features like thin provisioning and snapshots.

---

Stratis is a modern storage management solution included in RHEL that combines the functionality of a volume manager and a filesystem into a single, easy-to-use tool. Built on top of proven technologies like device-mapper, XFS, and thin provisioning, Stratis simplifies storage management while providing advanced features. This guide covers installation and initial configuration.

## Prerequisites

- A RHEL system with root or sudo access
- One or more unused block devices
- Active RHEL subscription for package installation

## What is Stratis?

Stratis provides:

- **Simplified management**: A single tool replaces the need to separately manage partitions, LVM, and filesystems.
- **Thin provisioning**: Filesystems report a large virtual size but only consume physical space as data is written.
- **Snapshots**: Create instant point-in-time copies of filesystems.
- **Encryption**: Optional LUKS-based encryption at the pool level.
- **Caching**: Optional SSD caching tier for improved performance.

Stratis manages storage in two layers:
- **Pools**: Collections of one or more block devices that provide raw storage capacity.
- **Filesystems**: Thinly provisioned XFS filesystems created within a pool.

## Step 1: Install Stratis

Install the Stratis packages:

```bash
sudo dnf install stratisd stratis-cli -y
```

- `stratisd`: The Stratis daemon that manages storage
- `stratis-cli`: The command-line interface for interacting with stratisd

## Step 2: Start and Enable the Stratis Daemon

```bash
sudo systemctl enable --now stratisd
```

Verify the service is running:

```bash
sudo systemctl status stratisd
```

Check the Stratis version:

```bash
stratis --version
```

## Step 3: Identify Available Disks

List block devices:

```bash
lsblk
```

Ensure the disks you want to use are not partitioned, not mounted, and not part of any existing LVM or RAID configuration:

```bash
sudo blkid /dev/sdb
```

If the disk has existing signatures, wipe them:

```bash
sudo wipefs -a /dev/sdb
```

## Step 4: Create a Stratis Pool

Create a pool using one or more block devices:

```bash
sudo stratis pool create mypool /dev/sdb
```

To create a pool with multiple devices:

```bash
sudo stratis pool create mypool /dev/sdb /dev/sdc
```

Verify the pool:

```bash
sudo stratis pool list
```

View pool details:

```bash
sudo stratis pool describe mypool
```

Check physical disk membership:

```bash
sudo stratis blockdev list
```

## Step 5: Create a Filesystem

Create a filesystem within the pool:

```bash
sudo stratis filesystem create mypool myfs
```

List filesystems:

```bash
sudo stratis filesystem list
```

The filesystem is automatically formatted as XFS with thin provisioning. It reports a virtual size of 1 TiB but only consumes space as data is written.

## Step 6: Mount the Filesystem

Stratis filesystems appear as device-mapper devices:

```bash
sudo mkdir -p /data
sudo mount /dev/stratis/mypool/myfs /data
```

Verify:

```bash
df -Th /data
```

## Step 7: Configure Persistent Mounting

Stratis filesystems should be mounted using their UUID in `/etc/fstab` with the `x-systemd.requires=stratisd.service` option:

Get the UUID:

```bash
sudo blkid /dev/stratis/mypool/myfs
```

Add to `/etc/fstab`:

```bash
UUID=your-uuid-here /data xfs defaults,x-systemd.requires=stratisd.service 0 0
```

The `x-systemd.requires` option ensures the Stratis daemon is running before the mount is attempted.

Test:

```bash
sudo umount /data
sudo mount -a
df -Th /data
```

## Step 8: Verify the Configuration

Check the overall Stratis status:

```bash
sudo stratis pool list
sudo stratis filesystem list
sudo stratis blockdev list
```

Monitor pool usage:

```bash
sudo stratis pool list
```

The output shows total physical size and allocated space.

## Understanding Stratis Architecture

```bash
+----------------------------------+
|         Filesystem (XFS)          |
+----------------------------------+
|       Thin Provisioning           |
+----------------------------------+
|     Optional Cache Tier           |
+----------------------------------+
|     Optional Encryption           |
+----------------------------------+
|       Data Tier (Block Devices)   |
+----------------------------------+
```

All layers are managed transparently by Stratis.

## Key Differences from LVM

| Aspect | LVM | Stratis |
|--------|-----|---------|
| Filesystem management | Separate (mkfs) | Integrated (always XFS) |
| Provisioning | Thick by default | Always thin |
| Snapshots | Manual snapshot creation | Built-in snapshot feature |
| Learning curve | Steep | Gentle |
| Flexibility | Very high | Moderate |
| Maturity | Decades | Recent |

## Conclusion

Stratis provides a modern, simplified approach to storage management on RHEL. By combining volume management and filesystem creation into a single tool, it reduces the complexity of traditional LVM + filesystem workflows. While it may not offer the fine-grained control of LVM for complex configurations, its simplicity, thin provisioning, and built-in snapshot support make it an excellent choice for many use cases.
