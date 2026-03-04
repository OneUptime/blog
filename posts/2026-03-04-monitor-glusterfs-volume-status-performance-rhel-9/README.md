# How to Monitor GlusterFS Volume Status and Performance on RHEL

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: RHEL, GlusterFS, Monitoring, Performance, Storage, Linux

Description: Monitor GlusterFS volumes on RHEL using built-in commands, profile data, and log analysis to track health, performance, and disk usage.

---

Keeping track of GlusterFS volume health and performance is essential for avoiding data loss and performance bottlenecks. GlusterFS provides several built-in tools for monitoring, and you can integrate them with external monitoring systems like Prometheus or Nagios.

## Volume Status Commands

### Basic Status

```bash
sudo gluster volume status
```

This shows all volumes and their brick processes. Each brick should show as "Online" with a PID.

### Detailed Status

```bash
sudo gluster volume status repvol detail
```

This shows per-brick details including disk space, inode counts, and process information:

```
Brick                : node1:/data/glusterfs/replica/brick1/data
TCP Port             : 49152
Online               : Y
Pid                  : 12345
File System          : xfs
Device               : /dev/sdb
Mount Options        : rw,seclabel,noatime,attr2
Disk Space Free      : 450.2GB
Total Disk Space     : 500.0GB
Inode Count          : 262144000
Free Inodes          : 261890000
```

### Client Connections

```bash
sudo gluster volume status repvol clients
```

Shows which clients are connected and their connection details.

### Memory Usage

```bash
sudo gluster volume status repvol mem
```

Shows memory usage of each brick and NFS/self-heal daemon process.

## Volume Profiling

Enable profiling to collect I/O statistics:

```bash
# Start profiling
sudo gluster volume profile repvol start

# View collected data
sudo gluster volume profile repvol info

# View cumulative stats
sudo gluster volume profile repvol info cumulative

# View per-brick stats
sudo gluster volume profile repvol info peek
```

Profile output includes:

- Read/write operation counts
- Data read/written per interval
- File operation latency (open, stat, readdir, etc.)
- Operation frequency distribution by block size

```bash
# Stop profiling when done (it adds overhead)
sudo gluster volume profile repvol stop
```

## Top Command

The `top` command shows the most active files and bricks:

```bash
# Most read files
sudo gluster volume top repvol read

# Most written files
sudo gluster volume top repvol write

# Files with most opens
sudo gluster volume top repvol open

# Highest read performance (by throughput)
sudo gluster volume top repvol read-perf

# Highest write performance
sudo gluster volume top repvol write-perf
```

## Heal Monitoring

For replicated and dispersed volumes, monitor the self-heal status:

```bash
# Files needing healing
sudo gluster volume heal repvol info

# Summary of heal status
sudo gluster volume heal repvol info summary

# Files currently being healed
sudo gluster volume heal repvol info heal-failed

# Split-brain entries
sudo gluster volume heal repvol info split-brain
```

## Log Monitoring

GlusterFS logs are in `/var/log/glusterfs/`:

```bash
# Main daemon log
sudo tail -f /var/log/glusterfs/glusterd.log

# Brick logs
sudo tail -f /var/log/glusterfs/bricks/*.log

# Client mount log
sudo tail -f /var/log/glusterfs/mnt-repvol.log
```

Set log level for more detail:

```bash
sudo gluster volume set repvol diagnostics.client-log-level DEBUG
sudo gluster volume set repvol diagnostics.brick-log-level DEBUG
```

Reset to normal after debugging:

```bash
sudo gluster volume set repvol diagnostics.client-log-level INFO
sudo gluster volume set repvol diagnostics.brick-log-level INFO
```

## Monitoring with Statedump

A statedump captures the internal state of GlusterFS processes for debugging:

```bash
# Generate statedump for a brick
sudo kill -USR1 <brick_pid>

# Find the statedump files
ls /var/run/gluster/
```

## Checking Disk Usage

```bash
# Per-brick disk usage
sudo gluster volume status repvol detail | grep -A 3 "Disk Space"

# Client-side view
df -h /mnt/repvol
```

## Quick Health Check Script

```bash
#!/bin/bash
echo "=== Peer Status ==="
sudo gluster peer status

echo ""
echo "=== Volume Status ==="
sudo gluster volume status all

echo ""
echo "=== Heal Info ==="
for vol in $(sudo gluster volume list); do
    echo "Volume: $vol"
    sudo gluster volume heal "$vol" info summary 2>/dev/null || echo "  Not a replicated/dispersed volume"
done

echo ""
echo "=== Brick Disk Usage ==="
sudo gluster volume status all detail 2>/dev/null | grep -E "(Brick|Disk Space Free|Total Disk)"
```

Save this as `/usr/local/bin/gluster-health.sh` and run it periodically.

## Conclusion

Regular monitoring of GlusterFS volumes helps catch problems early. Use `volume status` for quick health checks, `profile` for performance analysis, and `heal info` for data consistency verification. Integrate these commands into your monitoring infrastructure to get alerts before small issues become outages.
