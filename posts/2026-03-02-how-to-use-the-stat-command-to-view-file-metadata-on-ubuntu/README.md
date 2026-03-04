# How to Use the stat Command to View File Metadata on Ubuntu

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Ubuntu, Linux, File Systems, Command Line, System Administration

Description: Learn how to use the stat command on Ubuntu to view detailed file metadata including all timestamps, inode numbers, block allocation, and permission details beyond what ls provides.

---

`ls -la` gives you a quick overview of file permissions and modification times, but `stat` gives you everything: all three timestamps, inode number, device number, block allocation, link count, and both symbolic and octal representations of permissions. When you need the full picture of a file's metadata, `stat` is the right tool.

## Basic Usage

```bash
stat filename
stat /etc/nginx/nginx.conf
```

Output:

```text
  File: /etc/nginx/nginx.conf
  Size: 1490            Blocks: 8          IO Block: 4096   regular file
Device: 801h/2049d      Inode: 131073      Links: 1
Access: (0644/-rw-r--r--)  Uid: (    0/    root)   Gid: (    0/    root)
Access: 2026-03-02 08:45:00.123456789 +0000
Modify: 2026-03-01 14:30:00.456789012 +0000
Change: 2026-03-01 14:30:00.456789012 +0000
 Birth: 2025-12-01 10:00:00.000000000 +0000
```

## Understanding Each Field

### File

The filename and type. For symlinks, shows the link path (not the target). For files in path form, shows the full path.

### Size and Block Information

```text
Size: 1490            Blocks: 8          IO Block: 4096   regular file
```

- **Size**: Actual file size in bytes (what you see in `ls -lh`)
- **Blocks**: Number of 512-byte blocks allocated on disk (can be more than size/512 due to filesystem block alignment, or fewer with sparse files)
- **IO Block**: The filesystem's preferred block size for I/O operations (usually 4096 bytes = 4KB)
- **File type**: regular file, directory, symbolic link, block special, character special, etc.

The difference between Size and Blocks matters for sparse files:

```bash
# Create a sparse file (appears large, uses minimal disk space)
dd if=/dev/zero of=/tmp/sparse.dat bs=1 count=0 seek=1G

stat /tmp/sparse.dat
# Size: 1073741824 (1GB apparent size)
# Blocks: 0 (no actual disk space allocated)
```

### Device and Inode

```text
Device: 801h/2049d      Inode: 131073      Links: 1
```

- **Device**: The device the file lives on, shown in hex and decimal
- **Inode**: The inode number - the filesystem's internal identifier for this file. Two hardlinks to the same file share the same inode.
- **Links**: Number of hardlinks pointing to this inode

Identifying hardlinks:

```bash
# Create a hardlink
ln /etc/nginx/nginx.conf /tmp/nginx-backup.conf

stat /etc/nginx/nginx.conf
# Inode: 131073   Links: 2

stat /tmp/nginx-backup.conf
# Inode: 131073   Links: 2
# Same inode = same file data
```

To find all hardlinks to a file:

```bash
# Find all files sharing the same inode
find / -inum 131073 -ls 2>/dev/null
```

### Permissions

```text
Access: (0644/-rw-r--r--)  Uid: (    0/    root)   Gid: (    0/    root)
```

This line shows permissions in two formats simultaneously:
- Octal: `0644`
- Symbolic: `-rw-r--r--`
- UID as number and resolved username
- GID as number and resolved group name

The numeric forms are useful when usernames might not resolve (deleted users, cross-system comparison).

### The Three Timestamps

```text
Access: 2026-03-02 08:45:00.123456789 +0000
Modify: 2026-03-01 14:30:00.456789012 +0000
Change: 2026-03-01 14:30:00.456789012 +0000
 Birth: 2025-12-01 10:00:00.000000000 +0000
```

Each timestamp serves a different purpose:

| Timestamp | Called | Updated when |
|-----------|--------|--------------|
| Access | atime | File is read (opened for reading) |
| Modify | mtime | File content changes |
| Change | ctime | File metadata changes (permissions, owner, links) OR content changes |
| Birth | btime | File is first created |

**mtime** is what `ls -la` shows by default. It's the most commonly useful timestamp.

**ctime** cannot be manually set and cannot be preserved during copies - it always reflects when the current metadata state was last written. This is why forensic tools rely on ctime for detecting tampering.

