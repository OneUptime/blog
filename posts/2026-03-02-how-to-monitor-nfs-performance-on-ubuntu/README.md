# How to Monitor NFS Performance on Ubuntu

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Ubuntu, NFS, Performance, Monitoring, Linux

Description: Monitor NFS performance on Ubuntu using nfsstat, mountstats, iostat, and other tools to identify bottlenecks, measure throughput, and diagnose latency issues.

---

NFS performance problems show up in different ways: slow file access, hung processes, high retransmit rates, or saturated network bandwidth. The Linux kernel and NFS client/server daemons expose detailed statistics that help pinpoint exactly where the bottleneck is. This guide covers the tools and metrics that matter.

## Understanding NFS Performance Metrics

Before diving into tools, understand what to measure:

- **Throughput:** How much data is transferred per second
- **Latency:** How long individual operations take (open, read, write, stat)
- **Retransmits:** How often the client must resend requests (indicates packet loss or server overload)
- **Queue depth:** How many operations are waiting
- **Cache hit rate:** How often the client serves data from cache vs. contacting the server

## nfsstat - The Primary NFS Statistics Tool

`nfsstat` reads statistics from the kernel and displays them in human-readable form.

```bash
# Install nfs-common if not present
sudo apt install nfs-common -y

# Show client-side statistics
nfsstat -c

# Show server-side statistics
nfsstat -s

# Show statistics for mounted filesystems
nfsstat -m

# Clear statistics (useful for baseline testing)
sudo nfsstat -z
```

### Interpreting Client Statistics

```bash
nfsstat -c
```

Example output:
```
Client rpc stats:
calls      retrans    authrefrsh
1892736    42         12

Client nfs v4:
null         read         write        commit
0         0  1642    0%  281453  14%  34521   1%
...
```

Key metrics:
- **retrans:** Retransmitted RPC calls. Should be near 0. Rising retransmits indicate network packet loss or server overload.
- **calls:** Total RPC calls made. Helps calculate ratios.
- **read/write percentages:** Shows the mix of read vs. write operations.

### Watching Statistics in Real Time

```bash
# Watch statistics update every 2 seconds
watch -n 2 'nfsstat -c'

# Or use nfsstat's built-in interval mode (if supported)
nfsstat -c 2  # update every 2 seconds
```

## mountstats - Detailed Per-Mount Statistics

`mountstats` provides the most detailed per-mount NFS statistics, including operation latency and byte counts.

```bash
# Install nfs-utils for mountstats
sudo apt install nfs-common -y

# Show statistics for all NFS mounts
mountstats

# Show statistics for a specific mount
mountstats /mnt/nfs/data

# Show detailed event statistics
mountstats --nfs /mnt/nfs/data
```

The output includes:

```
Stats for /mnt/nfs/data mounted using NFSv4.1 on nfsclient:
  NFS byte counts:
    app read bytes: 512000000
    app write bytes: 128000000
    ops read bytes: 514000000
    ops write bytes: 130000000

  RPC statistics:
    699 ops, 0 retransmits, 0 authRefresh
    avg bytes sent per op: 156
    avg bytes received per op: 1476

  Per-op statistics
              op       ops    rtt(ms)  execute(ms)
           READ       234      1.23       1.45
          WRITE       142      5.67       8.12
          CLOSE       189      0.89       1.02
    GETATTR          8432      0.34       0.45
```

The `rtt` (round-trip time) and `execute` times per operation are the most useful for diagnosing latency. If READ operations have high execute times, the bottleneck is server-side (disk or CPU). If rtt is high but execute is normal, the bottleneck is network.

### Analyzing mountstats Output

```bash
# Get a formatted summary
mountstats --rpc /mnt/nfs/data

# Compare two snapshots to see changes over time
mountstats --since /tmp/nfs-baseline.stats /mnt/nfs/data
# (save a baseline first)
mountstats --dump /tmp/nfs-baseline.stats
```

## Benchmarking NFS Throughput

Test raw NFS throughput to establish a baseline:

```bash
# Write test: sequential write
dd if=/dev/zero of=/mnt/nfs/data/testwrite bs=1M count=1000 oflag=direct
# Expected on gigabit network: 80-100 MB/s

# Read test: sequential read (after flushing local cache)
# Drop caches first (on the NFS server, not client)
sudo sh -c 'echo 3 > /proc/sys/vm/drop_caches'
dd if=/mnt/nfs/data/testwrite of=/dev/null bs=1M iflag=direct
# Expected on gigabit network: 80-100 MB/s

# Clean up the test file
rm /mnt/nfs/data/testwrite

# Small file throughput test (metadata intensive)
time for i in $(seq 1 1000); do touch /mnt/nfs/data/file_$i; done
time ls /mnt/nfs/data/file_* | wc -l
time rm /mnt/nfs/data/file_*
```

For more rigorous benchmarking, use `fio`:

