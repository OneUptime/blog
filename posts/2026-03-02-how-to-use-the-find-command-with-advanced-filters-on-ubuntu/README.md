# How to Use the find Command with Advanced Filters on Ubuntu

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Ubuntu, Linux, find, Shell, File Management

Description: Master the find command on Ubuntu with advanced filters for file type, size, permissions, timestamps, and executing actions on matched files safely and efficiently.

---

The `find` command searches directory trees for files matching specified criteria. What separates `find` from simple file listing is its combination of search criteria - you can find files by name, type, size, modification time, permissions, ownership, and more, then execute commands on every match. It's the backbone of file-based automation on Ubuntu.

## Basic Syntax

```bash
find [starting_directory] [options] [expression]
```

```bash
# Find all files in current directory (recursive)
find .

# Find in /var/log
find /var/log

# Find in multiple directories
find /var/log /tmp /home
```

## Filtering by Name and Type

### By Name

```bash
# Find files with exact name
find /etc -name "sshd_config"

# Find files with a pattern (case-sensitive)
find /var/log -name "*.log"

# Case-insensitive name matching
find /home -iname "readme*"

# Find files NOT matching a pattern
find /var/log -name "*.log" -not -name "*.gz"
```

### By File Type

```bash
# -type f: regular files only
find /etc -type f -name "*.conf"

# -type d: directories only
find /var/www -type d

# -type l: symbolic links
find /etc -type l

# -type b: block devices
find /dev -type b

# Combine: files or symlinks
find /usr/bin -type f -o -type l
```

## Filtering by Size

```bash
# Files larger than 100MB
find /var -type f -size +100M

# Files smaller than 1KB
find /tmp -type f -size -1k

# Files exactly 512 bytes
find . -size 512c  # c = bytes

# Size units: c(bytes), k(KB), M(MB), G(GB)

# Find large log files to investigate
find /var/log -type f -size +50M -name "*.log"
```

## Filtering by Modification Time

Time-based filters are essential for finding recently changed or old stale files:

```bash
# Files modified in the last 7 days (7*24h)
find /home -mtime -7

# Files NOT modified in the last 30 days (potentially stale)
find /tmp -mtime +30

# Files modified exactly 1 day ago (24h to 48h)
find /var/log -mtime 1

# Files modified in the last 60 minutes
find /var/www -mmin -60

# Files modified more than 120 minutes ago
find /tmp -mmin +120
```

The `-mtime` values:
- `-N`: less than N days ago (within the last N days)
- `+N`: more than N days ago (older than N days)
- `N`: exactly N days ago (24h-48h window)

For access time, use `-atime`; for change time (permissions/ownership), use `-ctime`.

## Filtering by Permissions

```bash
# Files with exact permissions (0644 = rw-r--r--)
find /etc -perm 644 -name "*.conf"

# Files with at least these permissions set (/ means "any of these bits")
find /var/www -perm /o+w  # World-writable files (security risk!)

# Files with the setuid bit set (potential privilege escalation)
find / -type f -perm /4000 2>/dev/null

# Files with setgid bit set
find / -type f -perm /2000 2>/dev/null

# World-writable directories
find / -type d -perm /o+w 2>/dev/null
```

## Filtering by Ownership

```bash
# Files owned by a specific user
find /home -user alice -type f

# Files owned by a specific group
find /var/www -group www-data -type f

# Files with no valid owner (orphaned files)
find / -nouser 2>/dev/null

# Files with no valid group
find / -nogroup 2>/dev/null
```

## Combining Conditions

### AND (default behavior)

Multiple conditions are AND-ed together by default:

```bash
# Files owned by alice AND modified in the last 7 days AND over 1MB
find /home/alice -user alice -mtime -7 -size +1M
```

### OR with -o

```bash
# Files with .log OR .tmp extension
find /tmp -name "*.log" -o -name "*.tmp"

# Be careful with operator precedence - use parentheses
find /tmp \( -name "*.log" -o -name "*.tmp" \) -mtime +7
```

### NOT with !

```bash
# Files not owned by root
find /etc -not -user root

# Files that are not .conf files
find /etc -type f ! -name "*.conf"
```

## Executing Actions on Matches

### -exec: Run a Command on Each Match

