# How to Set Up systemd Resource Control with MemoryMax on Ubuntu

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Ubuntu, systemd, Resource Control, Memory Management, System Administration

Description: Configure systemd resource control directives on Ubuntu to limit memory, CPU, and I/O usage for services using MemoryMax, CPUQuota, and cgroup-based controls.

---

systemd integrates with Linux control groups (cgroups) to enforce resource limits on services. Without limits, a single runaway process can exhaust memory and crash the entire system. With systemd's resource control directives, you define ceilings for memory consumption, CPU time, disk I/O bandwidth, and other resources - and the kernel enforces them.

This guide focuses on memory limits (MemoryMax) as the most critical resource to control, alongside practical examples of CPU and I/O limits.

## Understanding Cgroup Resource Control

When you set resource limits in a systemd unit, systemd creates a cgroup for the service and writes the limits to the cgroup's control files. The kernel enforces these limits transparently - you do not need to modify the application.

Key memory control directives:

| Directive | Behavior |
|-----------|----------|
| `MemoryMin` | Minimum memory that will not be reclaimed under pressure |
| `MemoryLow` | Soft protection - prefer reclaiming other memory first |
| `MemoryHigh` | Soft limit - process is throttled when exceeded |
| `MemoryMax` | Hard limit - triggers OOM killer when exceeded |
| `MemorySwapMax` | Maximum swap usage |

The distinction between `MemoryHigh` and `MemoryMax` is important:

- `MemoryHigh` is a throttle point - when the service exceeds this, the kernel starts returning memory more aggressively to the cgroup but does not kill processes
- `MemoryMax` is a hard ceiling - exceeding this triggers the OOM killer within the cgroup, typically killing the service's main process

## Setting MemoryMax

Set a hard memory limit for a service:

```bash
# Create a drop-in override (preferred over editing the unit file directly)
sudo mkdir -p /etc/systemd/system/myservice.service.d/
sudo nano /etc/systemd/system/myservice.service.d/resources.conf
```

```ini
[Service]
# Hard limit - OOM killer triggers at 512MB
MemoryMax=512M

# Soft limit - throttle at 400MB before hard limit
MemoryHigh=400M

# Protect 100MB from memory pressure (kernel won't reclaim this)
MemoryMin=100M
```

Apply the changes:

```bash
sudo systemctl daemon-reload
sudo systemctl restart myservice
```

### Value Formats

Memory values accept several formats:

```ini
# Absolute values
MemoryMax=512M     # 512 megabytes
MemoryMax=2G       # 2 gigabytes
MemoryMax=1073741824  # bytes

# Percentage of total RAM
MemoryMax=25%

# Infinity (no limit - useful to explicitly clear inherited limits)
MemoryMax=infinity
```

## Verifying Resource Limits

### Using systemctl show

```bash
# Show all resource-related settings for a service
systemctl show myservice.service | grep -E "Memory|CPU|IO|Tasks"

# Or show specific properties
systemctl show myservice.service -p MemoryMax -p MemoryHigh -p MemoryCurrent
```

### Reading Cgroup Files Directly

```bash
# Find the cgroup for a service
CGROUP=$(systemctl show myservice.service -p ControlGroup | cut -d= -f2)
echo $CGROUP

# Read the memory limit from cgroup v2
cat /sys/fs/cgroup${CGROUP}/memory.max

# Check current memory usage
cat /sys/fs/cgroup${CGROUP}/memory.current

# Check memory.high
cat /sys/fs/cgroup${CGROUP}/memory.high
```

### Using systemd-cgtop

```bash
# Live view of cgroup resource usage (like top, but for cgroups)
sudo systemd-cgtop

# Show only memory metrics
sudo systemd-cgtop -m
```

## CPU Limits

### CPUQuota

Limits the CPU time the service can consume, expressed as a percentage of one CPU:

```ini
[Service]
# Allow at most 50% of one CPU core
CPUQuota=50%

# Allow up to 200% (equivalent to 2 full CPU cores)
CPUQuota=200%
```

CPUQuota=100% means one full CPU. On a 4-core system, CPUQuota=400% would allow using all four cores.

### CPUWeight

Relative weight for CPU scheduling (replaces the older CPUShares):

```ini
[Service]
# Default weight is 100
# Higher weight = higher priority for CPU time
CPUWeight=200   # Higher priority service
```

CPUWeight=50 means the service gets half the CPU time of a default-weight service when both are competing.

### CPUSchedulingPolicy and CPUSchedulingPriority

For real-time scheduling:

```ini
[Service]
# Real-time scheduling policies: other, batch, idle, fifo, rr
CPUSchedulingPolicy=fifo
CPUSchedulingPriority=50  # 1-99 for fifo and rr
```

### A Practical CPU Limit Example

A web scraper that should not monopolize the CPU:

