# Capacity-Plan Aerospike for Memory, SSDs, and One-Node Failure

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Aerospike, Database, Performance, High Availability

Description: Build an Aerospike capacity estimate that includes replication, tombstones, index overhead, SSD headroom, and the load after losing one node.

A cluster that fits its data on a normal day can still fail during maintenance. Losing one node leaves fewer machines to serve requests and hold replacement copies. If the survivors cross a storage or memory threshold while rebuilding redundancy, an ordinary hardware failure becomes a write outage.

Capacity planning should therefore start with the smallest cluster you intend to operate, not just the number of machines you plan to buy. This guide develops a transparent estimate for **Aerospike Enterprise 8.2**, with records on SSD and primary indexes in shared memory. All-Flash indexes and memory-backed data need different component budgets.

The numerical example is hypothetical. It is a worksheet to replace with measurements, followed by a staging validation plan, not a hardware recommendation.

## Collect inputs that represent the real workload

Start with peak live records at the end of the planning horizon. Include growth explicitly and avoid applying it twice to a number that already includes the forecast. Record the average and tail of stored record sizes, updates per second, reads per second, expiry behavior, and delete bursts.

Application payload size is not stored record size. Stored records include metadata, bin information, keys when retained, and alignment effects. Compression changes data storage but does not eliminate the primary-index entry. Use a representative dataset and the official [record-sizing guidance](https://aerospike.com/docs/develop/data-modeling/record-sizing/) to estimate or measure the actual stored bytes.

Tombstones also consume index and storage resources. They are deletion markers retained until safe cleanup, and multi-record transaction monitors can create additional ones. Estimate peak retained tombstones from observed workload and cleanup behavior, not simply today's count. [Durable delete architecture](https://aerospike.com/docs/database/learn/architecture/durable-deletes/)

For this example, assume:

| Input | Illustrative value |
|---|---|
| Forecast peak live records | 600 million |
| Peak retained tombstones, unique-record equivalent | 20 million |
| Average stored live record | 1200 bytes |
| Average stored tombstone | 128 bytes |
| Replication factor | 2 |
| Healthy / one-node-down cluster | 6 / 5 nodes |
| Additional uneven-distribution allowance | 15% |
| Target data occupancy | 50% |

The tombstone size and distribution allowance are assumptions, not Aerospike constants. Replace both with evidence from your data model and cluster.

## Count copies once, then model the surviving nodes

Replication factor is the number of copies of each record within the namespace. A factor of two doubles the aggregate record storage before other allowances. It is not the number of additional copies beyond the master. [Namespace durability](https://aerospike.com/docs/database/manage/namespace/durability/)

A first estimate for a surviving node is:

```text
per-node copies = unique items × replication factor
                  ÷ surviving nodes × imbalance allowance
```

Here, a 15 percent allowance means multiplying by 1.15. Apply the same convention consistently to index and data estimates. Do not multiply a measured node count by replication again if that measurement already includes local master and replica copies.

This model assumes the remaining nodes can hold the intended replication factor and that placement is reasonably balanced. Rack placement, hot partitions, temporary migration copies, and unequal devices can create larger peaks. The formula is a starting point for those checks, not a simulation of cluster topology.

## Run a small, auditable calculator

The primary index uses 64 bytes per record entry before additional structures and allocation overhead. Aerospike's [capacity guide](https://aerospike.com/docs/database/manage/planning/capacity/) documents that base calculation. The script below adds tombstones to the entry count and budgets SSD capacity using target occupancy.

Run this with Python 3.9 or later. It uses only the standard library and makes no network or database calls. Save it as `capacity.py` and run `python3 capacity.py` after reviewing the assumptions.

```python
import math

LIVE = 600_000_000
TOMBSTONES = 20_000_000
LIVE_BYTES = 1200
TOMBSTONE_BYTES = 128
REPLICATION = 2
IMBALANCE = 1.15
TARGET_OCCUPANCY = 0.50
GIB = 1024 ** 3


def estimate(nodes):
    if nodes < REPLICATION:
        raise ValueError("Not enough nodes for the assumed replicas")
    multiplier = REPLICATION * IMBALANCE / nodes
    primary_used = math.ceil((LIVE + TOMBSTONES) * multiplier * 64)
    stored_data = (LIVE * LIVE_BYTES + TOMBSTONES * TOMBSTONE_BYTES)
    data_capacity = math.ceil(stored_data * multiplier / TARGET_OCCUPANCY)
    return primary_used, data_capacity


if __name__ == "__main__":
    for nodes in (6, 5):
        primary, capacity = estimate(nodes)
        print(f"{nodes} nodes: primary used {primary / GIB:.2f} GiB; "
              f"data capacity {capacity / GIB:.2f} GiB per node")
```

With these inputs, the output is 14.17 GiB of primary-index entry space and 515.92 GiB of data capacity per node for six nodes; for five nodes, it is 17.00 GiB and 619.10 GiB.

The five-node case should require 20 percent more per surviving node than the six-node case, before rounding: `6 / 5 = 1.2`. That increase comes from losing a node, independently of the 15 percent imbalance allowance. The script's primary-index output is used entry space, not the total RAM to provision. Its data-capacity output excludes device headers and other non-data allocations.

## Add the memory the simple formula omits

Budget secondary indexes, set indexes, primary-index structures, allocation rounding, process heap, connection buffers, write caches, the operating system, and other workloads. Secondary-index cost depends on what you index; a collection index can contribute multiple entries per record. Review the [indexing guide](https://aerospike.com/docs/develop/data-modeling/indexes/) instead of assigning every index the primary-index cost.

Aerospike allocates index arenas in stages. Used bytes can be lower than reserved stage capacity, and deletion does not immediately return every allocation to the operating system. Database 8.2 provides allocated, used, and tail-byte metrics to expose these differences. [Index allocation monitoring](https://aerospike.com/docs/database/observe/index-memory-allocation/)

Set `indexes-memory-budget` from the intended combined RAM-index usage, then ensure stage overhead and all other allocations still fit below the system-memory protection threshold. A passing configuration check is not a measured working-set guarantee. Containers also need the actual control-group memory limit considered. [Memory best practices](https://aerospike.com/docs/database/learn/best-practices/)

If moving primary indexes to Flash, replace the RAM-only index calculation with the documented sprig and mount sizing. Sprigs are groups of index-tree entries, and their allocation introduces storage and memory costs. Changing index placement shifts the bottleneck; it does not make index capacity free.

## Keep space for defragmentation and recovery

The example uses a 50 percent data-occupancy target to leave room for defragmentation. Aerospike's default low-water mark admits partially occupied blocks for consolidation; trying to use more space can increase the amount of live data rewritten during cleanup. [Disk and defragmentation FAQ](https://aerospike.com/docs/database/reference/faq/ops-disk-defrag/)

Add device-specific reserved space and check usable capacity after formatting or provisioning. Keep storage units consistent: GiB is based on powers of 1024, while a drive advertised in GB usually uses powers of 1000.

Then consider transient states. Rejoining a node, rebuilding copies, retaining tombstones, or importing a backup can produce a peak above the final balanced dataset. A capacity plan that fits only after all migrations finish leaves no room to reach that state.

## Size throughput under failure, not just bytes

A device large enough to hold the data may still be too slow. Test reads, writes, replication traffic, defragmentation, and migrations together. Include the actual durability and compression settings, record-size distribution, and hot-key behavior.

Aerospike's [advanced Flash sizing guide](https://aerospike.com/docs/database/manage/planning/ssd/advanced-sizing/) discusses how internal write amplification changes device requirements. Application writes per second are therefore not the same as physical device writes per second. Network and CPU capacity also need room for recovery traffic.

In a staging environment, establish a realistic baseline, remove one node through the planned maintenance procedure, and observe the survivors through recovery. Check tail latency, error rate, memory footprint, available write blocks, and migration progress. Verify that restored redundancy does not require crossing stop-writes thresholds.

The calculator was executed locally and checked for replication arithmetic, one-node-loss scaling, and the insufficient-node guard. No Aerospike workload or failure benchmark was run. Adopt node sizes only after the measured failure case supports both the resource budgets and the application's service targets.
