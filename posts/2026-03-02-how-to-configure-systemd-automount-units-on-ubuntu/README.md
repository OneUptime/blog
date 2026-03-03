# How to Configure systemd Automount Units on Ubuntu

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Ubuntu, systemd, Storage, Mounting, Linux

Description: Configure systemd automount units on Ubuntu to mount filesystems on demand and unmount them automatically after a period of inactivity, replacing autofs.

---

systemd automount units provide on-demand filesystem mounting. Instead of mounting everything at boot, automount units make a filesystem available only when something accesses the mount point. After a configurable idle period with no activity, systemd unmounts the filesystem. This is particularly useful for NFS shares, CIFS mounts, or removable storage where the connection might be unreliable or where you don't want to block boot on a slow network mount.

Every automount unit is paired with a `.mount` unit that does the actual mounting. The automount unit watches the mount point and triggers the mount unit when access occurs.

## How Automount Works

The sequence of events:

1. systemd creates the mount point directory
2. A kernel automount trigger is set on the directory
3. A process tries to access the mount point
4. The kernel notifies systemd (or the automount daemon)
5. systemd activates the paired `.mount` unit
6. The filesystem mounts and the access proceeds
7. After the idle timeout, systemd unmounts the filesystem

The mount point exists as a directory throughout, but the filesystem is only attached when needed.

## Naming Convention

systemd derives unit names from paths by replacing `/` with `-` and special characters with their systemd escape equivalents. The path `/mnt/nfs-backup` becomes the unit name `mnt-nfs\x2dbackup` - but you can also use the `systemd-escape` tool:

```bash
# Convert a path to a systemd unit name
systemd-escape --path /mnt/nfs-backup
# Output: mnt-nfs\x2dbackup

# For NFS share /mnt/nas/media
systemd-escape --path /mnt/nas/media
# Output: mnt-nas-media
```

The mount unit and automount unit share the same base name with different suffixes (`.mount` and `.automount`).

## Example 1: NFS Automount

Mount an NFS share on demand:

### Create the Mount Unit

```bash
sudo nano /etc/systemd/system/mnt-nas.mount
```

```ini
[Unit]
Description=NAS NFS Mount
After=network-online.target
Wants=network-online.target

[Mount]
# NFS server and export path
What=192.168.1.100:/export/data
# Local mount point
Where=/mnt/nas
# Filesystem type
Type=nfs
# NFS mount options
Options=rw,relatime,vers=4.1,rsize=1048576,wsize=1048576,namlen=255,hard,proto=tcp
TimeoutSec=30
```

### Create the Automount Unit

```bash
sudo nano /etc/systemd/system/mnt-nas.automount
```

```ini
[Unit]
Description=Automount for NAS NFS share
After=network-online.target

[Automount]
# Must match Where= in the .mount unit
Where=/mnt/nas

# Unmount after 5 minutes of inactivity (300 seconds)
TimeoutIdleSec=300

[Install]
WantedBy=multi-user.target
```

### Create the Mount Point and Enable

```bash
# Create the mount point
sudo mkdir -p /mnt/nas

# Enable and start only the automount unit
# The .mount unit will be activated on demand
sudo systemctl daemon-reload
sudo systemctl enable mnt-nas.automount
sudo systemctl start mnt-nas.automount

# Check status
sudo systemctl status mnt-nas.automount
```

### Test the Automount

```bash
# Initially the filesystem is not mounted
mount | grep /mnt/nas
# Shows nothing

# Access the mount point - this triggers the mount
ls /mnt/nas
# NFS mount is now active

# After TimeoutIdleSec of inactivity, it unmounts automatically
# Watch the mount/unmount events
sudo journalctl -u mnt-nas.mount -f
```

## Example 2: CIFS (Windows Share) Automount

```bash
# Store credentials securely
sudo mkdir -p /etc/samba
sudo nano /etc/samba/nas-credentials
```

```text
username=shareuser
password=secretpassword
domain=WORKGROUP
```

```bash
sudo chmod 600 /etc/samba/nas-credentials
```

Create the mount unit:

```bash
sudo nano /etc/systemd/system/mnt-windows-share.mount
```

```ini
[Unit]
Description=Windows File Share
After=network-online.target
Wants=network-online.target

[Mount]
What=//192.168.1.200/SharedDocs
Where=/mnt/windows-share
Type=cifs
Options=credentials=/etc/samba/nas-credentials,uid=1000,gid=1000,iocharset=utf8,vers=3.0
TimeoutSec=60
```

