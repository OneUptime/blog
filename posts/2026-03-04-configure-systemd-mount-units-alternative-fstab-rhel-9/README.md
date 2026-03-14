# How to Configure Systemd Mount Units as an Alternative to fstab on RHEL

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: RHEL, Systemd, Mount Units, Fstab, Storage, Linux

Description: Learn how to use systemd mount and automount units on RHEL as a flexible alternative to traditional /etc/fstab entries.

---

While `/etc/fstab` has been the standard way to configure file system mounts for decades, systemd mount units offer a more powerful and flexible alternative on RHEL. Mount units integrate directly with systemd's dependency management, allowing you to define ordering, conditional mounting, and on-demand access with automount units.

## How Systemd Mount Units Work

Systemd already converts your fstab entries into mount units at boot. You can see this by listing mount units:

```bash
systemctl list-units --type=mount
```

When you create a mount unit file manually, you gain full control over dependencies, ordering, and behavior that fstab syntax cannot express.

## Creating a Basic Mount Unit

Mount unit file names must match the mount point path, with slashes replaced by dashes. For example, the mount point `/data/backups` becomes `data-backups.mount`.

Create the unit file:

```bash
sudo vi /etc/systemd/system/data-backups.mount
```

```ini
[Unit]
Description=Backup Data Partition
After=local-fs-pre.target
Before=local-fs.target

[Mount]
What=UUID=a1b2c3d4-e5f6-7890-abcd-ef1234567890
Where=/data/backups
Type=xfs
Options=defaults,nosuid,noexec,nodev

[Install]
WantedBy=local-fs.target
```

Create the mount point and enable the unit:

```bash
sudo mkdir -p /data/backups
sudo systemctl daemon-reload
sudo systemctl enable --now data-backups.mount
```

## Verifying the Mount

```bash
systemctl status data-backups.mount
findmnt /data/backups
```

## Creating an Automount Unit

Automount units mount file systems on demand when the mount point is first accessed. This speeds up boot times and avoids failures when devices are not immediately available.

Create the automount unit with the same name prefix:

```bash
sudo vi /etc/systemd/system/data-backups.automount
```

```ini
[Unit]
Description=Automount Backup Data Partition

[Automount]
Where=/data/backups
TimeoutIdleSec=300

[Install]
WantedBy=local-fs.target
```

The `TimeoutIdleSec=300` setting unmounts the file system after 5 minutes of inactivity.

Enable the automount unit instead of the mount unit:

```bash
sudo systemctl disable data-backups.mount
sudo systemctl enable --now data-backups.automount
```

## Adding Dependencies

One key advantage of mount units is explicit dependency management:

```ini
[Unit]
Description=Database Storage
After=network-online.target
Requires=network-online.target
After=iscsi.service
Requires=iscsi.service

[Mount]
What=UUID=...
Where=/var/lib/pgsql
Type=xfs
Options=defaults

[Install]
WantedBy=multi-user.target
```

This ensures the mount only happens after iSCSI storage is available.

## Mount Options Comparison: fstab vs Systemd

| Feature | fstab | Systemd Mount Unit |
|---------|-------|--------------------|
| Simple syntax | Yes | More verbose |
| Dependency management | Limited | Full systemd integration |
| On-demand mounting | No | Yes (automount) |
| Timeout handling | x-systemd options | Native TimeoutSec |
| Conditional mounting | No | ConditionPathExists, etc. |
| Status monitoring | mount command | systemctl status |
| Logging | dmesg | journalctl |

## Using Conditional Mounting

Mount only if a specific condition is met:

```ini
[Unit]
Description=External USB Storage
ConditionPathExists=/dev/disk/by-uuid/a1b2c3d4-e5f6-7890-abcd-ef1234567890

[Mount]
What=/dev/disk/by-uuid/a1b2c3d4-e5f6-7890-abcd-ef1234567890
Where=/mnt/usb
Type=ext4
Options=defaults,nosuid,noexec,nodev

[Install]
WantedBy=local-fs.target
```

## Setting Timeouts

Control how long systemd waits for a device to appear:

```ini
[Mount]
What=UUID=...
Where=/data
Type=xfs
Options=defaults
TimeoutSec=30
```

## Monitoring Mount Unit Status

```bash
# Check status of a specific mount
systemctl status data-backups.mount

# View mount-related logs
journalctl -u data-backups.mount

# List all failed mounts
systemctl list-units --type=mount --state=failed
```

## Converting fstab Entries to Mount Units

To see what systemd generates from your fstab:

```bash
systemctl list-units --type=mount
systemctl cat -- -.mount
```

To convert an fstab entry manually:

1. Identify the mount point and convert slashes to dashes
2. Create the `.mount` file in `/etc/systemd/system/`
3. Remove or comment out the fstab entry
4. Reload systemd and enable the unit

## Troubleshooting

If a mount unit fails to start:

```bash
systemctl status unit-name.mount
journalctl -u unit-name.mount -b
```

Common issues include:

- File name does not match the mount point path
- Missing mount point directory
- Incorrect UUID or device path
- Missing file system type

## Summary

Systemd mount units provide a powerful alternative to fstab on RHEL. They offer full dependency management, conditional mounting, on-demand access through automount units, and detailed status monitoring through systemctl and journalctl. While fstab remains simpler for basic configurations, mount units are the better choice when you need fine-grained control over mount behavior and ordering.