**atime** is often disabled on modern systems for performance (the `noatime` mount option). If atime updates are disabled, Access time won't advance even when the file is read.

**Birth** (btime) requires kernel 4.11+ and a filesystem that records creation time (ext4, XFS with reflink, Btrfs). Older systems show a `-` here.

### Checking atime behavior

```bash
# Check if noatime is set for the filesystem
mount | grep "noatime\|relatime"

# Or from fstab
grep "noatime\|relatime" /etc/fstab
```

`relatime` (the Ubuntu default) updates atime only if the current atime is older than the mtime - a compromise between full atime tracking and `noatime`.

## Stat on Directories

```bash
stat /var/www/html/
```

```text
  File: /var/www/html/
  Size: 4096            Blocks: 8          IO Block: 4096   directory
Device: 801h/2049d      Inode: 786433      Links: 3
Access: (0755/drwxr-xr-x)  Uid: (   33/www-data)   Gid: (   33/www-data)
Access: 2026-03-02 09:00:00.000000000 +0000
Modify: 2026-03-01 12:00:00.000000000 +0000
Change: 2026-03-01 12:00:00.000000000 +0000
 Birth: 2025-11-15 08:00:00.000000000 +0000
```

For directories, the link count reflects the number of hardlinks to the directory inode: at minimum 2 (from the parent and from `.` inside the directory), plus one more for each subdirectory it contains.

## Stat on Symlinks

By default, `stat` follows symlinks and shows information about the target:

```bash
stat /usr/bin/python3
# Shows info about the actual python3.11 binary, not the symlink

# To see info about the symlink itself
stat -L /usr/bin/python3   # -L follows links (default behavior)
stat /usr/bin/python3      # Without -L also follows links for stat

# Use readlink to see the link target
readlink /usr/bin/python3
# python3.11
```

Actually, for symlinks specifically, you need `stat -f` or check the "File:" line:

```bash
# Stat actually shows the target info by default
# Use -L explicitly to be clear you want target info
stat --dereference /usr/bin/python3  # equivalent to -L
```

## Custom Output Format

The `-c` (or `--format`) flag lets you specify exactly what information to extract:

```bash
# Print only the permissions in octal
stat -c '%a' /etc/passwd
# 644

# Print filename and octal permissions
stat -c '%n %a' /etc/passwd
# /etc/passwd 644

# Print owner username and group name
stat -c '%U %G' /etc/nginx/nginx.conf
# root root

# Print modification time in a specific format
stat -c '%y' /var/log/syslog
# 2026-03-02 09:00:00.000000000 +0000

# Print size in bytes
stat -c '%s' /var/log/syslog
# 2457600
```

Common format specifiers:

| Specifier | Meaning |
|-----------|---------|
| `%n` | Filename |
| `%s` | Size in bytes |
| `%b` | Number of blocks |
| `%f` | Raw hex permissions |
| `%a` | Permissions in octal |
| `%A` | Permissions in symbolic notation |
| `%u` | Numeric UID |
| `%U` | Username |
| `%g` | Numeric GID |
| `%G` | Group name |
| `%i` | Inode number |
| `%h` | Number of hardlinks |
| `%x` | Time of last access |
| `%y` | Time of last modification |
| `%z` | Time of last change |
| `%w` | Time of creation (birth) |

## Practical Uses

### Finding files that might have been tampered with

```bash
# Find files whose ctime is very recent compared to mtime
# (metadata changed but content wasn't - possible permission tampering)
find /etc -type f -newer /etc/passwd -exec stat -c '%n %z' {} \;
```

### Auditing permissions across a directory

```bash
# Print permissions and path for all files in /etc
find /etc -type f -exec stat -c '%a %n' {} \; | sort
```

### Checking if atime is updating

```bash
# Read a file, then check if atime changed
cat /etc/hostname > /dev/null
stat -c '%x' /etc/hostname
```

### Comparing inode numbers to detect hardlinks

```bash
# Check if two files are actually the same inode
stat -c '%i' /etc/nginx/nginx.conf
stat -c '%i' /tmp/nginx-backup.conf
# Same number = hardlink to same file
```

`stat` is indispensable when `ls` doesn't give you enough detail. The combination of all three timestamps, the inode number, and the explicit octal permission output make it the right tool for forensic analysis, debugging permission problems, and verifying that backups or copies preserved the metadata you expected.
