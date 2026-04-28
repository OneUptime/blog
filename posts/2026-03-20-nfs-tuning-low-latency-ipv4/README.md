# How to Tune NFS over IPv4 for Low-Latency Networks

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: NFS, IPv4, Performance, Tuning, Low Latency, Network Storage

Description: Tune NFS over IPv4 for low-latency workloads by optimizing rsize/wsize, adjusting TCP buffer sizes, using async exports carefully, and configuring NFSv4 client-side caching.

## Introduction

NFS performance over IPv4 depends on mount options, kernel parameters, and server-side export settings. For low-latency networks (LAN with sub-millisecond RTT), the bottleneck is usually suboptimal read/write block sizes or unnecessary synchronous I/O. This guide covers the key tuning parameters.

## Optimal Mount Options

The biggest single improvement is usually increasing `rsize` and `wsize` from their defaults.

```bash
# Optimized NFSv4 mount for low-latency LAN

sudo mount -t nfs4 \
  -o rsize=1048576,wsize=1048576,timeo=14,retrans=3,hard,noatime,nconnect=4 \
  10.0.0.1:/exports/data /mnt/data
```

| Option | Value | Effect |
|---|---|---|
| `rsize=1048576` | 1 MiB | Read block size (max transfer per RPC) |
| `wsize=1048576` | 1 MiB | Write block size |
| `timeo=14` | 1.4 seconds | RPC timeout (not too low for busy servers) |
| `retrans=3` | 3 | Retransmissions before error |
| `hard` | - | Retry forever (safe for LAN) |
| `noatime` | - | Skip access time updates (reduces write amplification) |
| `nconnect=4` | 4 | Use 4 TCP connections (Linux 5.3+, increases throughput) |

## fstab Entry for Persistent Mount

```text
# /etc/fstab
10.0.0.1:/exports/data  /mnt/data  nfs4  rsize=1048576,wsize=1048576,timeo=14,retrans=3,hard,noatime,nconnect=4,_netdev  0  0
```

## Server-Side Export Options

```bash
# /etc/exports

# async: server reports write complete before flushing to disk
# Use only on non-critical data where speed > durability
/exports/scratch  10.0.0.0/24(rw,async,no_subtree_check)

# sync: safe default, writes committed before ACK
/exports/data     10.0.0.0/24(rw,sync,no_subtree_check)

# no_root_squash: only if clients are trusted (not recommended for multi-tenant)
/exports/trusted  10.0.0.5(rw,sync,no_subtree_check,no_root_squash)
```

After editing exports:
```bash
sudo exportfs -ra
sudo exportfs -v
```

## Kernel TCP Buffer Tuning

```bash
# /etc/sysctl.d/nfs-tuning.conf

# Increase TCP socket buffers for large NFS transfers
net.core.rmem_max = 16777216
net.core.wmem_max = 16777216
net.ipv4.tcp_rmem = 4096 87380 16777216
net.ipv4.tcp_wmem = 4096 65536 16777216

# Increase NFS request slots (server-side)
# Controls concurrent RPC operations per client
# sunrpc.tcp_slot_table_entries = 128
# (set via /proc/sys/sunrpc/tcp_slot_table_entries)

# Apply immediately
sudo sysctl -p /etc/sysctl.d/nfs-tuning.conf
```

## NFS RPC Slot Tuning

```bash
# Client-side: increase RPC slot table for higher concurrency
echo 128 | sudo tee /proc/sys/sunrpc/tcp_slot_table_entries

# Make persistent (kernel 3.19+):
echo "options sunrpc tcp_slot_table_entries=128" | sudo tee /etc/modprobe.d/sunrpc.conf

# Server-side: check current slot count
cat /proc/net/rpc/nfsd

# Increase number of NFS server threads (default is 8)
echo 32 | sudo tee /proc/fs/nfsd/threads
```

## Measuring Performance

```bash
# Measure read throughput
dd if=/mnt/data/testfile of=/dev/null bs=1M count=1024

# Measure write throughput
dd if=/dev/zero of=/mnt/data/testfile bs=1M count=1024 conv=fsync

# Check NFS statistics (look for high retrans or timeouts)
nfsstat -c   # client statistics
nfsstat -s   # server statistics

# Monitor NFS I/O via mountstats
cat /proc/self/mountstats | grep -A 20 "10.0.0.1"
```

## NFSv4 vs NFSv3 Performance

```bash
# Verify you're using NFSv4 (not v3):
mount | grep nfs
# Should show: type nfs4

# NFSv4 advantages for low-latency:
# - Compound operations reduce round trips
# - Delegation allows client-side caching
# - No portmapper needed (single port 2049)

# Check delegation activity (look for delegation counters):
nfsstat -c
grep -i delegation /proc/self/mountstats
```

## Jumbo Frames (if supported)

```bash
# On networks supporting 9000-byte MTU jumbo frames:
# Server
sudo ip link set eth0 mtu 9000

# Client
sudo ip link set eth0 mtu 9000

# Verify both ends support it:
ping -M do -s 8972 10.0.0.1   # 8972 + 28 header = 9000 bytes
# Should not fragment
```

## Conclusion

NFS low-latency tuning on IPv4 starts with `rsize=1048576,wsize=1048576` in mount options - this single change often doubles throughput. Add `nconnect=4` on Linux 5.3+ to parallelize TCP connections. Use `async` exports only for non-critical data where durability can be traded for speed. Increase TCP buffer sizes via sysctl and bump RPC slot table entries for high-concurrency workloads. Measure with `dd` and `nfsstat -c` before and after changes to confirm improvements.
