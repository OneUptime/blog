# How to Use lsattr and chattr for Immutable Files on Ubuntu

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Ubuntu, Security, File System, System Administration, Linux

Description: Learn how to use chattr and lsattr on Ubuntu to set and view extended filesystem attributes, including making files immutable to prevent modification even by root.

---

`chattr` and `lsattr` work with filesystem-level attributes that are separate from standard Unix permissions. The most useful of these is the immutable flag (`i`), which prevents a file from being modified, renamed, deleted, or even overwritten by root. This is useful for protecting critical configuration files, log integrity, or defending against certain classes of attacks where an attacker has root but you want to make their changes persist across reboots harder.

## How chattr Attributes Work

These attributes are stored in the filesystem inode itself (not as ACLs or xattrs) and are enforced by the kernel's VFS layer. They apply to ext2, ext3, ext4, and other filesystems that support them. XFS and Btrfs have partial support.

The key distinction from regular permissions: even a root process cannot modify an immutable file unless it first removes the immutable attribute. This provides an additional layer of protection assuming the attacker doesn't have the ability to run `chattr -i` themselves.

## Listing Current Attributes with lsattr

```bash
# List attributes for files in current directory
lsattr

# List a specific file
lsattr /etc/passwd

# Recursive listing
lsattr -R /etc/

# List directories themselves (not their contents)
lsattr -d /etc/
```

Example output:

```
----i--------e-- /etc/passwd
--------------e-- /etc/hostname
```

The dashes represent attribute positions. Each position corresponds to a specific attribute flag.

## Common Attribute Flags

| Flag | Name | Meaning |
|------|------|---------|
| `i` | Immutable | No changes, deletions, renames, or new hardlinks allowed |
| `a` | Append-only | Only append operations allowed (cannot truncate or overwrite) |
| `e` | Extents | File uses extents for block mapping (set automatically by ext4) |
| `A` | No atime update | Access time not updated when file is read |
| `c` | Compressed | Kernel should compress this file automatically |
| `d` | No dump | File excluded from `dump` backup utility |
| `s` | Secure deletion | Blocks zeroed on deletion (implementation varies) |
| `u` | Undeletable | Content saved on deletion (for recovery) |
| `S` | Synchronous | Changes written synchronously to disk |
| `D` | Synchronous directory | Directory updates written synchronously |

The `e` flag is set automatically by ext4 and just means the file uses the extents allocation method. You'll see it on almost all files on an ext4 system.

## Setting the Immutable Flag

```bash
# Make a single file immutable
sudo chattr +i /etc/resolv.conf

# Make multiple files immutable
sudo chattr +i /etc/passwd /etc/shadow /etc/group

# Apply recursively to a directory and its contents
sudo chattr -R +i /etc/ssl/private/
```

### Verifying immutability

```bash
lsattr /etc/resolv.conf
# ----i--------e-- /etc/resolv.conf

# Try to modify - should fail even as root
sudo echo "test" >> /etc/resolv.conf
# bash: /etc/resolv.conf: Operation not permitted

sudo rm /etc/resolv.conf
# rm: cannot remove '/etc/resolv.conf': Operation not permitted
```

### Removing the immutable flag

```bash
sudo chattr -i /etc/resolv.conf

# Now modifications work
sudo nano /etc/resolv.conf
```

## Setting the Append-Only Flag

The append-only flag (`a`) is ideal for log files. The file can only be opened in append mode - processes can add to the end but cannot truncate, overwrite, or delete it.

```bash
# Protect a log file so entries can be added but not erased
sudo chattr +a /var/log/secure-audit.log

# Verify
lsattr /var/log/secure-audit.log
# -----a-------e-- /var/log/secure-audit.log

# Append works
echo "New log entry" | sudo tee -a /var/log/secure-audit.log

# Overwrite fails
echo "Erase everything" | sudo tee /var/log/secure-audit.log
# tee: /var/log/secure-audit.log: Operation not permitted

# Truncate fails
sudo truncate -s 0 /var/log/secure-audit.log
# truncate: cannot open '/var/log/secure-audit.log' for writing: Operation not permitted
```

This makes `+a` well-suited for audit logs where you need to ensure entries can't be deleted to cover tracks.

## Protecting Critical System Files

A practical hardening configuration for important system files:

```bash
#!/bin/bash
# Harden critical configuration files with immutable flag
# Run this after your server configuration is finalized

# Network configuration - rarely should change
sudo chattr +i /etc/hosts
sudo chattr +i /etc/hostname

# SSH configuration - lock it down after finalizing
sudo chattr +i /etc/ssh/sshd_config

# Cron directories - prevent unauthorized scheduled tasks
sudo chattr +i /etc/cron.d/
sudo chattr +i /etc/cron.daily/
sudo chattr +i /etc/cron.weekly/

# Verify all settings
lsattr /etc/hosts /etc/hostname /etc/ssh/sshd_config
lsattr -d /etc/cron.d/ /etc/cron.daily/ /etc/cron.weekly/
```

To make changes later, remove the attribute first:

```bash
sudo chattr -i /etc/ssh/sshd_config
# Make your changes
sudo nano /etc/ssh/sshd_config
# Restore protection
sudo chattr +i /etc/ssh/sshd_config
```

## Combining Flags

```bash
# Set both immutable and append-only (unusual but possible)
sudo chattr +ia /path/to/file

# Remove both flags at once
sudo chattr -ia /path/to/file

# Add no-atime update flag (saves I/O on frequently read files)
sudo chattr +A /var/cache/myapp/index
```

## Finding Files with Special Attributes

During security audits, check for files with immutable or append-only flags set:

```bash
# Find all immutable files in /etc
lsattr /etc/* 2>/dev/null | grep "^.*i"

# More targeted search across the whole system
# (slow on large filesystems)
sudo find / -xdev -exec lsattr {} \; 2>/dev/null | grep "^.*i.*--"
```

You might also want to find immutable files unexpectedly set by malware:

```bash
# Look for immutable files in suspicious locations
lsattr -R /tmp /var/tmp /dev/shm 2>/dev/null | grep "^.*i"
```

## Limitations and Caveats

**Not a substitute for proper permissions**: chattr attributes protect against modification but don't control read access. Use standard permissions and ACLs for access control.

**Boot-time bypass**: Someone with physical access can boot from external media and mount the filesystem, bypassing chattr protections entirely. Secure boot and disk encryption address this threat level.

**Filesystem support**: Attributes are fully supported on ext2/3/4. Support on XFS is partial (only `A`, `a`, `i`, `S` work). Btrfs support varies by attribute. Check your filesystem documentation.

**Logrotate conflicts**: If you set `+a` on log files that logrotate manages, logrotate will fail because it can't truncate the file. Either exempt those logs from logrotate or use a logging architecture that appends to dated files and creates new log files rather than truncating existing ones.

**Backups**: Some backup tools don't preserve chattr flags. Verify your backup restores with the same protection attributes in place.

The immutable flag is a simple but powerful protection mechanism. For servers where configuration changes happen infrequently and through controlled processes, locking down critical files with `chattr +i` raises the bar for both accidental changes and deliberate tampering.
