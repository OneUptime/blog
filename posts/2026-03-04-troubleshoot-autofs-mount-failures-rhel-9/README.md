# How to Troubleshoot autofs Mount Failures on RHEL

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: RHEL, autofs, Troubleshooting, NFS, Linux

Description: Diagnose and fix common autofs mount failures on RHEL, including configuration errors, NFS connectivity issues, and permission problems.

---

When autofs fails to mount a file system, the result is an empty directory or a "No such file or directory" error. The challenge is that autofs failures are often silent from the user perspective. This guide covers systematic troubleshooting for the most common autofs problems.

## Symptoms of autofs Failures

- Accessing a mount point returns an empty directory
- `cd /mount/point` gives "No such file or directory"
- Applications report missing files or directories
- `mount` command does not show the expected NFS mount

## Step 1: Check autofs Service Status

```bash
sudo systemctl status autofs
```

If the service is not running, start it:

```bash
sudo systemctl start autofs
```

Check for startup errors:

```bash
sudo journalctl -u autofs -b
```

## Step 2: Enable Debug Logging

Edit `/etc/sysconfig/autofs`:

```bash
sudo vi /etc/sysconfig/autofs
```

Set:

```
LOGGING="debug"
```

Or use verbose/debug mode:

```
OPTIONS="--debug"
```

Restart autofs:

```bash
sudo systemctl restart autofs
```

Now check logs while triggering the mount:

```bash
# In one terminal
sudo journalctl -u autofs -f

# In another terminal
ls /mount/point/subdirectory
```

## Step 3: Validate the Master Map

Check for syntax errors in the master map:

```bash
cat /etc/auto.master
ls /etc/auto.master.d/
```

Common master map errors:
- Missing map file path
- Incorrect mount point (must be absolute path)
- Tab/space issues in the file

Verify the map files exist:

```bash
# Check each map file referenced in the master map
cat /etc/auto.master.d/*.autofs
```

## Step 4: Validate Map File Syntax

Common map file errors:

```bash
# Correct format:
# key  [-options]  source

# Wrong: missing space between options and source
data -rw,softnfsserver:/export/data

# Wrong: incorrect option format
data -rw -soft nfsserver:/export/data

# Correct:
data -rw,soft nfsserver:/export/data
```

Test the map file:

```bash
sudo automount -m
```

This prints all configured maps and their entries.

## Step 5: Check NFS Connectivity

```bash
# Can we reach the NFS server?
ping nfsserver

# Can we see the exports?
showmount -e nfsserver

# Can we mount manually?
sudo mount -t nfs nfsserver:/export/data /tmp/test-mount
ls /tmp/test-mount
sudo umount /tmp/test-mount
```

If manual mount works but autofs does not, the problem is in the autofs configuration.

## Step 6: Check DNS Resolution

autofs needs to resolve the NFS server hostname:

```bash
getent hosts nfsserver
host nfsserver
```

If DNS fails, use the IP address in the map file as a workaround:

```
data -rw,soft 192.168.1.10:/export/data
```

## Step 7: Check Firewall

### On the Client

```bash
# NFS requires several ports
sudo firewall-cmd --list-all
```

### On the NFS Server

```bash
sudo firewall-cmd --list-services
# Should include nfs, mountd, rpc-bind
```

## Step 8: Check SELinux

```bash
# Check for SELinux denials
sudo ausearch -m avc -ts recent | grep -i "autofs\|nfs\|mount"

# Enable NFS home directory boolean if needed
sudo getsebool use_nfs_home_dirs
sudo setsebool -P use_nfs_home_dirs on

# Check NFS file contexts
ls -Z /mount/point
```

## Step 9: Check Permissions

### NFS Export Permissions

On the NFS server, verify the export allows the client:

```bash
cat /etc/exports
# Should include the client IP or subnet
```

### Local Permissions

The parent mount point must be accessible:

```bash
ls -ld /mount/point
# autofs manages this, but check it exists
```

## Common Issues and Solutions

### "Mount point does not exist"

autofs should create the mount point automatically. If it does not:

```bash
# Check if something else is using the mount point
mount | grep /mount/point

# Check if the directory exists and is not a regular directory
ls -ld /mount/point
```

### "RPC: Program not registered"

The NFS server is not running properly:

```bash
# On the NFS server
sudo systemctl status nfs-server
sudo systemctl restart nfs-server
```

### "Permission denied"

```bash
# Check NFS export permissions
exportfs -v   # On the server

# Check uid/gid mapping
id username   # On both client and server
```

### Stale File Handle

```bash
# Force unmount and remount
sudo umount -l /mount/point/stuck
sudo systemctl restart autofs
```

### "Too many levels of symbolic links"

Usually a misconfigured map creating a loop. Check the map file for circular references.

## Useful Diagnostic Commands

```bash
# Show all automount maps
sudo automount -m

# Run autofs in foreground with debug
sudo systemctl stop autofs
sudo automount -f -v -d

# Check NFS mount statistics
nfsstat -m

# Check RPC services
rpcinfo -p nfsserver
```

## Conclusion

Most autofs failures come down to: configuration syntax errors, NFS server connectivity, DNS resolution, or SELinux permissions. Enable debug logging, validate the map files, test NFS connectivity manually, and check SELinux. The `automount -m` command is your best tool for verifying the current automount configuration.
