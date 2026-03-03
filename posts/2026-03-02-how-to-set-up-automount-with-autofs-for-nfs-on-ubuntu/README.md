# How to Set Up Automount with autofs for NFS on Ubuntu

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Ubuntu, NFS, autofs, Networking, File Sharing

Description: Configure autofs on Ubuntu to automatically mount NFS shares on demand and unmount them after a period of inactivity, reducing resource usage and handling temporary server unavailability gracefully.

---

Static NFS mounts in `/etc/fstab` connect at boot and stay connected. This works fine for shares you use constantly, but for shares accessed occasionally - home directories, project folders, or archive servers - it wastes resources and creates problems when the NFS server is temporarily unavailable. `autofs` solves this by mounting shares only when accessed and unmounting them after a configurable idle period.

## Why Use autofs Instead of fstab

The advantages of autofs over static fstab mounts:

- **On-demand mounting:** The filesystem mounts when a process accesses the mount point, not at boot.
- **Automatic unmounting:** After a configurable timeout (default 5 minutes), idle mounts are unmounted.
- **Boot resilience:** If the NFS server is unavailable at boot, autofs handles this gracefully rather than causing long boot delays.
- **Dynamic share configuration:** Home directory automounting for many users without a line per user in fstab.
- **Easy management:** Changing autofs maps does not require remounting everything.

## Installing autofs

```bash
sudo apt update
sudo apt install autofs nfs-common -y
```

## How autofs Works

autofs uses "maps" to define what to mount. There are two main layers:

1. **Auto master file** (`/etc/auto.master`): Defines mount points and which map file handles them.
2. **Map files** (e.g., `/etc/auto.nfs`): Define what to mount at each subdirectory.

When a process accesses `/mnt/nfs/data`, autofs intercepts the access, reads the map file, mounts the NFS share at that path, and then returns the data. After the timeout, autofs unmounts it.

## Configuring the Auto Master File

The auto master maps directories to map files:

```bash
sudo nano /etc/auto.master
```

```text
# Format: mount-point  map-file  [options]

# Mount NFS shares under /mnt/nfs, using /etc/auto.nfs as the map
/mnt/nfs  /etc/auto.nfs  --timeout=300 --ghost

# Mount user home directories under /home/nfs
/home/nfs  /etc/auto.home  --timeout=600
```

Options:
- `--timeout=300`: Unmount after 300 seconds (5 minutes) of inactivity
- `--ghost`: Create placeholder directories for each entry so paths appear to exist even when not mounted. Without this, the directory only appears after access.
- `--browse`: Similar to `--ghost` on some systems

## Creating the NFS Map File

```bash
sudo nano /etc/auto.nfs
```

```text
# Format: key  [options]  location

# Simple entry: /mnt/nfs/data mounts nfsserver:/srv/nfs/data
data  -rw,hard,intr,timeo=600  nfsserver.example.com:/srv/nfs/data

# Read-only mount with noatime
backup  -ro,hard,intr,noatime  nfsserver.example.com:/srv/nfs/backup

# Different server
archive  -ro,hard,intr,noatime  archiveserver.example.com:/exports/archive

# Mount with specific NFS version
legacy  -vers=3,rw,hard,intr  oldserver.example.com:/exports/legacy
```

Each key in the map file creates a subdirectory under the master mount point. So `data` in `/etc/auto.nfs` becomes `/mnt/nfs/data`.

## Starting autofs

```bash
# Enable and start autofs
sudo systemctl enable autofs
sudo systemctl start autofs

# Check status
sudo systemctl status autofs
```

## Testing the Automount

```bash
# Access the mount point (this triggers the automount)
ls /mnt/nfs/data

# Verify it mounted
mount | grep autofs
df -h /mnt/nfs/data

# Wait for the timeout and check it unmounts
# (Or check after the timeout period)
sleep 310  # wait slightly longer than the 300s timeout
mount | grep /mnt/nfs/data  # should no longer be mounted
```

You can also trigger access and watch the autofs log:

```bash
# In one terminal, watch autofs messages
sudo journalctl -u autofs -f

# In another terminal, access the mount
ls /mnt/nfs/data
```

You should see the mount event in the journal.

## Wildcard Maps for Home Directories

A common use case for autofs is automatic home directory mounting for NFS home directories. With a wildcard key `*`, autofs substitutes the key value:

```bash
sudo nano /etc/auto.home
```

