# How to Set Up Samba VFS Modules (Recycle Bin, Shadow Copy) on Ubuntu

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Ubuntu, Samba, File Sharing, VFS, Backup

Description: Configure Samba VFS modules on Ubuntu including the recycle bin for recovering deleted files and shadow copy integration for Windows Previous Versions support.

---

Samba's Virtual File System (VFS) module system lets you add functionality to shares without modifying the underlying filesystem. Two of the most practically useful VFS modules are `recycle` (which redirects deleted files to a recycle bin instead of permanently deleting them) and `shadow_copy2` (which integrates with filesystem snapshots to expose Windows "Previous Versions" functionality). This guide covers both.

## Understanding Samba VFS Modules

VFS modules are loaded as shared libraries by `smbd` and intercept filesystem operations. You specify which modules to load per-share using the `vfs objects` directive. Multiple modules can be stacked, and their order matters - they execute in the order listed.

## The Recycle Bin VFS Module

The `recycle` module intercepts `unlink` (delete) operations. Instead of deleting the file, it moves it to a `.recycle` directory (or another configured path) within the share. This gives users a chance to recover accidentally deleted files without administrator intervention.

### Configuring the Recycle Module

Edit `/etc/samba/smb.conf`:

```bash
sudo nano /etc/samba/smb.conf
```

```ini
[myshare]
   comment = Share with Recycle Bin
   path = /srv/samba/myshare
   valid users = @smbusers
   read only = no
   browseable = yes

   # Load the recycle VFS module
   vfs objects = recycle

   # Directory within the share where deleted files go
   recycle:repository = .recycle

   # Keep the original directory tree in the recycle bin
   recycle:keeptree = yes

   # Keep multiple versions of the same filename
   recycle:versions = yes

   # Touch the file to update its timestamp when moved to recycle
   recycle:touch = yes

   # Maximum file size to recycle (in bytes, 0 = unlimited)
   recycle:maxsize = 0

   # Files NOT to recycle (temporary files, etc.)
   recycle:exclude = *.tmp *.temp ~$*

   # Directories to exclude from recycling
   recycle:exclude_dir = .git __pycache__ node_modules
```

### Setting Up the Recycle Directory

The recycle directory needs to be writable but ideally not visible to users (or visible only to administrators):

```bash
# The .recycle directory will be created automatically by Samba
# But set permissions appropriately on the share root
sudo chown -R root:smbusers /srv/samba/myshare
sudo chmod -R 775 /srv/samba/myshare

# After first deletion, the .recycle directory appears
# You can pre-create it with appropriate permissions
sudo mkdir -p /srv/samba/myshare/.recycle
sudo chown root:smbusers /srv/samba/myshare/.recycle
sudo chmod 770 /srv/samba/myshare/.recycle
```

### Automatic Recycle Bin Cleanup

The recycle bin fills up over time. Set up a cron job to clean old files:

```bash
# Create a cleanup script
sudo nano /usr/local/bin/samba-recycle-cleanup.sh
```

```bash
#!/bin/bash
# Clean Samba recycle bins older than 30 days

RECYCLE_PATH="/srv/samba/myshare/.recycle"

if [ -d "$RECYCLE_PATH" ]; then
    # Find and delete files older than 30 days
    find "$RECYCLE_PATH" -type f -mtime +30 -delete

    # Remove empty directories
    find "$RECYCLE_PATH" -type d -empty -delete

    echo "$(date): Recycle bin cleanup completed" >> /var/log/samba-recycle-cleanup.log
fi
```

```bash
sudo chmod +x /usr/local/bin/samba-recycle-cleanup.sh

# Schedule daily cleanup at 2 AM
sudo crontab -e
```

Add:
```
0 2 * * * /usr/local/bin/samba-recycle-cleanup.sh
```

## The Shadow Copy VFS Module

The `shadow_copy2` module exposes filesystem snapshots as Windows "Previous Versions." When a Windows user right-clicks a file or folder on a Samba share and chooses "Restore previous versions," they see snapshots that you have configured on the server. This works with any snapshot technology: LVM snapshots, ZFS snapshots, Btrfs snapshots, or others.

### How Shadow Copy Integration Works

`shadow_copy2` looks for directories (or bind mounts) named according to a snapshot naming convention. The default format is `@GMT-YYYY.MM.DD-HH.MM.SS` (GMT timestamp format). When Windows requests previous versions, Samba returns the list of available snapshots.

### Setting Up LVM Snapshots for Shadow Copy

This example uses LVM snapshots for a share on `/srv/samba/myshare` (on an LVM logical volume):

```bash
# Identify the logical volume
sudo lvs
# Example output shows /dev/vg0/data is the LV for our share

# Create a snapshot (do this periodically, e.g., via cron)
# The snapshot name must follow the @GMT format for shadow_copy2
SNAP_NAME=$(date -u +@GMT-%Y.%m.%d-%H.%M.%S)
sudo lvcreate --size 1G --snapshot --name "$SNAP_NAME" /dev/vg0/data

# Mount the snapshot with the GMT-format name
sudo mkdir -p "/srv/samba/myshare/$SNAP_NAME"
sudo mount -o ro /dev/vg0/"$SNAP_NAME" "/srv/samba/myshare/$SNAP_NAME"
```

