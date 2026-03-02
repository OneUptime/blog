# How to Use the find Command to Search Files and Directories on Ubuntu

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Ubuntu, Linux, Command Line, System Administration, File Management

Description: Master the find command on Ubuntu to search for files by name, type, size, permissions, timestamps, and more, plus how to take action on the results.

---

The `find` command is one of the most powerful tools on any Linux system. It searches the filesystem in real time (no index required) and can filter by dozens of criteria: name, type, size, ownership, permissions, modification time, and more. It can also execute commands on each result. Knowing find well makes many system administration tasks much easier.

## Basic Syntax

```bash
find [path] [options] [expression]
```

If you omit the path, find searches the current directory. If you omit expressions, it matches everything (listing all files recursively).

```bash
# List all files in current directory recursively
find .

# List all files under /etc
find /etc

# List all files under /var/log
find /var/log
```

## Searching by Name

```bash
# Find a file by exact name
find /etc -name "nginx.conf"

# Case-insensitive name search
find /home -iname "readme.md"

# Wildcards in name
find /var/log -name "*.log"

# Find all files starting with 'access'
find /var/log -name "access*"

# Find files matching either pattern
find /etc -name "*.conf" -o -name "*.cfg"
```

## Searching by Type

```bash
# Only regular files
find /tmp -type f

# Only directories
find /var -type d

# Only symbolic links
find /usr/bin -type l

# Only block devices
find /dev -type b

# Only character devices
find /dev -type c
```

## Searching by Size

Size expressions use suffixes: `c` (bytes), `k` (kilobytes), `M` (megabytes), `G` (gigabytes). A `+` prefix means "larger than," `-` means "smaller than."

```bash
# Files larger than 100MB
find /var -type f -size +100M

# Files smaller than 1KB (empty or nearly empty)
find /tmp -type f -size -1k

# Files exactly 4096 bytes
find /etc -type f -size 4096c

# Large log files to investigate
find /var/log -type f -size +50M -ls
```

## Searching by Permissions

```bash
# Files with exactly 644 permissions
find /etc -type f -perm 644

# Files with SUID bit set (security audit)
find / -type f -perm -4000 -ls 2>/dev/null

# Files with SGID bit set
find / -type f -perm -2000 -ls 2>/dev/null

# Files writable by others (potentially dangerous)
find /etc -type f -perm -o+w -ls

# Directories writable by others but not sticky
find / -type d -perm -o+w ! -perm -1000 -ls 2>/dev/null
```

## Searching by Ownership

```bash
# Files owned by a specific user
find /home -user alice -type f

# Files owned by a specific group
find /srv -group devteam -type f

# Files with no valid owner (orphaned files - useful after deleting users)
find / -nouser -type f 2>/dev/null

# Files with no valid group
find / -nogroup -type f 2>/dev/null
```

## Searching by Time

Time criteria use days as units. `+N` means older than N days, `-N` means newer than N days, `N` means exactly N days.

There are three timestamps:
- `-mtime` - when file **content** was last modified
- `-atime` - when file was last **accessed** (read)
- `-ctime` - when file **metadata** (permissions, owner) was last changed

```bash
# Files modified in the last 24 hours
find /var/www -type f -mtime -1

# Files modified more than 30 days ago
find /tmp -type f -mtime +30

# Files accessed in the last 7 days
find /home/alice -type f -atime -7

# Files modified in the last 60 minutes
find /var/log -type f -mmin -60

# Recently changed config files (potential indicator of compromise)
find /etc -type f -mtime -1 -ls
```

## Depth Control

```bash
# Only search one level deep (direct children of /etc)
find /etc -maxdepth 1 -type f -name "*.conf"

# Skip the top-level directory, start from depth 2
find /etc -mindepth 2 -name "*.conf"

# Limit search depth to 3 levels
find /var -maxdepth 3 -type f -size +10M
```

## Executing Commands on Results

The `-exec` option runs a command on each found file. `{}` is replaced by the filename. The command must end with `\;` (or `+` to batch).

```bash
# List details of each found file
find /var/log -name "*.log" -exec ls -lh {} \;

# Delete files older than 30 days in /tmp
find /tmp -type f -mtime +30 -exec rm {} \;

# Change ownership of all files in a directory
find /srv/webapp -type f -exec chown deploy:www-data {} \;

# Fix permissions on all config files
find /etc/myapp -type f -exec chmod 644 {} \;
find /etc/myapp -type d -exec chmod 755 {} \;
```

### Using + instead of \; for efficiency

The `+` variant batches multiple files into a single command invocation (like xargs), which is much faster for large numbers of files:

```bash
# More efficient for many files
find /var/log -name "*.log" -exec ls -lh {} +

# Same effect, slower (one ls per file)
find /var/log -name "*.log" -exec ls -lh {} \;
```

### Using find with xargs

For more control over command execution:

```bash
# Delete old temp files (handles filenames with spaces correctly)
find /tmp -type f -mtime +30 -print0 | xargs -0 rm

# Grep through found files
find /var/www -name "*.php" -print0 | xargs -0 grep -l "eval("

# Count lines across multiple files
find /var/log -name "*.log" -print0 | xargs -0 wc -l
```

The `-print0` and `xargs -0` combination handles filenames containing spaces or newlines correctly.

## Combining Criteria

```bash
# Files in /tmp older than 7 days AND larger than 1MB
find /tmp -type f -mtime +7 -size +1M

# Config files NOT owned by root
find /etc -type f -name "*.conf" ! -user root -ls

# Log files modified today that are larger than 10MB
find /var/log -type f -name "*.log" -mtime -1 -size +10M

# Files with insecure permissions (writable by world) not in /proc or /sys
find / -type f -perm -o+w \
    ! -path "/proc/*" \
    ! -path "/sys/*" \
    ! -path "/dev/*" \
    -ls 2>/dev/null
```

## Pruning Directories

Skip certain directories during search with `-prune`:

```bash
# Search /home but skip the backups directory
find /home -path /home/backups -prune -o -name "*.log" -print

# Multiple prune targets
find / \
    -path /proc -prune \
    -o -path /sys -prune \
    -o -path /dev -prune \
    -o -type f -name "*.conf" -print
```

## Practical Recipes

```bash
# Find all files larger than 1GB to reclaim disk space
find / -xdev -type f -size +1G -printf "%s\t%p\n" | sort -rn | head -20

# Find recently modified files (last 10 minutes) - useful after deploys
find /var/www -type f -mmin -10

# Find empty files and directories
find /var -empty -ls

# Find duplicate named files (same name in different dirs)
find /etc -type f -name "*.conf" -printf "%f\n" | sort | uniq -d

# Disk usage by directory up to 2 levels
find /var -maxdepth 2 -type d -exec du -sh {} \; 2>/dev/null | sort -h
```

The `find` command rewards time spent learning it. The combination of precise filtering criteria and the ability to execute arbitrary commands on results makes it a Swiss Army knife for file system operations.