```bash
# Install fio
sudo apt install fio -y

# Random read test on NFS mount
fio --name=nfs-randread --filename=/mnt/nfs/data/fio-test \
    --rw=randread --bs=4k --size=1G --numjobs=4 \
    --time_based --runtime=60 --group_reporting

# Sequential write test
fio --name=nfs-seqwrite --filename=/mnt/nfs/data/fio-test \
    --rw=write --bs=1M --size=4G --numjobs=1 \
    --time_based --runtime=60 --group_reporting

rm /mnt/nfs/data/fio-test
```

## Network Monitoring for NFS

NFS performance is bounded by network performance:

```bash
# Monitor network interface statistics
watch -n 1 'ip -s link show eth0'

# Or use ifstat
sudo apt install ifstat -y
ifstat 1  # update every second

# Check network errors
ip -s link show eth0 | grep -A 5 "RX errors\|TX errors"
```

Watch for:
- **errors:** Packet errors indicate hardware or cable issues
- **dropped:** Packets dropped by the OS due to buffer overflow
- **overrun:** Hardware ring buffer overflow

```bash
# Check for TCP retransmissions (relevant for NFS over TCP)
ss -s
netstat -s | grep -i retransmit

# Monitor with iftop (per-connection bandwidth)
sudo apt install iftop -y
sudo iftop -i eth0 -f "port 2049"  # filter for NFS traffic
```

## Server-Side NFS Monitoring

On the NFS server, monitor the server daemon's activity:

```bash
# Server-side NFS statistics
nfsstat -s

# Monitor RPC queue depth (server threads)
cat /proc/fs/nfsd/threads

# Increase server threads if RPC queue is backing up
sudo nano /etc/default/nfs-kernel-server
# RPCNFSDCOUNT=16  # increase from default 8
sudo systemctl restart nfs-kernel-server

# Check NFS server debug information
cat /proc/fs/nfsd/stats
```

Monitor server I/O:

```bash
# Install sysstat
sudo apt install sysstat -y

# Watch disk I/O on the NFS server
iostat -x 2  # update every 2 seconds

# Key columns:
# %util: disk utilization (close to 100% = disk saturated)
# await: average wait time per I/O (ms)
# r/s, w/s: reads and writes per second
```

## Setting Up Continuous Monitoring

For ongoing monitoring, collect NFS statistics with a simple script:

```bash
sudo nano /usr/local/bin/nfs-monitor.sh
```

```bash
#!/bin/bash
# Collect NFS performance metrics periodically

LOG_DIR="/var/log/nfs-monitor"
INTERVAL=60  # seconds between samples
MOUNTS="/mnt/nfs/data /mnt/nfs/backup"  # space-separated list of NFS mounts

mkdir -p "$LOG_DIR"

while true; do
    TIMESTAMP=$(date -u '+%Y-%m-%d %H:%M:%S')

    # Record nfsstat output
    {
        echo "=== $TIMESTAMP ==="
        echo "-- Client RPC Stats --"
        nfsstat -c
        echo "-- Server RPC Stats --"
        nfsstat -s
        echo ""
    } >> "$LOG_DIR/nfsstat.log"

    # Record mountstats for each mount
    for MOUNT in $MOUNTS; do
        if mountpoint -q "$MOUNT"; then
            {
                echo "=== $TIMESTAMP - $MOUNT ==="
                mountstats "$MOUNT"
                echo ""
            } >> "$LOG_DIR/mountstats.log"
        fi
    done

    sleep "$INTERVAL"
done
```

```bash
sudo chmod +x /usr/local/bin/nfs-monitor.sh

# Run as a systemd service
sudo nano /etc/systemd/system/nfs-monitor.service
```

```ini
[Unit]
Description=NFS Performance Monitor
After=network.target

[Service]
Type=simple
ExecStart=/usr/local/bin/nfs-monitor.sh
Restart=always
RestartSec=5

[Install]
WantedBy=multi-user.target
```

```bash
sudo systemctl enable nfs-monitor
sudo systemctl start nfs-monitor
```

## Key Performance Indicators to Watch

Establish baselines for these metrics during normal operation:

| Metric | Normal | Warning | Critical |
|--------|--------|---------|----------|
| `nfsstat -c` retrans | 0-10 | 10-100 | >100 |
| READ latency (mountstats) | < 5ms | 5-20ms | > 20ms |
| WRITE latency (mountstats) | < 10ms | 10-50ms | > 50ms |
| Server %util (iostat) | < 50% | 50-80% | > 80% |
| Network utilization | < 60% | 60-80% | > 80% |

When retransmits rise, check the network first. When operation latency rises, check server disk I/O. When throughput is low despite good latency and no retransmits, check the `rsize`/`wsize` mount options - they may be set too small.

```bash
# Check current rsize/wsize
cat /proc/mounts | grep /mnt/nfs/data

# Remount with larger block sizes for better throughput
sudo mount -o remount,rsize=1048576,wsize=1048576 /mnt/nfs/data
```

Systematic monitoring catches performance degradation before it becomes noticeable to users and gives you the data needed to make informed decisions about hardware upgrades or configuration changes.
