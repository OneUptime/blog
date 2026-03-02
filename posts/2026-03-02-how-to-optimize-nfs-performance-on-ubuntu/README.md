# How to Optimize NFS Performance on Ubuntu

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Ubuntu, NFS, Performance, Networking, Storage

Description: Tune NFS client and server settings on Ubuntu for maximum throughput and low latency, covering mount options, kernel parameters, network settings, and benchmarking techniques.

---

Default NFS settings are conservative - they prioritize compatibility over performance. On a fast network with modern storage, you can often double or triple NFS throughput with targeted tuning. The right settings depend on your network speed, storage backend, workload pattern, and whether you need consistency guarantees.

## Understanding What Limits NFS Performance

NFS performance bottlenecks fall into a few categories. Understanding which one you're hitting before tuning is essential:

- **Network bandwidth**: saturating the NIC
- **Network latency**: small operations blocked waiting for round-trips
- **Server storage**: disk IOPS or throughput is the limit
- **NFS threads**: server not processing requests fast enough
- **Rsize/wsize**: transfer size too small for the network
- **Cache behavior**: client thrashing the cache, or consistency checks killing latency

Benchmark before and after every change. Use `fio` for storage benchmarks and `nfsiostat` to observe NFS statistics in real time.

## Benchmarking Baseline Performance

Before tuning anything, measure current performance:

```bash
# Install benchmarking tools
sudo apt install -y fio nfs-common nfs-kernel-server

# Basic sequential read test from NFS mount
fio --name=seq-read \
  --filename=/mnt/nfs/testfile \
  --rw=read \
  --bs=1M \
  --size=4G \
  --numjobs=1 \
  --time_based \
  --runtime=60 \
  --group_reporting

# Sequential write test
fio --name=seq-write \
  --filename=/mnt/nfs/testfile \
  --rw=write \
  --bs=1M \
  --size=4G \
  --numjobs=1 \
  --time_based \
  --runtime=60 \
  --group_reporting

# Random 4K read (IOPS-bound workload)
fio --name=rand-read \
  --filename=/mnt/nfs/testfile \
  --rw=randread \
  --bs=4K \
  --size=1G \
  --numjobs=4 \
  --iodepth=32 \
  --time_based \
  --runtime=60 \
  --group_reporting

# Monitor NFS statistics during benchmarks
nfsiostat 2  # Update every 2 seconds
```

## Server-Side Tuning

### NFS Thread Count

The default number of NFS server threads is 8, which saturates on busy servers:

```bash
# Check current thread count
cat /proc/net/rpc/nfsd | grep th

# Increase threads in /etc/nfs.conf
sudo nano /etc/nfs.conf
```

```ini
# /etc/nfs.conf
[nfsd]
# Number of NFS server threads
# Rule of thumb: 8 per CPU core, up to 64 total
threads=32

# NFSv4 settings
grace-time=90
lease-time=90

[exportfs]
rootdir=/
```

```bash
# Apply without restart
sudo systemctl reload nfs-server

# Or set threads dynamically without restarting
echo 32 | sudo tee /proc/fs/nfsd/threads
```

### Export Options for Performance

```bash
# /etc/exports - performance-oriented export options
sudo nano /etc/exports
```

```bash
# /etc/exports

# async: server acknowledges writes before writing to disk
# This is faster but risks data loss on server crash
# Only use if clients can tolerate this risk
/data/fast 192.168.1.0/24(rw,async,no_subtree_check,no_root_squash)

# sync: safe but slower - every write goes to disk before ACK
/data/safe 192.168.1.0/24(rw,sync,no_subtree_check)

# For read-only exports, no_subtree_check improves performance
/data/readonly 192.168.1.0/24(ro,no_subtree_check)
```

The `async` option is the biggest single performance gain on the server side. With `sync` (the default), the server writes to disk before sending the acknowledgment. With `async`, it acknowledges immediately and writes asynchronously. Use `async` only if you can tolerate potential data loss on an ungraceful server shutdown, or if your server has a battery-backed write cache.

### Server Kernel Parameters

```bash
# Increase socket buffer sizes for high-bandwidth NFS
sudo nano /etc/sysctl.conf
```

```bash
# /etc/sysctl.conf - NFS server optimizations

# TCP socket buffer sizes (send and receive)
# 64MB maximum buffer size
net.core.rmem_max = 67108864
net.core.wmem_max = 67108864
net.core.rmem_default = 262144
net.core.wmem_default = 262144

# TCP memory settings
net.ipv4.tcp_rmem = 4096 87380 67108864
net.ipv4.tcp_wmem = 4096 65536 67108864

# Increase the network backlog for high connection counts
net.core.netdev_max_backlog = 30000
net.core.somaxconn = 65535

# Reduce TCP retransmission timeout for faster failure detection
net.ipv4.tcp_retries2 = 8
```

