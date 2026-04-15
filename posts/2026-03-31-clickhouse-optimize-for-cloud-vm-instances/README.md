# How to Optimize ClickHouse for Cloud VM Instances

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: ClickHouse, Cloud, VM, Performance, AWS, GCP, Azure, Optimization

Description: Optimize ClickHouse deployments on cloud VM instances by tuning instance types, storage, network, and configuration for cost-efficient performance.

---

Running ClickHouse on cloud VMs introduces constraints not present on bare metal: shared hardware, network-attached storage, and variable performance. This guide covers how to choose and configure cloud VMs for ClickHouse workloads.

## Choose the Right Instance Type

ClickHouse is CPU and memory intensive. Prefer compute-optimized or memory-optimized instances:

- AWS: `r6i`, `c6i`, `m6i` families
- GCP: `n2-highmem`, `c2` families
- Azure: `Edsv5`, `Fsv2` families

For write-heavy workloads, local NVMe instances provide the best insert throughput:
- AWS: `i3`, `i4i` (NVMe local storage)
- GCP: `n2` with local SSD
- Azure: `Lsv3` (NVMe local storage)

## Use Instance Storage for Hot Data

Network-attached storage (EBS, Persistent Disk) has higher latency and lower IOPS than local NVMe. Use local storage for the active ClickHouse data directory and offload cold data to object storage:

```xml
<storage_configuration>
    <disks>
        <hot><path>/nvme/clickhouse/</path></hot>
        <cold>
            <type>s3</type>
            <endpoint>https://s3.amazonaws.com/my-bucket/clickhouse/</endpoint>
        </cold>
    </disks>
    <policies>
        <tiered>
            <volumes>
                <hot><disk>hot</disk><max_data_part_size_bytes>5368709120</max_data_part_size_bytes></hot>
                <cold><disk>cold</disk></cold>
            </volumes>
        </tiered>
    </policies>
</storage_configuration>
```

## Tune for Network Latency

Cloud VMs experience higher network RTT than bare metal. Increase TCP buffer sizes:

```bash
sudo sysctl -w net.core.rmem_max=134217728
sudo sysctl -w net.core.wmem_max=134217728
```

## Configure Memory Limits

Cloud VMs have fixed memory. Set ClickHouse memory limits to prevent OOM kills:

```xml
<max_server_memory_usage_to_ram_ratio>0.8</max_server_memory_usage_to_ram_ratio>
```

Per-query memory limit:

```sql
SET max_memory_usage = 10000000000;  -- 10 GB
```

## Use Spot/Preemptible Instances Safely

Spot instances can reduce costs 60-80%. Use them for read replicas:

```xml
<!-- Mark this node as a read replica -->
<remote_servers>
    <cluster>
        <shard>
            <replica>
                <host>read-replica-1</host>
                <port>9000</port>
            </replica>
        </shard>
    </cluster>
</remote_servers>
```

Ensure data is replicated to on-demand nodes before using spot instances for reads.

## Enable EBS-Optimized or Enhanced Networking

On AWS, always use EBS-optimized instances and enable enhanced networking:

```bash
# Check if enhanced networking is enabled
ethtool -i eth0 | grep driver
```

## Right-Size CPU Allocation

Set `max_threads` to the number of vCPUs:

```sql
SET max_threads = 32;  -- for a 32-vCPU instance
```

## Monitor Cloud-Specific Metrics

Track CPU credits on burstable instances and EBS throughput:

```sql
SELECT
    metric,
    value
FROM system.asynchronous_metrics
WHERE metric IN ('MemoryResident', 'BlockReadBytes', 'BlockWriteBytes')
ORDER BY metric;
```

## Summary

ClickHouse on cloud VMs performs best on memory-optimized instances with local NVMe storage, tiered to object storage for cold data. Set memory limits, increase TCP buffers, choose enhanced networking, and use spot instances only for read replicas to balance cost and reliability.
