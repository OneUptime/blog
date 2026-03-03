# How to Use lsof to Find Open Files and Network Connections on Ubuntu

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Ubuntu, Networking, Linux, System Administration, Debugging

Description: Learn how to use lsof on Ubuntu to list open files, find which process owns a network port, identify file descriptor leaks, and debug network connectivity issues.

---

`lsof` stands for "list open files" - and on Linux, nearly everything is a file: regular files, directories, sockets, pipes, devices, and more. This makes `lsof` one of the most versatile diagnostic tools available. When you need to know what a process has open, what's listening on a port, or why a disk won't unmount, `lsof` is usually the answer.

## Installing lsof

```bash
# Check if installed
which lsof

# Install if needed
sudo apt install lsof -y
```

## Basic Usage

Running `lsof` without arguments lists every open file on the system - usually thousands of entries. Use filters to narrow it down.

```bash
# All open files (requires root for complete output)
sudo lsof | head -20
```

Output format:

```text
COMMAND     PID   TID TASKCMD     USER   FD   TYPE DEVICE SIZE/OFF NODE NAME
systemd       1                   root  cwd    DIR    8,1     4096    2 /
systemd       1                   root  rtd    DIR    8,1     4096    2 /
nginx       1234                  www   mem    REG    8,1   195632  890 /lib/x86_64-linux-gnu/libssl.so.1.1
nginx       1234                  www    4u   IPv4  45678      0t0  TCP *:80 (LISTEN)
```

Key columns:
- `COMMAND` - Process name
- `PID` - Process ID
- `USER` - Owner
- `FD` - File descriptor type (cwd=current dir, txt=program text, mem=memory-mapped, 0u/1u/2u=stdin/stdout/stderr)
- `TYPE` - Type (REG=regular file, DIR=directory, CHR=character device, IPv4/IPv6=network socket)
- `NAME` - File path or network address

## Finding Files Opened by a Process

```bash
# List all files opened by PID 1234
lsof -p 1234

# List files opened by a process name
lsof -c nginx

# List files for multiple processes
lsof -c nginx -c apache2
```

## Finding the Process Using a File

```bash
# Who has /var/log/syslog open?
lsof /var/log/syslog

# Who has any file in /tmp open?
lsof +D /tmp

# Who is using a specific device?
lsof /dev/sda1
```

The `+D` option recursively searches a directory.

## Network Connections and Listening Ports

### Show All Network Connections

```bash
# All network connections (sockets)
sudo lsof -i

# All TCP connections
sudo lsof -i TCP

# All UDP connections
sudo lsof -i UDP

# All IPv4 connections
sudo lsof -i 4

# All IPv6 connections
sudo lsof -i 6
```

### Find What's Listening on a Port

```bash
# What's listening on port 80?
sudo lsof -i :80

# What's listening on port 443?
sudo lsof -i :443

# What's using port 5432 (PostgreSQL)?
sudo lsof -i :5432

# Show only LISTEN state
sudo lsof -i :8080 -s TCP:LISTEN
```

This is the most common use case: something is already using a port and a service fails to start. `lsof -i :PORT` tells you exactly which process owns it.

### Find Established Connections

```bash
# Show established TCP connections
sudo lsof -i TCP -s TCP:ESTABLISHED

# Connections to a specific remote host
sudo lsof -i @192.168.1.100

# Connections on a specific port in ESTABLISHED state
sudo lsof -i :443 -s TCP:ESTABLISHED
```

### Network Connection Summary

```bash
# Count connections by state
sudo lsof -i TCP | awk 'NR>1 {print $NF}' | sort | uniq -c | sort -rn
```

## File Descriptor Leak Detection

When a process leaks file descriptors, it eventually fails with "Too many open files":

```bash
# Check current FD limit for a process
cat /proc/$(pgrep myapp)/limits | grep "open files"

# Count FDs for each process, sorted by count
sudo lsof | awk 'NR>1 {print $1, $2}' | sort | uniq -c | sort -rn | head -20

# Count FDs for a specific process
lsof -p $(pgrep myapp) | wc -l

# Watch FD count for a leaking process
watch -n 2 "lsof -p $(pgrep myapp) | wc -l"
```

If the count grows continuously without stabilizing, the process is leaking file descriptors.

## Why Won't the Disk Unmount?

When `umount` fails with "device is busy":

```bash
# Find what's using the mount point
lsof /mnt/mydisk

# Or recursively
sudo lsof +D /mnt/mydisk
```

This shows exactly which process and user has files open on the filesystem. You can then either kill those processes or ask users to close their files.

```bash
# Get PIDs for everything using a mount point
sudo lsof +D /mnt/mydisk | awk 'NR>1 {print $2}' | sort -u
```

## Deleted Files Still Taking Space

A common gotcha: a log file is deleted but a process still has it open, so the disk space isn't freed until the process closes it (or is restarted).

```bash
# Find deleted files still held open
sudo lsof | grep "(deleted)"

# Find deleted files by type and size
sudo lsof | grep "(deleted)" | awk '{print $7, $1, $2, $9}' | sort -rn | head -20
```

This explains why disk space doesn't recover after deleting large log files. The fix is either restart the process holding the file open, or truncate the file in place:

```bash
# Truncate a file without deleting it (preserves open file handle)
> /var/log/largelogfile.log

# Or using truncate
truncate -s 0 /var/log/largelogfile.log
```

## Finding Files by User

```bash
# All files opened by user "www-data"
sudo lsof -u www-data

# All files opened by users other than root
sudo lsof -u ^root

# Network connections for a specific user
sudo lsof -u www-data -i
```

## Combining Filters

```bash
# Files opened by nginx on network connections
sudo lsof -c nginx -i

# TCP connections for a specific PID
sudo lsof -p 1234 -i TCP

# Files in /tmp opened by apache
sudo lsof -c apache2 +D /tmp
```

Note: multiple conditions are OR'd by default. Use `-a` to AND them:

```bash
# Files opened by nginx AND on network (AND, not OR)
sudo lsof -a -c nginx -i
```

## Watching lsof in Real Time

```bash
# Refresh every 2 seconds, show only network connections
watch -n 2 "sudo lsof -i TCP -s TCP:ESTABLISHED | head -30"

# Watch FD count for a specific process
watch -n 1 "sudo lsof -p $(pgrep myapp | head -1) | wc -l"
```

## Security Use Cases

Finding unexpected network listeners is a useful security check:

```bash
# All listening ports (look for anything unexpected)
sudo lsof -i -s TCP:LISTEN

# Listening on 0.0.0.0 (accessible from any interface)
sudo lsof -i -s TCP:LISTEN | grep "*:"

# Connections to unusual destinations
sudo lsof -i TCP -s TCP:ESTABLISHED | grep -v "localhost\|127.0.0.1\|192.168"
```

## Quick Reference Commands

```bash
# What's using port 8080?
sudo lsof -i :8080

# What files does PID 1234 have open?
lsof -p 1234

# Why can't I unmount /mnt/data?
sudo lsof +D /mnt/data

# Which process is eating file descriptors?
sudo lsof | awk 'NR>1 {print $2}' | sort | uniq -c | sort -rn | head -10

# What network connections does myapp have?
sudo lsof -c myapp -i

# Show all listening services
sudo lsof -i -s TCP:LISTEN
```

`lsof` is one of those tools that becomes more valuable the more you understand what it can show you. Network ports, file descriptor leaks, unmount failures, deleted-but-open files - all of these are problems that `lsof` diagnoses in seconds.