```ini
[Unit]
Description=Web Scraper Service
After=network.target

[Service]
Type=simple
User=scraper

# Limit CPU to 30% of one core
CPUQuota=30%

# Give lower scheduling weight when competing with other services
CPUWeight=50

ExecStart=/usr/local/bin/scraper
Restart=on-failure
```

## I/O Limits

### IOWeight

Relative I/O weight (cgroup v2 only):

```ini
[Service]
# Default weight is 100
# Lower weight = lower I/O priority
IOWeight=25
```

### IOReadBandwidthMax and IOWriteBandwidthMax

Hard limits on I/O bandwidth:

```ini
[Service]
# Limit reads to 50MB/s from /dev/sda
IOReadBandwidthMax=/dev/sda 50M

# Limit writes to 20MB/s to /dev/sda
IOWriteBandwidthMax=/dev/sda 20M
```

### IOReadIOPSMax and IOWriteIOPSMax

Limit I/O operations per second:

```ini
[Service]
# Max 1000 read IOPS from the device
IOReadIOPSMax=/dev/sda 1000

# Max 500 write IOPS
IOWriteIOPSMax=/dev/sda 500
```

## Task Limits

Limit the number of tasks (threads and processes) the service can create:

```ini
[Service]
# Maximum number of processes/threads
TasksMax=50
```

This prevents fork bombs and runaway thread creation from consuming system process table entries.

## A Comprehensive Resource-Limited Service Example

A background processing service with balanced limits:

```bash
sudo nano /etc/systemd/system/batch-processor.service
```

```ini
[Unit]
Description=Batch Data Processor
After=network.target

[Service]
Type=simple
User=batchuser
Group=batchuser

# Resource limits
# Memory: throttle at 1GB, hard limit at 1.5GB
MemoryHigh=1G
MemoryMax=1500M
# Protect at least 256MB during memory pressure
MemoryMin=256M
# Limit swap usage
MemorySwapMax=512M

# CPU: use at most 100% of one core (won't hog multi-core system)
CPUQuota=100%
CPUWeight=50

# I/O: gentle limits so it does not starve other services
IOWeight=25
IOWriteBandwidthMax=/dev/sda 50M
IOReadBandwidthMax=/dev/sda 100M

# Process count limit
TasksMax=64

# Filesystem protection (combined with resource limits)
ProtectSystem=strict
ProtectHome=true
StateDirectory=batch-processor
LogsDirectory=batch-processor

ExecStart=/usr/local/bin/batch-processor
Restart=on-failure
RestartSec=10s

[Install]
WantedBy=multi-user.target
```

## Monitoring Resource Usage

### Using journalctl

When a service is OOM-killed due to hitting MemoryMax:

```bash
# Look for OOM events in the journal
sudo journalctl -k | grep -i "oom\|killed\|out of memory"

# Check if a specific service was OOM-killed
sudo journalctl -u myservice | grep -i "killed\|oom"
```

### Creating a Monitoring Script

```bash
#!/bin/bash
# /usr/local/bin/service-resources.sh
# Show resource usage for all services with limits

echo "Service Resource Usage"
echo "====================="
printf "%-40s %10s %10s %10s\n" "SERVICE" "MEM_CURR" "MEM_HIGH" "MEM_MAX"
echo "---"

systemctl list-units --type=service --state=running --no-legend | \
while read unit rest; do
    MEM_CURR=$(systemctl show "$unit" -p MemoryCurrent | cut -d= -f2)
    MEM_HIGH=$(systemctl show "$unit" -p MemoryHigh | cut -d= -f2)
    MEM_MAX=$(systemctl show "$unit" -p MemoryMax | cut -d= -f2)

    if [ "$MEM_MAX" != "infinity" ]; then
        # Convert to MB for readability
        MEM_MB=$(( MEM_CURR / 1048576 ))
        printf "%-40s %10sMB %10s %10s\n" \
            "${unit}" "$MEM_MB" "$MEM_HIGH" "$MEM_MAX"
    fi
done
```

## Setting System-Wide Defaults

For services that should share a pool of resources, use slices:

```bash
sudo nano /etc/systemd/system/batch.slice
```

```ini
[Unit]
Description=Batch Processing Slice

[Slice]
# All services in this slice share a memory limit
MemoryMax=4G
CPUQuota=200%
```

Assign services to this slice:

```ini
[Service]
Slice=batch.slice
```

Multiple services sharing the `batch.slice` collectively cannot exceed 4GB of memory or 200% CPU.

## Summary

systemd's resource control directives provide kernel-enforced limits on service memory, CPU, I/O, and process counts through cgroup integration. The most important directive for stability is `MemoryMax` - setting it prevents a single service from triggering an out-of-memory condition across the system. Use `MemoryHigh` alongside it to create a buffer zone where the service is throttled before hitting the hard limit. Apply limits via drop-in override files to keep changes separate from package-managed unit files. The `systemd-cgtop` command provides live visibility into actual resource consumption per cgroup, making it easy to calibrate limits against observed usage.