```text
# Wildcard: * matches any subdirectory
# & is substituted with the matched key value
*  -rw,hard,intr,noatime  nfsserver.example.com:/srv/nfs/home/&
```

With this configuration, when user `alice` logs in and the shell accesses `/home/nfs/alice`, autofs mounts `nfsserver.example.com:/srv/nfs/home/alice` at `/home/nfs/alice`. The `&` expands to `alice`.

Set this as the home directory for NFS users:

```bash
# Set a user's home directory to the NFS-automounted path
sudo usermod -d /home/nfs/alice alice
```

## Using LDAP or NIS Maps

autofs can read maps from LDAP for enterprise environments. Configure in `/etc/autofs.conf`:

```bash
sudo nano /etc/autofs.conf
```

```ini
[autofs]
timeout = 300
browse_mode = no
mount_verbose = no

[amd]
# empty for autofs daemon

[sss]
# empty for SSSD integration
```

For LDAP maps, add to `/etc/auto.master`:

```text
/home  ldap:ou=automount,dc=example,dc=com  --timeout=600
```

## Using autofs with SSSD

If you use SSSD for authentication, configure autofs to use the SSSD automount map source:

```bash
sudo nano /etc/sssd/sssd.conf
```

Add to the `[sssd]` section:
```ini
services = nss, pam, autofs
```

Add an `[autofs]` section:
```ini
[autofs]
```

Enable the autofs SSSD integration:

```bash
sudo nano /etc/auto.master
```

```text
/home  sss  --timeout=600
```

## Configuring Indirect vs. Direct Maps

### Indirect Maps (Most Common)

Indirect maps mount under a parent directory (as shown above). The parent directory in auto.master is managed by autofs.

### Direct Maps

Direct maps specify the exact mount point:

```bash
sudo nano /etc/auto.master
```

```text
# /- means direct map (the map file specifies full paths)
/-  /etc/auto.direct  --timeout=300
```

```bash
sudo nano /etc/auto.direct
```

```text
# Full path specified in direct maps
/mnt/data      -rw,hard,intr  nfsserver.example.com:/srv/nfs/data
/opt/software  -ro,hard,intr  nfsserver.example.com:/srv/nfs/software
```

Direct maps are useful when you need NFS shares at specific paths that are not subdirectories of a common parent.

## Reloading Configuration After Changes

```bash
# Reload autofs to pick up map file changes
sudo systemctl reload autofs

# Or force re-read of all maps
sudo automount -v

# Restart autofs (drops all mounts temporarily)
sudo systemctl restart autofs
```

Unlike fstab mounts, you do not need to manually unmount and remount shares when changing map files. A reload is sufficient.

## Troubleshooting autofs

### Mount Not Triggering

```bash
# Check autofs is running
sudo systemctl status autofs

# Enable verbose logging temporarily
sudo automount --verbose

# Check autofs log
sudo journalctl -u autofs -n 50

# Verify the map file syntax
# Common errors: missing - before options, wrong field order
automount --dumpmaps
```

### "Mount point doesn't exist" Errors

```bash
# Ensure the top-level directory exists but is not already mounted
ls /mnt/nfs

# Remove and recreate if it has leftover mounts
sudo umount -l /mnt/nfs
sudo rm -rf /mnt/nfs
sudo mkdir /mnt/nfs
sudo systemctl restart autofs
```

### NFS Server Unavailable

```bash
# autofs with --timeout handles unavailable servers
# by failing the mount request
# Check if the server is reachable
ping nfsserver.example.com
showmount -e nfsserver.example.com
```

### Debugging with automount Command

```bash
# Run autofs in foreground with debug output
sudo systemctl stop autofs
sudo automount -f -v --debug
```

## autofs for /net (Wildcard Server Browsing)

A special autofs configuration allows browsing any NFS server:

```bash
sudo nano /etc/auto.master
```

```text
# Automatic NFS browsing: /net/hostname/export mounts hostname:/export
/net  /etc/auto.net  --timeout=60 --ghost
```

The `/etc/auto.net` script is usually installed with autofs:

```bash
ls /etc/auto.net
```

With this configuration, `ls /net/nfsserver.example.com/` shows all exports from that server, and accessing `/net/nfsserver.example.com/data` mounts that export. This is useful for administrative access without pre-configuring every share.

autofs is a mature and reliable solution for on-demand NFS mounting. The combination of ghost mode for predictable paths and configurable timeouts for resource efficiency makes it superior to static fstab mounts for most use cases involving optional or user-specific NFS shares.
