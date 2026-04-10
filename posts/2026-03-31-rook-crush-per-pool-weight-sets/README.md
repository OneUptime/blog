# How to Configure Per-Pool Weight Sets in CRUSH

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Rook, Ceph, CRUSH, Weight Set, Storage

Description: Configure Ceph CRUSH per-pool weight sets to optimize data distribution independently for each pool using fine-tuned OSD weights.

---

## What are Per-Pool Weight Sets

Per-pool weight sets are an advanced Ceph CRUSH feature that lets each pool have its own set of OSD weights for the purpose of data placement optimization. Unlike compat weight sets (which apply a single weight adjustment shared across all pools), per-pool weight sets allow independently tuning distribution for each pool.

This is particularly useful when pools have very different workloads - for example, a small metadata pool and a large data pool - because the optimal weight distribution may differ between them.

## Requirements

Per-pool weight sets require:
- Ceph Luminous (12.x) or later
- All clients connecting to pools with per-pool weight sets must support the `CRUSH_TUNABLES5` and `CRUSH_CHOOSE_ARGS` features

```bash
# Check client compatibility
ceph features
ceph osd crush show-tunables | grep profile
```

## Enabling Per-Pool Weight Sets

Per-pool weight sets are created and managed using the `ceph osd crush weight-set` CLI commands. Create a weight set for a specific pool and then adjust individual OSD weights:

```bash
# Create a per-pool weight set (flat = single weight per item)
ceph osd crush weight-set create mypool flat

# Adjust weights for specific items in the pool's weight set
ceph osd crush weight-set reweight mypool osd.0 1.2
ceph osd crush weight-set reweight mypool osd.1 0.8

# List existing weight sets
ceph osd crush weight-set ls
```

## Manually Creating Per-Pool Weight Sets

You can also create per-pool weight sets directly via the CRUSH map:

```bash
ceph osd getcrushmap -o crush.bin
crushtool -d crush.bin -o crush.txt
```

In `crush.txt`, add per-pool weight sets inside a pool-specific stanza:

```text
# Per-pool weight set for pool ID 3
choose_args 3 {
    {
        bucket_id -1
        weight_set [
            [ 1.2 0.8 1.0 1.0 1.2 0.8 ]
        ]
    }
}
```

```bash
crushtool -c crush.txt -o crush-new.bin
ceph osd setcrushmap -i crush-new.bin
```

## Viewing Per-Pool Weight Sets

```bash
# Show choose_args (per-pool weight sets) in the CRUSH dump
ceph osd crush dump | python3 -m json.tool | grep -A30 "choose_args"

# Check how the balancer plans to optimize a specific pool
ceph balancer optimize myplan --pools mypool

# Show current optimization plan
ceph balancer show myplan
```

## Evaluating Per-Pool Distribution Quality

```bash
# Evaluate the distribution quality for a specific pool
ceph balancer eval mypool

# Evaluate all pools
ceph balancer eval

# Example output:
# pool mypool: score 0.028 (0.028 deviation from ideal)
# pool metadata: score 0.001 (0.001 deviation from ideal)
```

## Executing the Optimization Plan

```bash
# Generate and execute a plan targeting specific pools
ceph balancer optimize myplan
ceph balancer show myplan
ceph balancer execute myplan

# Monitor progress
watch -n 5 ceph -s
```

## Removing Per-Pool Weight Sets

```bash
# Remove weight sets for a specific pool
ceph osd crush weight-set rm mypool

# List and remove each pool's weight set individually
ceph osd crush weight-set ls
ceph osd crush weight-set rm mypool

# Verify
ceph osd crush dump | grep choose_args
```

## Summary

Per-pool weight sets give fine-grained control over data distribution by allowing each pool to have independent OSD weight adjustments. Create them using `ceph osd crush weight-set create` and adjust weights with the `reweight` subcommand. This approach is superior to compat weight sets when pools have significantly different size or workload characteristics, but requires all clients to support modern CRUSH features.