Create a snapshot script:

```bash
sudo nano /usr/local/bin/samba-snapshot.sh
```

```bash
#!/bin/bash
# Create LVM snapshot for Samba shadow copies

VG="vg0"
LV="data"
SNAP_SIZE="2G"
MOUNT_BASE="/srv/samba/myshare"
MAX_SNAPS=10  # Keep only the last 10 snapshots

# Create snapshot with GMT timestamp name
SNAP_NAME=$(date -u +@GMT-%Y.%m.%d-%H.%M.%S)

# Create the LVM snapshot
lvcreate --size "$SNAP_SIZE" --snapshot --name "$SNAP_NAME" /dev/${VG}/${LV}

# Create mount point
mkdir -p "${MOUNT_BASE}/${SNAP_NAME}"

# Mount read-only
mount -o ro /dev/${VG}/${SNAP_NAME} "${MOUNT_BASE}/${SNAP_NAME}"

# Remove old snapshots beyond MAX_SNAPS
SNAP_COUNT=$(ls -d "${MOUNT_BASE}"/@GMT-* 2>/dev/null | wc -l)
if [ "$SNAP_COUNT" -gt "$MAX_SNAPS" ]; then
    OLDEST=$(ls -d "${MOUNT_BASE}"/@GMT-* | head -1)
    # Unmount and remove oldest snapshot
    umount "$OLDEST"
    rmdir "$OLDEST"
    # Remove the LVM snapshot
    OLD_SNAP=$(basename "$OLDEST")
    lvremove -f /dev/${VG}/${OLD_SNAP}
fi

echo "$(date): Snapshot $SNAP_NAME created" >> /var/log/samba-snapshots.log
```

```bash
sudo chmod +x /usr/local/bin/samba-snapshot.sh

# Schedule hourly snapshots
sudo crontab -e
```

Add:
```
0 * * * * /usr/local/bin/samba-snapshot.sh
```

### Configuring shadow_copy2 in smb.conf

```ini
[myshare]
   comment = Share with Shadow Copy (Previous Versions)
   path = /srv/samba/myshare
   valid users = @smbusers
   read only = no
   browseable = yes

   # Load shadow_copy2 module
   vfs objects = shadow_copy2

   # Where snapshots are located (relative to share path)
   shadow:snapdir = .

   # Snapshot directory format pattern
   shadow:format = @GMT-%Y.%m.%d-%H.%M.%S

   # Sort snapshots in reverse chronological order
   shadow:sort = desc

   # Use UTC for snapshot timestamps
   shadow:localtime = no
```

### Combining Recycle Bin and Shadow Copy

To use both modules on the same share:

```ini
[myshare]
   comment = Share with Recycle Bin and Shadow Copy
   path = /srv/samba/myshare
   valid users = @smbusers
   read only = no
   browseable = yes

   # Stack multiple VFS modules (order matters)
   vfs objects = shadow_copy2 recycle full_audit

   # shadow_copy2 settings
   shadow:snapdir = .
   shadow:format = @GMT-%Y.%m.%d-%H.%M.%S
   shadow:sort = desc
   shadow:localtime = no

   # recycle settings
   recycle:repository = .recycle
   recycle:keeptree = yes
   recycle:versions = yes
   recycle:touch = yes

   # audit settings
   full_audit:success = open write rename unlink mkdir connect
   full_audit:failure = connect open
   full_audit:prefix = %u|%I
   full_audit:priority = NOTICE
   full_audit:facility = LOCAL5
```

## Testing the Configuration

```bash
# Validate the smb.conf syntax
testparm

# Reload Samba
sudo systemctl reload smbd

# Test that the VFS modules loaded successfully
sudo smbcontrol smbd debuglevel 3
sudo tail -f /var/log/samba/log.smbd | grep -i "vfs\|shadow\|recycle"
```

### Testing Recycle Bin

From a Windows client:
1. Connect to the share
2. Delete a file
3. Check the `.recycle` directory on the server

```bash
# Check recycle bin contents on the server
ls -la /srv/samba/myshare/.recycle/
```

### Testing Shadow Copy

From a Windows client:
1. Right-click a folder on the share
2. Select "Properties"
3. Go to the "Previous Versions" tab
4. Available snapshots should appear here

If Previous Versions tab is empty, verify the snapshot directories follow the `@GMT-YYYY.MM.DD-HH.MM.SS` naming format exactly and are accessible to the smbd process.

```bash
# List available snapshots
ls -la /srv/samba/myshare/@GMT-*

# Verify a snapshot mount contains the correct data
ls /srv/samba/myshare/@GMT-2026.03.01-12.00.00/
```

VFS modules make Samba significantly more capable without requiring complex backup infrastructure on the client side. Users can recover their own files, reducing help desk tickets and making file services genuinely resilient.
