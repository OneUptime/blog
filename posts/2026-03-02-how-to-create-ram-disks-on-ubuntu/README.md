# How to Create RAM Disks on Ubuntu

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Ubuntu, Performance, Storage, System Administration

Description: Learn how to create and manage RAM disks on Ubuntu using tmpfs and ramfs to improve I/O performance for temporary files and high-speed workloads.

---

A RAM disk is a portion of system memory exposed as a filesystem. Because RAM operates several orders of magnitude faster than even the fastest NVMe SSD - with no seek time, no rotational latency, and throughput measured in tens of GB/s - a RAM disk is the right tool when you need the absolute fastest possible disk I/O. Common use cases include build systems that generate many temporary files, test runners that write and read many small files, database sort operations, video processing pipelines, and any workload where filesystem I/O is a bottleneck.

Ubuntu supports two approaches: `tmpfs` and `ramfs`. Understanding the difference matters for choosing the right one.

## tmpfs vs ramfs

### tmpfs

`tmpfs` is the recommended choice for almost all use cases:

- Has a configurable size limit
- Can swap to disk when RAM is under pressure (contents may be evicted)
- Shows accurate disk usage via `df`
- Supports extended attributes and POSIX ACLs

### ramfs

`ramfs` is simpler and older:

- No size limit - it grows as files are added
- Never swaps - contents always stay in RAM
- Does not report accurate size via `df`
- Risk of OOM (Out of Memory) if a process fills it unexpectedly

For most purposes, use `tmpfs` with an explicit size limit. Use `ramfs` only if you absolutely cannot afford any swap and understand the OOM risk.

## Creating a tmpfs RAM Disk

### Temporary Mount (Lost on Reboot)

```bash
# Create a mount point
sudo mkdir -p /mnt/ramdisk

# Mount a 2GB tmpfs RAM disk
sudo mount -t tmpfs -o size=2g tmpfs /mnt/ramdisk

# Verify it is mounted
df -h /mnt/ramdisk
```

Output:

```
Filesystem      Size  Used Avail Use% Mounted on
tmpfs           2.0G     0  2.0G   0% /mnt/ramdisk
```

```bash
# Verify it is fast - write 1GB of zeros and measure throughput
dd if=/dev/zero of=/mnt/ramdisk/testfile bs=1M count=1024 conv=fsync
```

### Specifying Additional Mount Options

```bash
# Mount with specific permissions and noexec for security
sudo mount -t tmpfs \
    -o size=4g,mode=1777,uid=1000,gid=1000,noexec,nosuid \
    tmpfs /mnt/ramdisk
```

Common options:

| Option | Effect |
|--------|--------|
| `size=Ng` | Maximum size in gigabytes (e.g., `2g`, `512m`) |
| `size=N%` | Maximum size as percentage of RAM (e.g., `25%`) |
| `mode=1777` | Permissions on the mount point (sticky + world writable) |
| `uid=N` | Owner user ID |
| `gid=N` | Owner group ID |
| `noexec` | Prevent execution of binaries from this filesystem |
| `nosuid` | Ignore setuid bits |
| `nr_inodes=N` | Limit number of inodes (files/directories) |

### Unmounting

```bash
# Unmount the RAM disk (all data is lost)
sudo umount /mnt/ramdisk
```

## Making a tmpfs RAM Disk Persistent Across Reboots

Add an entry to `/etc/fstab` to automatically mount the RAM disk at boot:

```bash
sudo nano /etc/fstab
```

Add this line:

```
# RAM disk for temporary build files - 4GB limit
tmpfs   /mnt/ramdisk   tmpfs   size=4g,mode=1777,noexec,nosuid   0   0
```

Test the fstab entry without rebooting:

```bash
sudo mount -a

# Verify
df -h /mnt/ramdisk
```

## Use Case: Build System Acceleration

C/C++ and Rust builds generate enormous numbers of intermediate object files. Moving the build temporary directory to a RAM disk dramatically reduces build times on systems with sufficient RAM:

```bash
# Set up a build RAM disk
sudo mkdir -p /mnt/build-ramdisk
sudo mount -t tmpfs -o size=8g tmpfs /mnt/build-ramdisk
sudo chown $(id -u):$(id -g) /mnt/build-ramdisk

# Build a project using the RAM disk for temporary files
cd /path/to/project

# For CMake projects, use the RAM disk as the build directory
cmake -B /mnt/build-ramdisk/my-project-build -S .
cmake --build /mnt/build-ramdisk/my-project-build --parallel $(nproc)
```

For Rust projects:

```bash
# Set CARGO_TARGET_DIR to use the RAM disk
export CARGO_TARGET_DIR=/mnt/build-ramdisk/cargo-target
cargo build --release
```

For Maven/Java:

```bash
# Use RAM disk as Maven local repository for CI
mvn package -Dmaven.repo.local=/mnt/build-ramdisk/maven-repo
```

