# How to Configure ClickHouse with NFS Storage

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: ClickHouse, NFS, Storage, Database, Configuration, Administration

Description: Learn how to mount NFS as a storage disk in ClickHouse, configure mount options for reliability, and understand the trade-offs of using network-attached storage.

---

Network File System (NFS) allows a ClickHouse server to store data on a remote file server. This is useful when direct-attached storage is insufficient and object storage (S3) is not available or permitted. NFS mounts appear to ClickHouse as a regular local disk, so configuration is straightforward. However, NFS requires careful tuning to avoid data loss and performance issues.

## When NFS Is Appropriate

NFS is suitable for:

- Cold or archival storage where query latency is not critical
- Centralized shared storage in environments without object storage access
- Lab or development setups where a NAS device is available

NFS is not recommended for hot storage in production because network latency and NFS locking behavior can significantly slow down high-throughput inserts and merges.

## Mounting the NFS Share

On the ClickHouse host, install NFS client utilities and mount the share:

```bash
# Install NFS client (Debian/Ubuntu)
apt-get install -y nfs-common

# Install NFS client (RHEL/CentOS)
yum install -y nfs-utils
```

Mount the NFS share manually to verify connectivity:

```bash
mount -t nfs nfs-server.internal:/exports/clickhouse /mnt/nfs/clickhouse
```

For a production persistent mount, add the entry to `/etc/fstab`:

```text
nfs-server.internal:/exports/clickhouse  /mnt/nfs/clickhouse  nfs  rw,hard,timeo=600,retrans=5,rsize=1048576,wsize=1048576,nofail,_netdev  0  0
```

Explanation of key options:

| Option | Purpose |
|--------|---------|
| `hard` | Retries NFS operations indefinitely on server failure instead of failing immediately |
| `timeo=600` | Timeout in tenths of a second (60 seconds) before a retry |
| `retrans=5` | Number of retransmission attempts before raising an error |
| `rsize=1048576` | Read buffer size (1 MiB for large sequential reads) |
| `wsize=1048576` | Write buffer size (1 MiB for large sequential writes) |
| `nofail` | Do not fail boot if NFS share is unavailable |
| `_netdev` | Mark as network device so systemd mounts it after networking is up |

Mount and verify:

```bash
mount -a
df -h /mnt/nfs/clickhouse
```

## Setting Ownership

```bash
chown -R clickhouse:clickhouse /mnt/nfs/clickhouse
```

Verify the NFS server exports the share with the correct UID/GID for the `clickhouse` user. Mismatched UIDs cause permission errors on write.

## Configuring the NFS Disk in ClickHouse

Create `/etc/clickhouse-server/config.d/nfs_storage.xml`:

```xml
<clickhouse>
  <storage_configuration>
    <disks>
      <local>
        <path>/var/lib/clickhouse/</path>
      </local>
      <nfs_cold>
        <path>/mnt/nfs/clickhouse/</path>
      </nfs_cold>
    </disks>

    <policies>
      <local_and_nfs>
        <volumes>
          <hot>
            <disk>local</disk>
          </hot>
          <cold>
            <disk>nfs_cold</disk>
          </cold>
        </volumes>
        <move_factor>0.2</move_factor>
      </local_and_nfs>
    </policies>
  </storage_configuration>
</clickhouse>
```

NFS does not reliably support the `O_DIRECT` flag and attempting to use it can cause write failures. ClickHouse controls direct I/O through the MergeTree table setting `min_bytes_to_use_direct_io`, which defaults to `0` (disabled). If your server overrides this setting globally to a non-zero value, explicitly disable it for tables stored on NFS:

```sql
ALTER TABLE archive_events MODIFY SETTING min_bytes_to_use_direct_io = 0;
```

## Creating a Table on NFS

```sql
CREATE TABLE archive_events
(
    event_id   UInt64,
    event_type LowCardinality(String),
    payload    String,
    ts         DateTime
)
ENGINE = MergeTree()
PARTITION BY toYYYYMM(ts)
ORDER BY (ts, event_id)
SETTINGS storage_policy = 'local_and_nfs';
```

## Moving Data to NFS with TTL

```sql
ALTER TABLE archive_events
    MODIFY TTL ts + INTERVAL 30 DAY TO VOLUME 'cold';
```

## Verifying NFS Disk Status

```sql
SELECT name, type, path, free_space, total_space
FROM system.disks
WHERE name = 'nfs_cold';
```

## Checking Parts on NFS

```sql
SELECT
    name         AS part,
    disk_name,
    formatReadableSize(bytes_on_disk) AS size
FROM system.parts
WHERE active = 1
  AND table = 'archive_events'
  AND disk_name = 'nfs_cold'
  AND database = currentDatabase();
```

## Performance Considerations

NFS performance is sensitive to:

- **Network bandwidth** - large parts require high throughput during moves
- **Latency** - NFS adds round-trip latency to every metadata operation
- **NFS server I/O** - the server's disk subsystem becomes a shared bottleneck

To reduce performance impact on queries reading from NFS:

```xml
<nfs_cold>
  <path>/mnt/nfs/clickhouse/</path>
</nfs_cold>
<nfs_cold_cache>
  <type>cache</type>
  <disk>nfs_cold</disk>
  <path>/var/lib/clickhouse/disks/nfs_cache/</path>
  <max_size>5368709120</max_size>
</nfs_cold_cache>
```

Then reference `nfs_cold_cache` instead of `nfs_cold` in the cold volume to enable caching:

```xml
<cold>
  <disk>nfs_cold_cache</disk>
</cold>
```

```bash
mkdir -p /var/lib/clickhouse/disks/nfs_cache
chown clickhouse:clickhouse /var/lib/clickhouse/disks/nfs_cache
```

## Common Issues

**Permission denied on NFS write:**
Confirm the NFS export allows write access from the ClickHouse host IP and that UIDs match.

```bash
# On NFS server, check exports
exportfs -v

# On ClickHouse host, check effective permissions
sudo -u clickhouse touch /mnt/nfs/clickhouse/.test && echo "OK"
```

**Stale file handle errors:**
Remount the share:

```bash
umount -f /mnt/nfs/clickhouse
mount /mnt/nfs/clickhouse
```

**Slow merges on NFS:**
Restrict large merges to local disk and use NFS only for cold reads:

```xml
<hot>
  <disk>local</disk>
  <!-- Parts above 500 MiB skip hot volume and land on NFS directly -->
  <max_data_part_size_bytes>524288000</max_data_part_size_bytes>
</hot>
```

## Summary

NFS can serve as a low-cost cold storage tier in ClickHouse by mounting the share on the host and declaring it as a disk in `storage_configuration`. Ensure `min_bytes_to_use_direct_io` remains at its default of `0` to prevent O_DIRECT on NFS, use `hard` mount options for reliability, and keep NFS restricted to cold volumes or archival workloads. For production hot storage, prefer local SSD or NVMe disks.