Create the automount unit:

```bash
sudo nano /etc/systemd/system/mnt-windows-share.automount
```

```ini
[Unit]
Description=Automount for Windows file share
After=network-online.target

[Automount]
Where=/mnt/windows-share
TimeoutIdleSec=120

[Install]
WantedBy=multi-user.target
```

```bash
sudo mkdir -p /mnt/windows-share
sudo apt install cifs-utils -y
sudo systemctl daemon-reload
sudo systemctl enable mnt-windows-share.automount
sudo systemctl start mnt-windows-share.automount
```

## Example 3: USB Drive Automount

For portable storage, combine automount with udev rules:

```bash
sudo nano /etc/systemd/system/mnt-usb.mount
```

```ini
[Unit]
Description=USB Storage Mount
ConditionPathExists=/dev/disk/by-label/MYUSB

[Mount]
What=/dev/disk/by-label/MYUSB
Where=/mnt/usb
Type=auto
Options=defaults,noatime,nofail
```

```bash
sudo nano /etc/systemd/system/mnt-usb.automount
```

```ini
[Unit]
Description=USB Storage Automount

[Automount]
Where=/mnt/usb
TimeoutIdleSec=600

[Install]
WantedBy=multi-user.target
```

## Monitoring Automount Activity

```bash
# List all automount units and their status
systemctl list-units --type=automount

# Show detailed status including last activation time
sudo systemctl status mnt-nas.automount

# See all mount/unmount events in the journal
sudo journalctl -u mnt-nas.automount -u mnt-nas.mount --since "1 hour ago"

# Check if a filesystem is currently mounted
mountpoint -q /mnt/nas && echo "Mounted" || echo "Not mounted"

# Show all currently mounted filesystems
mount | grep -E "nfs|cifs"
```

## Configuring Idle Timeout

The `TimeoutIdleSec=` value controls how long after the last access before unmounting. Set it based on how frequently the share is used and how long a mount takes:

```ini
[Automount]
Where=/mnt/nas

# Common timeout values:
# 0          = never unmount automatically
# 60         = 1 minute
# 300        = 5 minutes (good for infrequent use)
# 3600       = 1 hour
# 86400      = 24 hours

TimeoutIdleSec=300
```

A timeout of `0` effectively turns the automount into a regular persistent mount that only mounts on first access.

## Handling Network-Dependent Mounts

For network mounts, ensure the automount only activates after the network is online:

```ini
[Unit]
Description=NFS Share Automount
After=network-online.target
Requires=network-online.target

[Automount]
Where=/mnt/nas
TimeoutIdleSec=300

[Install]
WantedBy=multi-user.target
```

If the network is unavailable when a mount is triggered, the mount unit will fail. Configure the paired mount unit with `TimeoutSec=` to avoid hanging:

```ini
[Mount]
What=192.168.1.100:/export/data
Where=/mnt/nas
Type=nfs
Options=soft,timeo=10,retrans=3
TimeoutSec=30
```

The `soft` NFS mount option allows the mount to fail quickly rather than retrying forever.

## Generating Units with systemd-escape

For paths with special characters:

```bash
# Path with spaces
systemd-escape --path "/mnt/my nas"
# Output: mnt-my\x20nas

# The unit file would be named: mnt-my\x20nas.mount

# Path with dots
systemd-escape --path "/mnt/192.168.1.100:/share"
# Dots are fine in systemd names, no escaping needed for simple cases
```

## Troubleshooting

**Mount takes too long and processes time out:** Increase `TimeoutSec=` in the mount unit. For NFS, also check network latency and NFS server response time.

**Automount doesn't trigger on directory access:** Verify the automount unit is in the `active` state: `systemctl status mnt-nas.automount`. If it shows failed, check journal logs for the reason.

**Filesystem mounts but unmounts too quickly:** Increase `TimeoutIdleSec=` in the automount unit. Some applications keep the mount busy - check with `fuser -m /mnt/nas` to see processes using the mount.

**Mount fails on boot, works after reboot:** Network may not be ready when the automount triggers. Add `After=network-online.target` to both units and ensure `systemd-networkd-wait-online.service` or equivalent is running.

**Unit name mismatch:** The `.mount` and `.automount` unit names must match exactly, and the `Where=` in both must be identical. Use `systemd-escape --path /your/path` to verify the expected unit name.

systemd automount units are a reliable replacement for autofs that integrates naturally with the rest of the systemd ecosystem. They work particularly well for NFS and CIFS shares that should be available but not kept mounted when idle.
