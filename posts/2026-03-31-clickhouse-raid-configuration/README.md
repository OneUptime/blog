# How to Use RAID Configuration with ClickHouse

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: ClickHouse, RAID, Storage, Performance, Reliability

Description: Learn how to configure RAID arrays for ClickHouse storage to improve throughput, redundancy, and fault tolerance for production deployments.

---

RAID (Redundant Array of Independent Disks) can improve ClickHouse performance and durability at the storage layer. The right RAID level depends on your priorities - throughput, redundancy, or cost.

## RAID Levels for ClickHouse

The main RAID options for ClickHouse deployments:

| RAID | Redundancy | Read Speed | Write Speed | Disk Usage | Use Case |
|---|---|---|---|---|---|
| RAID 0 | None | High | High | 100% | Max throughput, no redundancy |
| RAID 1 | Yes (1 disk failure) | Medium | Same | 50% | Simple mirroring |
| RAID 5 | Yes (1 disk failure) | High | Medium | 67-94% | Balance of performance and redundancy |
| RAID 10 | Yes (1 per mirror) | Highest | High | 50% | Best for write-heavy workloads |

**Recommendation**: RAID 10 for write-heavy production ClickHouse. JBOD with ClickHouse replication for multi-replica setups.

## Setting Up Software RAID with mdadm

Create a RAID 10 array from four NVMe drives:

```bash
# Install mdadm
apt-get install -y mdadm

# Create RAID 10 array
mdadm --create /dev/md0 \
    --level=10 \
    --raid-devices=4 \
    /dev/nvme0n1 /dev/nvme1n1 /dev/nvme2n1 /dev/nvme3n1

# Monitor RAID build progress
cat /proc/mdstat
```

## Formatting and Mounting the RAID Array

```bash
# Format with XFS (recommended for ClickHouse)
mkfs.xfs -f /dev/md0

# Create mount point
mkdir -p /data/clickhouse

# Mount with optimal options
mount -o noatime,nodiratime,discard /dev/md0 /data/clickhouse

# Add to /etc/fstab for persistence
echo "/dev/md0 /data/clickhouse xfs defaults,noatime,nodiratime 0 0" >> /etc/fstab
```

## Configuring ClickHouse to Use the RAID Volume

Point ClickHouse at the RAID mount in `config.xml`:

```xml
<path>/data/clickhouse/</path>
<tmp_path>/data/clickhouse/tmp/</tmp_path>
```

Or use it as a named disk in multi-disk configuration:

```xml
<storage_configuration>
    <disks>
        <raid10_nvme>
            <type>local</type>
            <path>/data/clickhouse/</path>
        </raid10_nvme>
    </disks>
</storage_configuration>
```

## XFS Tuning for ClickHouse on RAID

Optimize XFS mount options for analytical workloads:

```bash
# Mount options for ClickHouse on RAID
mount -o noatime,nodiratime,allocsize=512m,largeio /dev/md0 /data/clickhouse
```

Set the readahead for the RAID device:

```bash
# Increase readahead for sequential scans (ClickHouse is very sequential)
blockdev --setra 65536 /dev/md0
```

## RAID vs. ClickHouse Replication

An important consideration: ClickHouse's own replication provides application-level redundancy that may be preferable to RAID for distributed deployments:

- **RAID** - protects against single disk failure on one server
- **ClickHouse replication** - protects against entire server failure, supports geographic distribution

For most production setups, use simple RAID 1 or JBOD per node, and rely on ClickHouse replication for fault tolerance across the cluster.

## Monitoring RAID Health

```bash
# Check RAID array status
mdadm --detail /dev/md0

# Watch for degraded or rebuilding arrays
mdadm --detail /dev/md0 | grep -i "state"

# Set up email alerts for RAID failures
echo "MAILADDR admin@example.com" >> /etc/mdadm/mdadm.conf
systemctl restart mdmonitor
```

## Summary

RAID for ClickHouse adds storage-layer reliability and can improve IO throughput. RAID 10 is best for write-heavy workloads; RAID 5 for a cost-performance balance. Format RAID volumes with XFS, use `noatime` mount options, and increase readahead for sequential scan performance. In multi-replica ClickHouse clusters, application-level replication often provides better protection than RAID alone.
