# How to Configure Multipath Load Balancing Policies on RHEL

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: RHEL, DM-Multipath, Load Balancing, Storage Performance, Linux

Description: Configure DM-Multipath load balancing policies on RHEL to distribute I/O across multiple storage paths for improved throughput.

---

DM-Multipath supports several load balancing policies that determine how I/O requests are distributed across available paths. The right policy depends on your storage array type, workload characteristics, and whether the array supports active/active access.

## Path Grouping Policies

The `path_grouping_policy` determines how paths are organized into groups:

### failover

```bash
path_grouping_policy failover
```

Each path in its own group. Only one group active at a time. Simplest and safest.

### multibus

```bash
path_grouping_policy multibus
```

All paths in a single group. I/O is spread across all paths. Use when all paths are active/active.

### group_by_prio

```bash
path_grouping_policy group_by_prio
```

Paths are grouped by their priority value. The highest priority group is active. Use with ALUA-capable arrays.

### group_by_node_name

```bash
path_grouping_policy group_by_node_name
```

Paths are grouped by the target node name. All paths to the same controller are in one group.

## Path Selectors

Within a path group, the `path_selector` determines which path gets the next I/O:

### round-robin

```bash
path_selector "round-robin 0"
```

Alternates between paths. Simple and effective for uniform paths. The `0` means no additional argument.

### queue-length

```bash
path_selector "queue-length 0"
```

Sends I/O to the path with the fewest outstanding requests. Good when paths have different latencies.

### service-time

```bash
path_selector "service-time 0"
```

Sends I/O to the path with the shortest estimated service time. Takes into account both queue depth and path throughput. This is often the best choice for active/active configurations.

## Configuring for Active/Active Arrays

For storage arrays that support active/active access on all ports:

```bash
defaults {
    path_grouping_policy multibus
    path_selector "service-time 0"
    failback immediate
    rr_min_io_rq 1
}
```

The `rr_min_io_rq` parameter controls how many I/O requests are sent down one path before switching to the next:

```bash
# Send 1 request per path (finest-grained balancing)
rr_min_io_rq 1

# Send 10 requests per path (less switching overhead)
rr_min_io_rq 10

# Send 100 requests per path (coarser balancing)
rr_min_io_rq 100
```

Lower values distribute I/O more evenly but add overhead from path switching. Higher values reduce overhead but may result in less even distribution.

## Configuring for Active/Passive Arrays (ALUA)

For arrays using ALUA (Asymmetric Logical Unit Access):

```bash
defaults {
    path_grouping_policy group_by_prio
    prio alua
    path_selector "service-time 0"
    failback immediate
}
```

This groups paths by their ALUA state (active/optimized vs active/non-optimized) and uses the optimized paths first.

## Per-Device Configuration

Different LUNs can use different policies:

```bash
multipaths {
    multipath {
        wwid 3600508b4000c4a37
        alias db_data
        path_grouping_policy multibus
        path_selector "service-time 0"
        rr_min_io_rq 1
    }
    multipath {
        wwid 3600508b4000c4a38
        alias backup_vol
        path_grouping_policy failover
    }
}
```

## Verifying the Active Policy

```bash
# Check the policy for each multipath device
sudo multipath -ll
```

Look for the `policy=` field in the output:

```bash
db_data (3600508b4000c4a37) dm-0 ...
size=100G features='0' hwhandler='0' wp=rw
`-+- policy='service-time 0' prio=50 status=active
  |- 3:0:0:0 sdb 8:16 active ready running
  |- 3:0:1:0 sdc 8:32 active ready running
  |- 4:0:0:0 sdd 8:48 active ready running
  `- 4:0:1:0 sde 8:64 active ready running
```

## Benchmarking

Test the impact of different policies:

```bash
# Install fio
sudo dnf install -y fio

# Random read test
sudo fio --filename=/dev/mapper/db_data --direct=1 --rw=randread \
    --bs=4k --ioengine=libaio --iodepth=64 --runtime=30 \
    --numjobs=4 --group_reporting --name=test

# Sequential write test
sudo fio --filename=/dev/mapper/db_data --direct=1 --rw=write \
    --bs=1M --ioengine=libaio --iodepth=32 --runtime=30 \
    --numjobs=1 --group_reporting --name=test
```

Compare results between `round-robin`, `queue-length`, and `service-time` to find the best policy for your workload.

## Conclusion

The right load balancing policy depends on your storage array and workload. Use `multibus` with `service-time` for active/active arrays, `group_by_prio` with `alua` for ALUA arrays, and `failover` when you need simplicity or the array only supports active/passive. Benchmark with your actual workload to confirm which policy gives the best performance.
