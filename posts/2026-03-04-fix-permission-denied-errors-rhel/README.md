# How to Fix 'Permission Denied' Errors on RHEL

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: RHEL, Permissions, Troubleshooting, Linux, File System

Description: A systematic approach to diagnosing and fixing 'Permission Denied' errors on RHEL, covering file permissions, ownership, ACLs, and SELinux.

---

"Permission Denied" is one of the most common errors on RHEL. It can stem from standard Unix permissions, ACLs, SELinux, or other security mechanisms. This guide walks through each potential cause.

## Check Standard File Permissions

```bash
# View permissions on the file or directory
ls -la /path/to/file

# The output shows: permissions owner group
# -rw-r----- 1 root apache 1024 Mar 1 10:00 config.txt
# Only root and apache group members can read this file

# Fix ownership if needed
sudo chown user:group /path/to/file

# Fix permissions
# Give the owner read/write, group read, others nothing
sudo chmod 640 /path/to/file

# For directories, ensure the execute bit is set for traversal
sudo chmod 750 /path/to/directory
```

## Check Parent Directory Permissions

A common oversight is that the parent directory lacks execute permission.

```bash
# Check permissions on every directory in the path
namei -l /path/to/file

# If any directory lacks execute (x) permission for your user,
# you cannot traverse it
sudo chmod o+x /path/to/
```

## Check for ACLs

Extended ACLs can override standard permissions.

```bash
# A plus sign (+) in ls output indicates ACLs
ls -la /path/to/file
# -rw-r-----+ 1 root root 1024 ...

# View the full ACL
getfacl /path/to/file

# Remove restrictive ACLs if needed
sudo setfacl -b /path/to/file
```

## Check SELinux Context

```bash
# View the SELinux context
ls -Z /path/to/file

# Check for recent SELinux denials
sudo ausearch -m avc --start recent

# Restore the correct SELinux context
sudo restorecon -v /path/to/file
```

## Check for Immutable Attributes

```bash
# Check if the file has the immutable attribute
lsattr /path/to/file
# ----i---------- /path/to/file (i means immutable)

# Remove the immutable attribute if needed
sudo chattr -i /path/to/file
```

## Check Mount Options

```bash
# Some mount options restrict access
mount | grep /path

# If mounted with noexec, you cannot execute files
# If mounted with nosuid, setuid bits are ignored
# Remount with proper options
sudo mount -o remount,exec /mountpoint
```

Work through these checks in order. Most "Permission Denied" errors are caused by standard Unix permissions or SELinux context mismatches.
