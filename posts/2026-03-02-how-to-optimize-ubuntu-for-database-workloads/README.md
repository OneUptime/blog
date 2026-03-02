# How to Optimize Ubuntu for Database Workloads

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Ubuntu, Database, Performance Tuning, PostgreSQL, MySQL

Description: Tune Ubuntu kernel parameters, storage settings, and memory management for database workloads to improve query performance, reduce latency, and maximize throughput.

---

Database servers have specific performance requirements that differ from web servers or general-purpose systems. A database workload is typically characterized by high random I/O, large working sets in memory, many concurrent connections, and sensitivity to latency spikes. Ubuntu's default kernel settings are conservative and optimized for general use - not for running PostgreSQL or MySQL at full performance. A properly tuned Ubuntu database server can show 2-5x performance improvement over a default installation.

## Disable Transparent Huge Pages

The most impactful single change for database performance. THP causes intermittent latency spikes as the kernel coalesces memory pages:

```bash
# Check current THP status
cat /sys/kernel/mm/transparent_hugepage/enabled
cat /sys/kernel/mm/transparent_hugepage/defrag

# Disable THP immediately
echo never | sudo tee /sys/kernel/mm/transparent_hugepage/enabled
echo never | sudo tee /sys/kernel/mm/transparent_hugepage/defrag

# Disable THP at boot via systemd
cat << 'EOF' | sudo tee /etc/systemd/system/disable-thp.service
[Unit]
Description=Disable Transparent Huge Pages (THP)
After=network.target

[Service]
Type=simple
ExecStart=/bin/sh -c 'echo never > /sys/kernel/mm/transparent_hugepage/enabled && echo never > /sys/kernel/mm/transparent_hugepage/defrag'

[Install]
WantedBy=multi-user.target
EOF

sudo systemctl enable --now disable-thp.service
```

Both MongoDB and PostgreSQL documentation explicitly recommend disabling THP.

## Configure Kernel Memory Parameters

```bash
sudo nano /etc/sysctl.d/99-database.conf
```

```ini
# /etc/sysctl.d/99-database.conf - Database server tuning

# ---- Virtual Memory ----

# Minimize swapping - databases need RAM, not swap
# 1 = only swap when absolutely necessary
vm.swappiness = 1

# Ratio of dirty pages before writeback starts (% of total memory)
# Lower values mean more frequent, smaller writes - better for databases
vm.dirty_ratio = 15
vm.dirty_background_ratio = 5

# How often kswapd reclaims memory (centiseconds)
vm.vfs_cache_pressure = 50

# Maximum amount of memory (bytes) that can be used for shared memory
# Set to match or exceed your database's shared_buffers setting
# Example: 8GB = 8589934592
kernel.shmmax = 17179869184
kernel.shmall = 4194304

# Overcommit strategy: 2 = never overcommit beyond (CommitLimit = swap + RAM * overcommit_ratio/100)
# Some databases prefer this; others prefer 1 (always overcommit)
# PostgreSQL recommends 2:
vm.overcommit_memory = 2
vm.overcommit_ratio = 80

# ---- File System ----

# Increase file descriptor limits
fs.file-max = 1000000

# ---- Network (for database replication/connections) ----
net.core.somaxconn = 65535
net.ipv4.tcp_max_syn_backlog = 8192
net.core.netdev_max_backlog = 5000

# TCP keepalive for long-lived database connections
net.ipv4.tcp_keepalive_time = 300
net.ipv4.tcp_keepalive_intvl = 30
net.ipv4.tcp_keepalive_probes = 3
```

Apply the settings:

```bash
sudo sysctl --system
```

## Set Appropriate ulimits

Database processes need high file descriptor and process limits:

```bash
# For the database user (e.g., postgres or mysql)
cat << 'EOF' | sudo tee /etc/security/limits.d/99-database.conf
# /etc/security/limits.d/99-database.conf

# PostgreSQL limits
postgres         soft    nofile          65536
postgres         hard    nofile          65536
postgres         soft    nproc           65536
postgres         hard    nproc           65536

# MySQL/MariaDB limits
mysql            soft    nofile          65536
mysql            hard    nofile          65536

# Generic database user
*                soft    nofile          65536
*                hard    nofile          65536
EOF

# For systemd-managed services, also configure in the unit file:
sudo systemctl edit postgresql
# Add:
# [Service]
# LimitNOFILE=65536
# LimitNPROC=65536
```

## Tune I/O Scheduler

For database workloads on NVMe or SSD, the `none` (no-op) scheduler is optimal. For HDDs, use `mq-deadline`:

```bash
# Check current scheduler per device
cat /sys/block/sda/queue/scheduler
cat /sys/block/nvme0n1/queue/scheduler

# For NVMe (already uses none by default, but verify)
echo none | sudo tee /sys/block/nvme0n1/queue/scheduler

# For SAS/SATA SSDs
echo mq-deadline | sudo tee /sys/block/sda/queue/scheduler

# Make persistent with udev rules
cat << 'EOF' | sudo tee /etc/udev/rules.d/60-io-scheduler.rules
# NVMe - no scheduler
ACTION=="add|change", KERNEL=="nvme[0-9]*", ATTR{queue/scheduler}="none"

# SSDs (rotational=0 non-NVMe)
ACTION=="add|change", KERNEL=="sd[a-z]", ATTR{queue/rotational}=="0", ATTR{queue/scheduler}="mq-deadline"

# HDDs
ACTION=="add|change", KERNEL=="sd[a-z]", ATTR{queue/rotational}=="1", ATTR{queue/scheduler}="mq-deadline"
EOF
```

