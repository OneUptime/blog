# How to Configure NFS Performance Tuning on Ubuntu

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Ubuntu, NFS, Performance, File Sharing, Networking

Description: Tune NFS server and client performance on Ubuntu by optimizing rsize, wsize, kernel threads, async modes, and network settings for maximum throughput.

---

NFS (Network File System) performance varies widely depending on configuration. An out-of-the-box NFS setup may deliver a fraction of the network's theoretical bandwidth. Proper tuning of buffer sizes, NFS thread counts, mount options, and kernel parameters can dramatically improve throughput and latency for both read-heavy and write-heavy workloads.

## Prerequisites

A working NFS server and client setup on Ubuntu. If you need to set up NFS from scratch, install the packages first:

```bash
# On the server
sudo apt install nfs-kernel-server -y

# On the client
sudo apt install nfs-common -y
```

## Establishing a Baseline

Before tuning, measure baseline performance so you can quantify improvements:

```bash
# Install nfs-utils and fio for benchmarking
sudo apt install fio -y

# Mount the NFS share on the client
sudo mount -t nfs 192.168.1.100:/srv/exports /mnt/nfs

# Run a sequential read benchmark
fio --name=nfs_read \
    --ioengine=sync \
    --rw=read \
    --bs=1M \
    --numjobs=1 \
    --size=2G \
    --directory=/mnt/nfs \
    --output-format=normal

# Run a sequential write benchmark
fio --name=nfs_write \
    --ioengine=sync \
    --rw=write \
    --bs=1M \
    --numjobs=1 \
    --size=2G \
    --directory=/mnt/nfs \
    --output-format=normal
```

Record the read and write bandwidth numbers before and after tuning.

## Tuning NFS Server Thread Count

The NFS kernel server runs a fixed number of threads to handle client requests. The default (8 threads) is too low for servers with multiple clients or high I/O load:

```bash
# Check current thread count
cat /proc/fs/nfsd/threads

# Temporarily set to 32 threads
sudo sh -c 'echo 32 > /proc/fs/nfsd/threads'

# Make the change permanent
sudo nano /etc/nfs.conf
```

Add or modify the `[nfsd]` section:

```ini
[nfsd]
# Number of NFS server threads
# Rule of thumb: 8 threads per physical CPU core
threads=32

# Use NFSv4 for better performance and security
vers4=yes
vers4.1=yes
vers4.2=yes

# Disable NFSv2 (old and slow)
vers2=no
```

```bash
# Apply changes
sudo systemctl restart nfs-kernel-server

# Verify thread count
cat /proc/fs/nfsd/threads
```

## Optimizing the /etc/exports File

Export options significantly affect performance:

```bash
sudo nano /etc/exports
```

```text
# Performance-optimized export
/srv/exports 192.168.1.0/24(rw,sync,no_subtree_check,no_root_squash,anonuid=1000,anongid=1000)

# For high-performance scenarios where data loss on server crash is acceptable:
/srv/fast_exports 192.168.1.0/24(rw,async,no_subtree_check,no_root_squash)
```

Key options:

- `sync` - write operations complete only after data is committed to disk (safer, slower)
- `async` - server acknowledges writes before committing to disk (faster, risk of data loss on crash)
- `no_subtree_check` - disables subtree checking (improves reliability and performance)
- `no_root_squash` - allows root on the client to act as root on the server (use carefully)

```bash
# Apply exports changes
sudo exportfs -ra
sudo exportfs -v
```

## Tuning Mount Options on the Client

Client mount options have a large impact on observed performance:

```bash
# Mount with performance-optimized options
sudo mount -t nfs \
    -o rw,sync,hard,intr,rsize=1048576,wsize=1048576,timeo=600,retrans=2,nfsvers=4.2 \
    192.168.1.100:/srv/exports \
    /mnt/nfs
```

Key mount options:

- `rsize=1048576` - read block size (1MB, up from 131072 default)
- `wsize=1048576` - write block size (1MB)
- `nfsvers=4.2` - use NFSv4.2 for best performance and features
- `hard` - retries indefinitely if server is unreachable (vs `soft` which times out)
- `intr` - allows interrupting hung NFS operations with Ctrl+C
- `timeo=600` - timeout in tenths of a second (60 seconds)
- `retrans=2` - number of retransmissions before giving up

For read-heavy workloads (like serving large media files), add:

- `nordirplus` - disable NFSv4 directory plus calls (can improve read performance)
- `async` - client-side async (data buffered, not immediately sent)

For write-heavy workloads:

- `sync` - ensure writes are committed immediately (safer)
- `wsize=1048576` - large write buffer

### Making Mount Options Permanent in /etc/fstab

```bash
sudo nano /etc/fstab
```

```text
# High-performance NFS mount
192.168.1.100:/srv/exports /mnt/nfs nfs rw,hard,intr,rsize=1048576,wsize=1048576,timeo=600,nfsvers=4.2,_netdev 0 0
```

