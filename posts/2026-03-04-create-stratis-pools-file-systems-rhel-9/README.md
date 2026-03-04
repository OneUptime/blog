# How to Create Stratis Pools and File Systems on RHEL

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: RHEL, Stratis, Storage, Pools, Filesystems, Linux

Description: Learn how to create and manage Stratis pools and file systems on RHEL, including pool creation, filesystem provisioning, and practical management operations.

---

Stratis organizes storage into pools and filesystems. Pools aggregate physical block devices into a shared storage resource, and filesystems are thinly provisioned XFS volumes created within pools. This guide covers the practical details of creating and managing these resources on RHEL.

## Prerequisites

- A RHEL system with root or sudo access
- Stratis packages installed and the daemon running
- One or more unused block devices

```bash
sudo dnf install stratisd stratis-cli -y
sudo systemctl enable --now stratisd
```

## Creating Stratis Pools

### Single-Device Pool

Create a pool with one block device:

```bash
sudo stratis pool create datapool /dev/sdb
```

### Multi-Device Pool

Create a pool spanning multiple devices:

```bash
sudo stratis pool create bigpool /dev/sdb /dev/sdc /dev/sdd
```

Stratis stripes data across all devices in the pool for improved performance.

### List Pools

```bash
sudo stratis pool list
```

Output:

```
Name       Total / Used / Free         Properties   UUID   Alerts
datapool   50 GiB / 520 MiB / 49.49 GiB   ~Ca,~Cr   abc...
bigpool    150 GiB / 520 MiB / 149.49 GiB  ~Ca,~Cr   def...
```

Properties explained:
- `~Ca`: Caching not active
- `~Cr`: Encryption not active

### View Pool Details

```bash
sudo stratis pool describe datapool
```

### View Block Devices in a Pool

```bash
sudo stratis blockdev list datapool
```

## Creating Stratis Filesystems

### Create a Filesystem

```bash
sudo stratis filesystem create datapool documents
```

### Create Multiple Filesystems

```bash
sudo stratis filesystem create datapool projects
sudo stratis filesystem create datapool backups
sudo stratis filesystem create datapool logs
```

### List Filesystems

```bash
sudo stratis filesystem list
```

Output:

```
Pool       Filesystem   Total / Used / Free             Created              Device                        UUID
datapool   documents    1 TiB / 512 MiB / 1023.5 GiB   Mar 04 2026 10:00    /dev/stratis/datapool/documents   abc...
datapool   projects     1 TiB / 512 MiB / 1023.5 GiB   Mar 04 2026 10:01    /dev/stratis/datapool/projects    def...
```

Note that each filesystem reports a virtual size of 1 TiB. This is the thin provisioning feature - the filesystem only consumes actual pool space as data is written.

### List Filesystems in a Specific Pool

```bash
sudo stratis filesystem list datapool
```

## Mounting Stratis Filesystems

### Create Mount Points

```bash
sudo mkdir -p /documents /projects /backups /logs
```

### Mount

```bash
sudo mount /dev/stratis/datapool/documents /documents
sudo mount /dev/stratis/datapool/projects /projects
sudo mount /dev/stratis/datapool/backups /backups
sudo mount /dev/stratis/datapool/logs /logs
```

### Verify

```bash
df -Th /documents /projects /backups /logs
```

### Configure Persistent Mounts

For each filesystem, get the UUID and add to `/etc/fstab`:

```bash
sudo blkid /dev/stratis/datapool/documents
sudo blkid /dev/stratis/datapool/projects
sudo blkid /dev/stratis/datapool/backups
sudo blkid /dev/stratis/datapool/logs
```

Add entries to `/etc/fstab`:

```
UUID=uuid1 /documents xfs defaults,x-systemd.requires=stratisd.service 0 0
UUID=uuid2 /projects xfs defaults,x-systemd.requires=stratisd.service 0 0
UUID=uuid3 /backups xfs defaults,x-systemd.requires=stratisd.service 0 0
UUID=uuid4 /logs xfs defaults,x-systemd.requires=stratisd.service 0 0
```

## Renaming Filesystems

Rename a filesystem:

```bash
sudo stratis filesystem rename datapool documents docs
```

Update mount points and fstab entries accordingly. Note that the UUID does not change when renaming.

## Monitoring Pool Space

Check actual physical usage:

```bash
sudo stratis pool list
```

The "Used" column shows actual physical space consumed across all filesystems in the pool.

Check per-filesystem usage:

```bash
sudo stratis filesystem list datapool
```

### Understanding Thin Provisioning

Each Stratis filesystem reports a virtual size of 1 TiB, but the actual storage consumption depends on how much data is written. The pool's total physical capacity limits the actual storage available.

Example:
- Pool size: 50 GiB
- 4 filesystems created (each shows 1 TiB)
- Total data written across all filesystems: 30 GiB
- Pool used space: approximately 30 GiB

**Important**: Monitor pool usage to avoid running out of physical space. If the pool fills completely, all filesystems in the pool become read-only.

## Setting Filesystem Size Limits

While Stratis filesystems are thin-provisioned, you can set a size limit:

```bash
sudo stratis filesystem create --size-limit 10GiB datapool limited_fs
```

This limits the filesystem to 10 GiB of actual data.

## Best Practices

- **Monitor pool usage regularly**: Thin provisioning means filesystems can overcommit. Track actual usage.
- **Set up alerts**: Configure monitoring to warn when pools approach capacity.
- **Use meaningful names**: Choose descriptive names for pools and filesystems.
- **Plan pool membership**: Adding devices to pools is easy, but removing them is not currently supported.
- **Always use UUID in fstab**: Device paths can change; UUIDs are persistent.
- **Include x-systemd.requires**: This ensures Stratis is running before mounts are attempted at boot.

## Conclusion

Creating Stratis pools and filesystems on RHEL is a straightforward process that eliminates the need to separately manage volume groups, logical volumes, and filesystem formatting. The thin provisioning model provides flexibility, allowing you to create multiple filesystems that share a common pool of physical storage. Just remember to monitor pool usage carefully to prevent running out of physical space.
