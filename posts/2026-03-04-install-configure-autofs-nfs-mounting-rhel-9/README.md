# How to Install and Configure autofs for On-Demand NFS Mounting on RHEL

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: RHEL, Autofs, NFS, Automount, Linux

Description: Install and configure autofs on RHEL to automatically mount NFS shares when accessed and unmount them when idle.

---

autofs is a service that automatically mounts file systems when they are accessed and unmounts them after a period of inactivity. This is useful for NFS shares that do not need to be permanently mounted, reducing the number of active NFS connections and avoiding mount issues when the NFS server is temporarily unavailable.

## Why autofs Instead of fstab

With static mounts in `/etc/fstab`:
- All mounts are attempted at boot
- If the NFS server is down at boot, the system may hang or the mount fails
- All mounts consume resources even when not in use

With autofs:
- Mounts happen on demand (when a user or process accesses the path)
- Unmounts happen automatically after idle timeout
- Boot is not affected by NFS server availability
- No persistent connections to unused shares

## Step 1: Install autofs

```bash
sudo dnf install -y autofs nfs-utils
```

## Step 2: Enable and Start the Service

```bash
sudo systemctl enable --now autofs
```

## Step 3: Understand the Configuration Files

autofs uses a master map and individual map files:

- `/etc/auto.master` (or `/etc/auto.master.d/`): The master map that defines mount points and their map files
- `/etc/auto.*`: Individual map files that define what to mount where

## Step 4: Configure a Simple NFS Automount

### Edit the Master Map

Add an entry to `/etc/auto.master` (or create a file in `/etc/auto.master.d/`):

```bash
sudo tee /etc/auto.master.d/nfs.autofs << 'MASTER'
/nfs /etc/auto.nfs --timeout=300
MASTER
```

This says: "Use `/etc/auto.nfs` to manage mounts under `/nfs/`, and unmount after 300 seconds (5 minutes) of inactivity."

### Create the Map File

```bash
sudo tee /etc/auto.nfs << 'MAP'
data -rw,soft,intr nfsserver:/export/data
logs -ro,soft,intr nfsserver:/export/logs
media -rw,soft,intr nfsserver:/export/media
MAP
```

Each line defines:
- **Key** (`data`): The subdirectory name under the mount point
- **Options** (`-rw,soft,intr`): Mount options
- **Source** (`nfsserver:/export/data`): The NFS export to mount

## Step 5: Restart autofs

```bash
sudo systemctl restart autofs
```

## Step 6: Test the Automount

```bash
# The /nfs directory exists but is empty
ls /nfs/

# Access a subdirectory to trigger the mount
ls /nfs/data/

# The NFS share is now mounted
mount | grep /nfs/data

# After 5 minutes of inactivity, it will unmount automatically
```

## Common Mount Options

```bash
-rw              Read-write
-ro              Read-only
-soft            Return error if server is unreachable (instead of hanging)
-intr            Allow interrupting hung NFS operations
-timeo=30        Timeout in deciseconds (3 seconds)
-retrans=3       Number of retries before giving up
-vers=4          Force NFS version 4
-sec=krb5        Use Kerberos authentication
```

## Verifying the Setup

```bash
# Check autofs status
sudo systemctl status autofs

# Show current automount maps
sudo automount -m

# Check for mount errors
sudo journalctl -u autofs
```

## Removing an Automount

1. Remove the entry from the map file
2. Remove the master map entry (if removing the entire mount point)
3. Restart autofs:
   ```bash
   sudo systemctl restart autofs
   ```

## Conclusion

autofs provides a clean, on-demand approach to NFS mounting on RHEL. Shares mount when accessed and unmount when idle, reducing resource usage and improving boot reliability. Configure the master map to define mount points, and individual map files to specify the NFS exports for each mount.