## Use Case: Database Temporary Files

PostgreSQL and MySQL perform sort operations and join operations using temporary files. Moving the temp directory to a RAM disk speeds up queries involving large sorts:

### PostgreSQL

```bash
# Create a temp directory on the RAM disk
sudo mkdir -p /mnt/ramdisk/pg_tmp
sudo chown postgres:postgres /mnt/ramdisk/pg_tmp

# Edit PostgreSQL configuration
sudo nano /etc/postgresql/14/main/postgresql.conf
```

```ini
# Use RAM disk for temporary files
temp_tablespaces = 'pg_ram_tmp'
```

```sql
-- Create the tablespace in PostgreSQL
CREATE TABLESPACE pg_ram_tmp LOCATION '/mnt/ramdisk/pg_tmp';
```

Note: The tablespace directory is wiped on reboot. Add a startup script or systemd service to recreate the directory and reassign permissions before PostgreSQL starts.

### MySQL / MariaDB

```bash
# Edit MySQL configuration
sudo nano /etc/mysql/mysql.conf.d/mysqld.cnf
```

```ini
[mysqld]
# Move temporary directory to RAM disk
tmpdir = /mnt/ramdisk/mysql_tmp
```

```bash
sudo mkdir -p /mnt/ramdisk/mysql_tmp
sudo chown mysql:mysql /mnt/ramdisk/mysql_tmp
sudo systemctl restart mysql
```

## Use Case: Test Suite Acceleration

For applications with large test suites that write many files:

```bash
# Create a test-specific RAM disk
sudo mkdir -p /mnt/test-ramdisk
sudo mount -t tmpfs -o size=2g,mode=777 tmpfs /mnt/test-ramdisk

# Run tests with temp directory on RAM disk
TMPDIR=/mnt/test-ramdisk pytest tests/ -n auto

# Node.js Jest tests
TMPDIR=/mnt/test-ramdisk npx jest --runInBand

# Ruby RSpec
TMPDIR=/mnt/test-ramdisk bundle exec rspec
```

## Using ramfs When You Need No Swap

For applications where you absolutely cannot afford the latency of swap - for example, a high-frequency data processor or real-time system - use `ramfs`:

```bash
# Create a ramfs mount (no size limit - use with caution)
sudo mkdir -p /mnt/ramfs
sudo mount -t ramfs -o mode=1777 ramfs /mnt/ramfs
```

Since ramfs has no size limit, always monitor memory usage when using it:

```bash
# Watch memory usage while working with ramfs
watch -n 1 'free -h && df -h /mnt/ramfs 2>/dev/null || echo "ramfs: check with ls -la /mnt/ramfs"'
```

## Systemd RAM Disk with tmpfs Mount Unit

A cleaner alternative to fstab for managing RAM disks as services:

```bash
sudo nano /etc/systemd/system/mnt-ramdisk.mount
```

```ini
[Unit]
Description=RAM Disk for build artifacts
DefaultDependencies=no
Before=local-fs.target

[Mount]
What=tmpfs
Where=/mnt/ramdisk
Type=tmpfs
Options=size=4g,mode=1777,noexec,nosuid

[Install]
WantedBy=local-fs.target
```

```bash
sudo systemctl daemon-reload
sudo systemctl enable --now mnt-ramdisk.mount
sudo systemctl status mnt-ramdisk.mount
```

The mount unit approach integrates cleanly with systemd dependencies, allowing you to specify that your application service starts only after the RAM disk is mounted.

## Monitoring RAM Disk Usage

Since tmpfs uses actual system memory, monitor its consumption:

```bash
# Show all tmpfs mounts and their usage
df -h -t tmpfs

# Check how much RAM is currently used by all tmpfs mounts
cat /proc/meminfo | grep -E 'MemTotal|MemFree|MemAvailable|Cached|Buffers'

# Detailed memory breakdown including tmpfs
smem -t -k | head -5
```

For production servers, alert when RAM disk usage exceeds a threshold. Tools like [OneUptime](https://oneuptime.com) can monitor custom metrics from scripts that check `df` output against configured thresholds.

## Cleaning Up

```bash
# Remove files from RAM disk to free memory
rm -rf /mnt/ramdisk/*

# Unmount when no longer needed
sudo umount /mnt/ramdisk

# Remove the directory if desired
sudo rmdir /mnt/ramdisk
```

## Summary

RAM disks on Ubuntu are straightforward to create using `tmpfs` and provide filesystem I/O at memory speeds. Use them for build systems, test suites, database temporary files, or any workload where disk I/O latency is a bottleneck. Always use `tmpfs` over `ramfs` unless you have a specific reason not to, set explicit size limits, and monitor memory consumption to avoid starving your system. For persistent RAM disks, use `/etc/fstab` or a systemd mount unit to recreate them at boot.