```bash
# Apply sysctl changes
sudo sysctl -p
```

## Client-Side Tuning

### Mount Options

The biggest impact on client-side performance comes from mount options:

```bash
# Current mount (check what's active)
mount | grep nfs

# Optimized mount command for high-throughput workload
sudo mount -t nfs4 \
  -o rsize=1048576,wsize=1048576,timeo=600,retrans=2,hard,proto=tcp \
  nfsserver:/data /mnt/data

# Options explained:
# rsize=1048576  - read size: 1MB (maximum for Linux)
# wsize=1048576  - write size: 1MB
# timeo=600      - timeout: 60 seconds (600 = 60 * 10 tenths-of-seconds)
# retrans=2      - retransmit attempts before reporting error
# hard           - retry indefinitely on server failure (vs soft which gives up)
# proto=tcp      - use TCP (more reliable than UDP for large transfers)
```

For `/etc/fstab`, these same options apply:

```bash
# /etc/fstab optimized NFS entries

# High-throughput sequential workload (large file transfers, video, backups)
nfsserver:/data /mnt/data nfs4 rsize=1048576,wsize=1048576,timeo=600,retrans=2,hard,proto=tcp,nofail 0 0

# Low-latency workload (databases, small files, many operations)
nfsserver:/db /mnt/db nfs4 rsize=131072,wsize=131072,timeo=300,retrans=2,hard,proto=tcp,nofail 0 0

# Read-heavy workload with aggressive caching
# actimeo=600 caches attribute data for 10 minutes (reduces stat() calls)
nfsserver:/readonly /mnt/ro nfs4 ro,rsize=1048576,timeo=600,retrans=2,hard,proto=tcp,actimeo=600,nofail 0 0
```

### Tuning Read-Ahead and Cache

```bash
# Increase read-ahead for sequential workloads
# Find the block device backing the NFS cache (usually not applicable directly)
# But tune the kernel's page cache behavior:

# Increase dirty page ratio - more data buffered before flushing
# Good for write-heavy NFS workloads
sudo sysctl -w vm.dirty_ratio=20
sudo sysctl -w vm.dirty_background_ratio=10

# Make permanent in /etc/sysctl.conf
echo "vm.dirty_ratio=20" | sudo tee -a /etc/sysctl.conf
echo "vm.dirty_background_ratio=10" | sudo tee -a /etc/sysctl.conf
```

## NFSv4 Specific Optimizations

NFSv4 has better performance characteristics than NFSv3 for many workloads:

```bash
# Force NFSv4 (avoid version negotiation overhead)
sudo mount -t nfs4 nfsserver:/data /mnt/data -o ...

# In fstab, use nfs4 type
nfsserver:/data /mnt/data nfs4 ... 0 0

# NFSv4.1 and 4.2 have additional features
# Check what version is in use
nfsstat -m
# Look for vers=4.2 or vers=4.1
```

## Monitoring NFS Performance

```bash
# Real-time NFS statistics
nfsiostat 2

# Detailed NFS client statistics
cat /proc/net/rpc/nfs

# Server-side statistics
cat /proc/net/rpc/nfsd

# Check for NFS errors
nfsstat -c  # client stats
nfsstat -s  # server stats

# Monitor network throughput during operations
iftop -i eth0  # Network interface traffic
nethogs        # Per-process network usage

# Check for NFS timeouts in system log
journalctl -k | grep -i nfs
dmesg | grep -i nfs
```

## Comparing Performance

Run the same `fio` tests after tuning to see improvements:

```bash
# Quick comparison test - run before and after tuning
fio --name=benchmark \
  --filename=/mnt/nfs/testfile \
  --rw=readwrite \
  --bs=1M \
  --size=2G \
  --runtime=30 \
  --time_based \
  --group_reporting \
  --output-format=json \
  --output=/tmp/nfs-benchmark-$(date +%Y%m%d-%H%M%S).json
```

## Network Configuration for High-Speed NFS

On 10GbE or faster networks, additional tuning applies:

```bash
# Enable jumbo frames (if your network supports it)
# MTU 9000 reduces per-packet overhead on large transfers
sudo ip link set eth0 mtu 9000

# Make permanent in Netplan
sudo nano /etc/netplan/01-network.yaml
```

```yaml
network:
  version: 2
  ethernets:
    eth0:
      dhcp4: false
      addresses:
        - 192.168.1.10/24
      # Set jumbo frame MTU
      mtu: 9000
```

```bash
sudo netplan apply

# Verify both client and server have jumbo frames enabled
# before expecting a performance improvement - mixed MTUs cause fragmentation
ping -M do -s 8972 nfsserver  # Test with jumbo-sized packets
```

Tuning NFS is iterative. Start with `rsize/wsize` and thread count, benchmark, then move to network parameters if those aren't the bottleneck. On a 1GbE network, you should consistently hit 110-115 MB/s for sequential reads with properly tuned settings.