The `_netdev` option tells systemd to mount this filesystem only after the network is available.

```bash
# Test the fstab entry
sudo mount -a

# Verify it mounted
df -h /mnt/nfs
```

## Kernel Network Buffer Tuning

For NFS over a fast network (10GbE or faster), the default kernel network buffers are too small:

```bash
sudo nano /etc/sysctl.d/99-nfs-performance.conf
```

```ini
# Network buffer sizes for NFS performance

# Maximum socket receive/send buffer size
net.core.rmem_max = 134217728
net.core.wmem_max = 134217728

# Default socket buffer sizes
net.core.rmem_default = 65536
net.core.wmem_default = 65536

# TCP buffer settings
net.ipv4.tcp_rmem = 4096 131072 134217728
net.ipv4.tcp_wmem = 4096 131072 134217728

# TCP window scaling for high-bandwidth-delay-product connections
net.ipv4.tcp_window_scaling = 1

# Increase the backlog queue size
net.core.netdev_max_backlog = 5000

# Increase number of incomplete connection requests (SYN backlog)
net.ipv4.tcp_max_syn_backlog = 4096
```

```bash
# Apply sysctl settings
sudo sysctl -p /etc/sysctl.d/99-nfs-performance.conf

# Verify they took effect
sysctl net.core.rmem_max
```

## NFS I/O Scheduler Tuning

For NFS servers using SSDs, the I/O scheduler matters:

```bash
# Check current scheduler for each disk
cat /sys/block/sda/queue/scheduler

# For SSDs and NVMe, use 'none' or 'mq-deadline'
echo "none" | sudo tee /sys/block/sda/queue/scheduler

# Make permanent with udev rule
sudo nano /etc/udev/rules.d/60-io-scheduler.rules
```

```text
# Set scheduler for SSDs
ACTION=="add|change", KERNEL=="sd[a-z]", ATTR{queue/rotational}=="0", ATTR{queue/scheduler}="none"

# Set scheduler for HDDs (use mq-deadline)
ACTION=="add|change", KERNEL=="sd[a-z]", ATTR{queue/rotational}=="1", ATTR{queue/scheduler}="mq-deadline"
```

## Monitoring NFS Performance

```bash
# Install nfsstat
sudo apt install nfs-utils -y

# Show NFS statistics
nfsstat -s    # Server statistics
nfsstat -c    # Client statistics

# Show detailed NFS counters
cat /proc/net/rpc/nfsd
cat /proc/net/rpc/nfs

# Monitor NFS operations per second with nfsiostat
nfsiostat 2   # Refresh every 2 seconds

# Use iostat to see NFS as a block device
iostat -x 2
```

```bash
# Monitor network utilization
sudo apt install iperf3 nload -y

# Check NFS-related kernel statistics
sudo cat /proc/fs/nfsd/pool_stats
```

## Checking for Slow NFS Operations

```bash
# Watch for NFS operations taking longer than expected
# This shows operations older than 5 seconds
sudo watchnfsd -v

# Or use a loop to monitor outstanding RPC calls
while true; do
    echo "=== $(date) ==="
    sudo cat /proc/net/rpc/nfsd | grep th
    sleep 5
done
```

## Performance Comparison: Before vs After

After applying these tunings, re-run the fio benchmarks:

```bash
# Remount with new options first
sudo umount /mnt/nfs
sudo mount -t nfs \
    -o rw,hard,intr,rsize=1048576,wsize=1048576,timeo=600,nfsvers=4.2 \
    192.168.1.100:/srv/exports \
    /mnt/nfs

# Sequential read test
fio --name=nfs_read_tuned \
    --ioengine=sync \
    --rw=read \
    --bs=1M \
    --numjobs=4 \
    --size=2G \
    --directory=/mnt/nfs \
    --group_reporting

# Sequential write test
fio --name=nfs_write_tuned \
    --ioengine=sync \
    --rw=write \
    --bs=1M \
    --numjobs=4 \
    --size=2G \
    --directory=/mnt/nfs \
    --group_reporting
```

Typical improvements after tuning on a gigabit network:

- Sequential reads: from ~40 MB/s to ~110 MB/s
- Sequential writes: from ~30 MB/s to ~90 MB/s (with async exports)
- Random 4K reads: from ~8000 IOPS to ~15000 IOPS

## Summary of Key Tuning Parameters

| Parameter | Default | Tuned | Impact |
|---|---|---|---|
| NFS threads | 8 | 32+ | Concurrent client support |
| rsize/wsize | 131072 | 1048576 | Bulk transfer speed |
| NFS version | 4.0 | 4.2 | Minor protocol improvements |
| async export | no | yes | Write performance (at risk) |
| rmem_max | 212992 | 134217728 | Large buffer throughput |

NFS performance tuning is iterative. Start with rsize/wsize and thread count - these give the biggest gains with the least risk - then add network buffer tuning if you are still not reaching expected throughput.
