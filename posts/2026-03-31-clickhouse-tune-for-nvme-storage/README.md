# How to Tune ClickHouse for NVMe Storage

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: ClickHouse, NVMe, Storage, Performance, Tuning, I/O

Description: Optimize ClickHouse and Linux settings specifically for NVMe drives to unlock maximum I/O throughput and reduce query latency.

---

NVMe drives offer significantly higher throughput and lower latency than SATA SSDs, but they require different tuning to fully exploit their capabilities in ClickHouse deployments.

## Set the Correct I/O Scheduler

NVMe drives have their own internal queuing. Use the `none` scheduler to eliminate redundant kernel queuing:

```bash
echo none | sudo tee /sys/block/nvme0n1/queue/scheduler

# Persist via udev
echo 'ACTION=="add|change", KERNEL=="nvme[0-9]n[0-9]", ATTR{queue/scheduler}="none"' \
  | sudo tee /etc/udev/rules.d/60-nvme-scheduler.rules
```

## Increase NVMe Queue Depth

NVMe supports up to 64K queues with 64K entries each. Raise the block layer request queue depth to allow more I/O requests in flight:

```bash
echo 1023 | sudo tee /sys/block/nvme0n1/queue/nr_requests
```

## Disable Read Ahead for Random Workloads

NVMe is fast enough that read-ahead adds overhead for small random reads:

```bash
echo 0 | sudo tee /sys/block/nvme0n1/queue/read_ahead_kb
```

For sequential scan workloads (ClickHouse range scans), moderate read-ahead can help:

```bash
echo 128 | sudo tee /sys/block/nvme0n1/queue/read_ahead_kb
```

## Configure ClickHouse Direct I/O

Enable direct I/O for large merges to bypass the page cache and reduce memory pressure:

```sql
ALTER TABLE events MODIFY SETTING
    min_merge_bytes_to_use_direct_io = 1073741824;
```

## Maximize Merge Concurrency

NVMe can handle many more concurrent operations than SATA SSDs:

```xml
<!-- config.xml -->
<background_pool_size>32</background_pool_size>
<background_merges_mutations_concurrency_ratio>4</background_merges_mutations_concurrency_ratio>
```

## Increase Max Insert Threads

With NVMe, disk I/O is rarely the bottleneck during inserts. Increase threads to saturate CPU:

```sql
SET max_insert_threads = 16;
```

To make this the default for all queries, set it in a user profile in `users.xml`:

```xml
<!-- users.xml -->
<profiles>
    <default>
        <max_insert_threads>16</max_insert_threads>
    </default>
</profiles>
```

## Use Multiple NVMe Disks with JBOD

ClickHouse supports spreading data across multiple disks natively. Configure a multi-disk policy in `storage_configuration`:

```xml
<storage_configuration>
    <disks>
        <nvme1><path>/nvme1/clickhouse/</path></nvme1>
        <nvme2><path>/nvme2/clickhouse/</path></nvme2>
    </disks>
    <policies>
        <jbod>
            <volumes>
                <main>
                    <disk>nvme1</disk>
                    <disk>nvme2</disk>
                </main>
            </volumes>
        </jbod>
    </policies>
</storage_configuration>
```

Assign the policy to a table:

```sql
ALTER TABLE events MODIFY SETTING storage_policy = 'jbod';
```

## Monitor NVMe Performance

```bash
# I/O statistics
iostat -x -d nvme0n1 1 5

# NVMe smart data
sudo nvme smart-log /dev/nvme0
```

Check queue depth utilization:

```bash
cat /sys/block/nvme0n1/queue/nr_requests
```

## Summary

NVMe tuning for ClickHouse centers on using the `none` I/O scheduler, raising queue depths, increasing merge and insert concurrency, and optionally configuring JBOD across multiple NVMe devices. These changes allow ClickHouse to saturate NVMe bandwidth, achieving millions of row inserts per second and sub-second analytical queries.