```bash
# Print detailed info about each match
find /var/log -name "*.log" -exec ls -lh {} \;

# The {} is replaced by the matched file path
# The \; ends the -exec command

# Delete all .tmp files in /tmp
find /tmp -name "*.tmp" -mtime +1 -exec rm {} \;

# Change ownership of all files in /var/www
find /var/www -type f -exec chown www-data:www-data {} \;

# Fix file permissions
find /var/www -type f -exec chmod 644 {} \;
find /var/www -type d -exec chmod 755 {} \;
```

### -exec with + (Batch Processing)

Using `+` instead of `\;` passes multiple filenames to the command at once, which is much more efficient:

```bash
# This calls rm once with all files (like xargs)
find /tmp -name "*.tmp" -mtime +1 -exec rm {} +

# vs. the inefficient version that calls rm once per file
find /tmp -name "*.tmp" -mtime +1 -exec rm {} \;
```

### Using xargs for More Control

```bash
# Pipe find output to xargs for additional processing
find /var/log -name "*.log" -type f | xargs wc -l

# Handle filenames with spaces using null delimiters
find /home -name "*.txt" -print0 | xargs -0 grep -l "TODO"

# Run in parallel with xargs -P
find /var/www -name "*.jpg" -print0 | \
    xargs -0 -P 4 -I{} convert {} -quality 85 {}
```

### -delete: Fast File Deletion

```bash
# Delete matched files directly (faster than -exec rm)
find /tmp -name "*.tmp" -mtime +1 -delete

# Delete empty directories
find /var/log -type d -empty -delete

# Be careful - -delete is immediate and permanent!
# Always test with -print first:
find /tmp -name "*.tmp" -mtime +1 -print   # See what would be deleted
find /tmp -name "*.tmp" -mtime +1 -delete  # Then delete
```

### -print0 for Safe Filename Handling

Filenames can contain spaces and newlines. Use `-print0` with `xargs -0` to handle them correctly:

```bash
# WRONG: Breaks on filenames with spaces
find /home -name "*.mp4" | xargs rm

# RIGHT: Null-delimited, handles spaces and special characters
find /home -name "*.mp4" -print0 | xargs -0 rm
```

## Limiting Depth

```bash
# Search only in immediate directory (no recursion)
find /etc -maxdepth 1 -name "*.conf"

# Search up to 2 levels deep
find /etc -maxdepth 2 -name "*.conf"

# Start from depth 2 (skip top-level files)
find /etc -mindepth 2 -name "*.conf"
```

## Practical Security Audit Examples

```bash
#!/bin/bash
# Security audit: find files that shouldn't be there

echo "=== World-writable files (excluding /proc and /sys) ==="
find / -type f -perm /o+w \
    -not -path "/proc/*" \
    -not -path "/sys/*" \
    -not -path "/dev/*" \
    2>/dev/null

echo ""
echo "=== Setuid files ==="
find / -type f -perm /4000 \
    -not -path "/proc/*" \
    2>/dev/null | sort

echo ""
echo "=== Files with no owner ==="
find / -nouser -not -path "/proc/*" 2>/dev/null | head -20

echo ""
echo "=== SSH authorized_keys files ==="
find /home /root -name "authorized_keys" -type f 2>/dev/null
```

## Finding Large Files for Disk Cleanup

```bash
#!/bin/bash
# Find disk space consumers

echo "Files over 100MB in /var:"
find /var -type f -size +100M 2>/dev/null | \
    xargs -I{} ls -lh {} | \
    sort -k5 -rh | head -20

echo ""
echo "Empty directories in /tmp:"
find /tmp -type d -empty 2>/dev/null

echo ""
echo "Core dump files:"
find / -name "core" -type f 2>/dev/null | \
    while IFS= read -r f; do
        ls -lh "$f"
    done
```

## Finding Recently Modified Config Files

```bash
# Find config files modified in the last 24 hours
find /etc -type f -mmin -1440 -name "*.conf" -o \
    -type f -mmin -1440 -name "*.cfg"

# Find any file changed in the last hour across the whole system
find / -type f -mmin -60 \
    -not -path "/proc/*" \
    -not -path "/sys/*" \
    -not -path "/dev/*" \
    2>/dev/null
```

The `find` command is the correct tool whenever you need to work with files based on metadata rather than content. For content-based search, combine it with `grep`. For bulk operations on the results, use `-exec {} +` or pipe to `xargs -0` for safe, efficient processing.
