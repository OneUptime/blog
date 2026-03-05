# How to Configure Samba VFS Shadow Copy on Ubuntu

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Ubuntu, Samba, Storage, Backup, VFs

Description: Set up Samba VFS shadow_copy2 on Ubuntu to expose filesystem snapshots as Windows Previous Versions, letting users restore their own files without admin help.

---

Windows has a feature called "Previous Versions" that lets users right-click a file or folder on a network share and restore an older version. This works through the Shadow Copy protocol - VSS on Windows, but on Linux, Samba implements the same functionality through its `shadow_copy2` VFS module. The key is that you need a system that creates filesystem snapshots, and then configure Samba to present those snapshots through the SMB protocol.

This guide uses LVM snapshots as the snapshot mechanism, but the same approach works with Btrfs snapshots, ZFS snapshots, or any technology that places snapshots in a predictable directory structure.

## How VFS Shadow Copy Works

The `shadow_copy2` module looks for snapshot directories in a format that Samba understands. It maps Windows shadow copy timestamps to these directories and exposes them through the VSS protocol. When a Windows client requests previous versions, Samba reports the available snapshots, and the client can browse or restore files from them.

The snapshot directories must follow a naming convention that Samba can parse. The default format is:

```text
@GMT-YYYY.MM.DD-HH.MM.SS
```

Samba creates these virtual names by mapping timestamps from the actual snapshot directory names.

## Setting Up LVM Snapshots

This example assumes you have an LVM volume group called `vg0` with a logical volume `data` mounted at `/srv/samba/data`.

Check your current LVM setup:

```bash
# Show volume groups
sudo vgs

# Show logical volumes
sudo lvs

# Show mount points
df -h | grep /srv/samba
```

Create a snapshot script that Samba's share will use:

```bash
sudo nano /usr/local/bin/create-snapshot.sh
```

```bash
#!/bin/bash
# Create an LVM snapshot with timestamp-based naming

VOLUME_GROUP="vg0"
SOURCE_LV="data"
MOUNT_BASE="/srv/samba/.snapshots"
TIMESTAMP=$(date -u +"%Y.%m.%d-%H.%M.%S")
SNAP_NAME="snap-${TIMESTAMP}"
SNAP_LV="${VOLUME_GROUP}/${SNAP_NAME}"
SNAP_MOUNT="${MOUNT_BASE}/@GMT-${TIMESTAMP}"

# Create the snapshot (1GB COW space - adjust to workload)
lvcreate -L1G -s -n "${SNAP_NAME}" "${VOLUME_GROUP}/${SOURCE_LV}"

# Create mount point using GMT timestamp format Samba expects
mkdir -p "${SNAP_MOUNT}"

# Mount the snapshot read-only
mount -o ro "/dev/${SNAP_LV}" "${SNAP_MOUNT}"

echo "Snapshot created: ${SNAP_MOUNT}"
```

```bash
sudo chmod +x /usr/local/bin/create-snapshot.sh
```

Create a corresponding cleanup script for old snapshots:

```bash
sudo nano /usr/local/bin/prune-snapshots.sh
```

```bash
#!/bin/bash
# Remove snapshots older than 7 days

MOUNT_BASE="/srv/samba/.snapshots"
VOLUME_GROUP="vg0"
MAX_AGE_DAYS=7

# Find and remove old snapshot mounts
find "${MOUNT_BASE}" -maxdepth 1 -name "@GMT-*" -type d -mtime +${MAX_AGE_DAYS} | while read snapdir; do
    # Unmount the snapshot
    umount "${snapdir}" 2>/dev/null

    # Get the LV name from the mount
    SNAP_NAME=$(basename "${snapdir}" | sed 's/@GMT-/snap-/')

    # Remove the LV snapshot
    lvremove -f "${VOLUME_GROUP}/${SNAP_NAME}" 2>/dev/null

    # Remove the mount directory
    rmdir "${snapdir}"

    echo "Removed snapshot: ${snapdir}"
done
```

```bash
sudo chmod +x /usr/local/bin/prune-snapshots.sh
```

Schedule snapshots with cron:

```bash
sudo crontab -e
```

```cron
# Take snapshots every 4 hours
0 */4 * * * /usr/local/bin/create-snapshot.sh >> /var/log/samba-snapshots.log 2>&1

# Prune old snapshots daily at 2am
0 2 * * * /usr/local/bin/prune-snapshots.sh >> /var/log/samba-snapshots.log 2>&1
```

## Creating the Snapshot Directory Structure

The snapshot mount point must be inside or alongside the share path. Set up the directory:

```bash
# Create the snapshots directory inside the share path
sudo mkdir -p /srv/samba/data/.snapshots

# The shadow_copy2 module will look here by default
# You can also place snapshots outside the share path using configuration
```