## Adjust Queue Depth and Read-Ahead

```bash
# Increase disk queue depth for NVMe (supports high queue depth)
echo 1024 | sudo tee /sys/block/nvme0n1/queue/nr_requests

# Disable read-ahead for random I/O workloads (databases mostly do random I/O)
# 0 = no readahead (better for OLTP)
blockdev --setra 0 /dev/nvme0n1

# For sequential workloads (data warehousing), keep some readahead
# blockdev --setra 256 /dev/nvme0n1

# Make read-ahead persistent
cat << 'EOF' | sudo tee /etc/udev/rules.d/61-readahead.rules
# Disable readahead for NVMe (random I/O database workloads)
ACTION=="add|change", KERNEL=="nvme[0-9]*", RUN+="/sbin/blockdev --setra 0 /dev/%k"
EOF
```

## NUMA Configuration

For multi-socket servers, NUMA topology matters significantly:

```bash
# Check NUMA topology
numactl --hardware
lscpu | grep -E "NUMA|Socket"

# For PostgreSQL, bind it to a single NUMA node to avoid cross-socket memory access
# In PostgreSQL service override:
sudo systemctl edit postgresql

# Add:
# [Service]
# ExecStart=
# ExecStart=/usr/bin/numactl --cpunodebind=0 --membind=0 /usr/lib/postgresql/16/bin/postgres -D /var/lib/postgresql/16/main

# Alternatively, interleave memory across NUMA nodes (better for mixed workloads)
# ExecStart=/usr/bin/numactl --interleave=all /usr/lib/postgresql/16/bin/postgres ...
```

## Filesystem Options for Database Directories

```bash
# For databases on XFS (recommended for large files)
# Mount with noatime and appropriate log stripe settings
# Add to /etc/fstab:
# /dev/nvme0n1 /var/lib/postgresql xfs defaults,noatime,nodiratime,logbsize=256k,nobarrier 0 0

# For ext4
# /dev/nvme0n1 /var/lib/postgresql ext4 defaults,noatime,nodiratime,data=ordered,barrier=0 0 0

# Note: only disable barrier if you have a UPS (battery-backed write cache)
# Disabling barrier without battery protection risks data corruption on power loss
```

## CPU Performance Governor

```bash
# Ensure CPU is in performance mode, not power-saving
# Install cpufrequtils
sudo apt install cpufrequtils -y

# Check current governor
cat /sys/devices/system/cpu/cpu0/cpufreq/scaling_governor

# Set all CPUs to performance mode
echo performance | sudo tee /sys/devices/system/cpu/cpu*/cpufreq/scaling_governor

# Make persistent
echo 'GOVERNOR="performance"' | sudo tee /etc/default/cpufrequtils
sudo systemctl restart cpufrequtils

# Also set via grub for kernel boot parameter
# Add to GRUB_CMDLINE_LINUX_DEFAULT in /etc/default/grub:
# intel_pstate=disable  (then use acpi-cpufreq governor)
# or
# intel_pstate=active   (use intel_pstate with performance hint)
```

## Huge Pages for Shared Memory (PostgreSQL)

THP should be disabled (done above), but explicit huge pages for PostgreSQL's shared memory can improve performance:

```bash
# Calculate how many 2MB huge pages PostgreSQL needs
# shared_buffers / 2MB = huge pages needed
# If shared_buffers = 8GB: 8192 MB / 2 = 4096 pages

# Set the number of huge pages
echo 4096 | sudo tee /proc/sys/vm/nr_hugepages

# Make persistent in sysctl
echo "vm.nr_hugepages = 4096" | sudo tee -a /etc/sysctl.d/99-database.conf
sudo sysctl --system

# Verify huge pages are available
cat /proc/meminfo | grep HugePage

# In PostgreSQL, enable huge pages
# In postgresql.conf: huge_pages = on
```

## Power Management

```bash
# Disable CPU C-states for lowest latency (at cost of power consumption)
# Add to GRUB_CMDLINE_LINUX_DEFAULT in /etc/default/grub:
# intel_idle.max_cstate=1 processor.max_cstate=1

sudo nano /etc/default/grub
# GRUB_CMDLINE_LINUX_DEFAULT="quiet splash intel_idle.max_cstate=1"

sudo update-grub

# Disable CPU frequency scaling
cat << 'EOF' | sudo tee /etc/rc.local
#!/bin/bash
# Disable CPU C-states for database server
for cpu in /sys/devices/system/cpu/cpu*/power/energy_perf_bias; do
    echo 0 > $cpu 2>/dev/null
done
exit 0
EOF
sudo chmod +x /etc/rc.local
```

## Validating Tuning Impact

```bash
# Benchmark disk I/O before and after tuning
sudo apt install fio -y

# Random read IOPS test (simulates OLTP workload)
sudo fio --name=db-test \
    --filename=/var/lib/postgresql/test-file \
    --rw=randrw --rwmixread=70 \
    --bs=8k --direct=1 \
    --numjobs=8 --size=4G \
    --time_based --runtime=60 \
    --group_reporting \
    --ioengine=libaio --iodepth=32

# Record baseline metrics
cat /proc/meminfo | grep -E "HugePages|Swap|Dirty"
cat /proc/sys/vm/swappiness
sudo iostat -xz 1 5
```

These tuning steps, applied together, significantly reduce query latency variance and improve throughput for both OLTP and analytical database workloads. The biggest gains typically come from disabling THP, reducing swappiness, and ensuring the I/O scheduler matches your storage type.