## Configuring Samba shadow_copy2

Open the Samba configuration:

```bash
sudo nano /etc/samba/smb.conf
```

```ini
[global]
   workgroup = WORKGROUP
   server string = Ubuntu File Server
   security = user
   passdb backend = tdbsam

[Data]
   path = /srv/samba/data
   valid users = @smbusers
   read only = no
   browseable = yes

   # Load the shadow_copy2 VFS module
   vfs objects = shadow_copy2

   # Snapshot directory location relative to the share path
   # @GMT- prefixed directories will be found here
   shadow:snapdir = .snapshots

   # The snapshot directories are inside the share
   shadow:basedir = /srv/samba/data

   # Sort snapshots newest first
   shadow:sort = desc

   # Format string for parsing snapshot directory names
   # This matches the @GMT-YYYY.MM.DD-HH.MM.SS format
   shadow:format = @GMT-%Y.%m.%d-%H.%M.%S

   # How to present the path inside snapshots
   # "yes" means use the same relative path inside the snapshot
   shadow:localtime = no
```

Test the configuration:

```bash
testparm
sudo systemctl restart smbd
```

## Using Btrfs Snapshots Instead

If your filesystem is Btrfs, the snapshot process is simpler and more efficient:

```bash
# Create a Btrfs subvolume for the share data
sudo btrfs subvolume create /srv/samba/data

# Create snapshot directory
sudo mkdir -p /srv/samba/.snapshots

# Create a snapshot
TIMESTAMP=$(date -u +"%Y.%m.%d-%H.%M.%S")
sudo btrfs subvolume snapshot -r /srv/samba/data "/srv/samba/.snapshots/@GMT-${TIMESTAMP}"
```

The Samba configuration for Btrfs is identical - the shadow_copy2 module doesn't care about the underlying snapshot technology, only the directory naming convention.

## Verifying Snapshots Are Visible on Windows

On a Windows client connected to the share:

1. Right-click any file or folder in the mapped drive
2. Select "Properties"
3. Click the "Previous Versions" tab

If shadow copies are configured correctly, you will see a list of available restore points with timestamps. If the tab is empty, check the troubleshooting section below.

From PowerShell, you can also query available shadow copies:

```powershell
# List available shadow copies on the share
Get-WmiObject Win32_ShadowCopy
```

## Verifying from the Linux Side

```bash
# Check what snapshots are currently mounted
mount | grep snap

# List snapshot directories Samba should find
ls -la /srv/samba/data/.snapshots/

# Test that Samba can see the snapshots
sudo smbclient //localhost/Data -U smbuser -c "ls"
```

You can also use the `vfs_shadow_copy2` test mode:

```bash
# Check shadow copy configuration via testparm
testparm -s 2>/dev/null | grep -A 20 '\[Data\]'
```

## Troubleshooting

**Previous Versions tab shows empty:** The most common cause is that the snapshot directories don't match the expected format. Run:

```bash
ls /srv/samba/data/.snapshots/
# Should show directories like: @GMT-2026.03.01-12.00.00
```

If the names don't match, adjust `shadow:format` in smb.conf to match your actual directory names.

**Snapshots visible but files don't match:** Verify the snapshot was mounted before the file was changed. Snapshots only show files as they existed at snapshot time.

**LVM snapshot fills up:** Increase the snapshot size in the `lvcreate` command. A 1GB COW space is often too small for busy shares. Use `lvs` to monitor snapshot fullness:

```bash
lvs --options lv_name,lv_size,data_percent,snap_percent
```

**Performance impact of snapshots:** LVM snapshots add overhead to every write on the origin volume. For high-write workloads, consider Btrfs or ZFS which have more efficient snapshot implementations.

## Automating Snapshot Rotation with Systemd

A more reliable approach than cron uses systemd timers:

```bash
sudo nano /etc/systemd/system/samba-snapshot.service
```

```ini
[Unit]
Description=Create Samba shadow copy snapshot
After=local-fs.target

[Service]
Type=oneshot
ExecStart=/usr/local/bin/create-snapshot.sh
ExecStart=/usr/local/bin/prune-snapshots.sh
```

```bash
sudo nano /etc/systemd/system/samba-snapshot.timer
```

```ini
[Unit]
Description=Run Samba snapshot every 4 hours

[Timer]
OnBootSec=5min
OnUnitActiveSec=4h
Persistent=true

[Install]
WantedBy=timers.target
```

```bash
sudo systemctl enable samba-snapshot.timer
sudo systemctl start samba-snapshot.timer

# Verify the timer is active
systemctl list-timers samba-snapshot.timer
```

This setup gives Windows users the ability to self-service file recovery without requiring administrator intervention, reducing support requests significantly on file server environments.
