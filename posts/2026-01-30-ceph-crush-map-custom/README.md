# How to Create Ceph CRUSH Map Custom

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Ceph, Storage, Kubernetes, Infrastructure

Description: Customize Ceph CRUSH maps for optimal data placement with custom rules, buckets, failure domains, and device classes for performance and reliability.

---

## Introduction

CRUSH (Controlled Replication Under Scalable Hashing) is the algorithm that determines how Ceph stores and retrieves data across your cluster. Unlike traditional storage systems that rely on lookup tables, CRUSH computes data placement algorithmically. This makes Ceph highly scalable and eliminates single points of failure.

A custom CRUSH map gives you fine-grained control over:

- Where data replicas are placed
- How failure domains are structured
- Which device types store specific pools
- How data is distributed across racks, rows, or datacenters

This guide walks through creating, modifying, and deploying custom CRUSH maps with practical examples you can adapt for your environment.

## Prerequisites

Before working with CRUSH maps, ensure you have:

- A running Ceph cluster (Reef or later recommended)
- Administrative access to the cluster
- The `ceph` and `crushtool` utilities installed
- Basic understanding of Ceph pools and OSDs

Verify your cluster health before making changes:

```bash
# Check cluster status
ceph status

# List current OSDs
ceph osd tree

# View current CRUSH map summary
ceph osd crush dump | head -50
```

## Understanding CRUSH Map Structure

A CRUSH map consists of four main components:

| Component | Purpose | Example |
|-----------|---------|---------|
| Devices | Physical OSDs in the cluster | osd.0, osd.1, osd.2 |
| Buckets | Logical containers that group devices | hosts, racks, datacenters |
| Rules | Placement policies for pools | replicate_ssd, erasure_hdd |
| Tunables | Algorithm parameters | optimal, hammer, jewel |

### Hierarchy of Bucket Types

The default bucket type hierarchy from lowest to highest:

```
osd (device)
    └── host
        └── chassis
            └── rack
                └── row
                    └── pdu
                        └── pod
                            └── room
                                └── datacenter
                                    └── region
                                        └── root
```

You can define custom bucket types, but these defaults cover most use cases.

## Extracting the Current CRUSH Map

Start by extracting your current CRUSH map to use as a template.

Extract the binary CRUSH map from the cluster:

```bash
# Get the compiled CRUSH map
ceph osd getcrushmap -o /tmp/crushmap.bin

# Decompile to human-readable format
crushtool -d /tmp/crushmap.bin -o /tmp/crushmap.txt
```

View the decompiled map:

```bash
cat /tmp/crushmap.txt
```

A typical decompiled CRUSH map looks like this:

```
# begin crush map
tunable choose_local_tries 0
tunable choose_local_fallback_tries 0
tunable choose_total_tries 50
tunable chooseleaf_descend_once 1
tunable chooseleaf_vary_r 1
tunable chooseleaf_stable 1
tunable straw_calc_version 1
tunable allowed_bucket_algs 54

# devices
device 0 osd.0 class hdd
device 1 osd.1 class hdd
device 2 osd.2 class ssd
device 3 osd.3 class ssd

# types
type 0 osd
type 1 host
type 2 chassis
type 3 rack
type 4 row
type 5 pdu
type 6 pod
type 7 room
type 8 datacenter
type 9 region
type 10 root

# buckets
host node1 {
    id -2
    id -3 class hdd
    id -4 class ssd
    alg straw2
    hash 0
    item osd.0 weight 1.000
    item osd.2 weight 0.500
}

host node2 {
    id -5
    id -6 class hdd
    id -7 class ssd
    alg straw2
    hash 0
    item osd.1 weight 1.000
    item osd.3 weight 0.500
}

root default {
    id -1
    alg straw2
    hash 0
    item node1 weight 1.500
    item node2 weight 1.500
}

# rules
rule replicated_rule {
    id 0
    type replicated
    step take default
    step chooseleaf firstn 0 type host
    step emit
}
```

## Creating Custom Bucket Hierarchies

Let us build a CRUSH map for a multi-rack datacenter with mixed SSD and HDD storage.

### Defining the Physical Layout

Consider this cluster layout:

| Rack | Host | SSDs | HDDs |
|------|------|------|------|
| rack1 | storage01 | osd.0, osd.1 | osd.2, osd.3, osd.4 |
| rack1 | storage02 | osd.5, osd.6 | osd.7, osd.8, osd.9 |
| rack2 | storage03 | osd.10, osd.11 | osd.12, osd.13, osd.14 |
| rack2 | storage04 | osd.15, osd.16 | osd.17, osd.18, osd.19 |

### Writing the CRUSH Map

Create a new file `/tmp/custom-crushmap.txt`:

```
# Custom CRUSH map for multi-rack datacenter
# Optimized for mixed SSD/HDD workloads

# Tunables - use optimal settings for modern Ceph
tunable choose_local_tries 0
tunable choose_local_fallback_tries 0
tunable choose_total_tries 50
tunable chooseleaf_descend_once 1
tunable chooseleaf_vary_r 1
tunable chooseleaf_stable 1
tunable straw_calc_version 1
tunable allowed_bucket_algs 54

# Device definitions
# Format: device <id> <name> class <device-class>
device 0 osd.0 class ssd
device 1 osd.1 class ssd
device 2 osd.2 class hdd
device 3 osd.3 class hdd
device 4 osd.4 class hdd
device 5 osd.5 class ssd
device 6 osd.6 class ssd
device 7 osd.7 class hdd
device 8 osd.8 class hdd
device 9 osd.9 class hdd
device 10 osd.10 class ssd
device 11 osd.11 class ssd
device 12 osd.12 class hdd
device 13 osd.13 class hdd
device 14 osd.14 class hdd
device 15 osd.15 class ssd
device 16 osd.16 class ssd
device 17 osd.17 class hdd
device 18 osd.18 class hdd
device 19 osd.19 class hdd

# Bucket types - standard hierarchy
type 0 osd
type 1 host
type 2 chassis
type 3 rack
type 4 row
type 5 pdu
type 6 pod
type 7 room
type 8 datacenter
type 9 region
type 10 root

# Host buckets - each physical server
# Weight is in terabytes (1.0 = 1TB)

host storage01 {
    id -2
    alg straw2
    hash 0  # rjenkins1 hash
    item osd.0 weight 0.500   # 500GB SSD
    item osd.1 weight 0.500   # 500GB SSD
    item osd.2 weight 4.000   # 4TB HDD
    item osd.3 weight 4.000   # 4TB HDD
    item osd.4 weight 4.000   # 4TB HDD
}

host storage02 {
    id -3
    alg straw2
    hash 0
    item osd.5 weight 0.500
    item osd.6 weight 0.500
    item osd.7 weight 4.000
    item osd.8 weight 4.000
    item osd.9 weight 4.000
}

host storage03 {
    id -4
    alg straw2
    hash 0
    item osd.10 weight 0.500
    item osd.11 weight 0.500
    item osd.12 weight 4.000
    item osd.13 weight 4.000
    item osd.14 weight 4.000
}

host storage04 {
    id -5
    alg straw2
    hash 0
    item osd.15 weight 0.500
    item osd.16 weight 0.500
    item osd.17 weight 4.000
    item osd.18 weight 4.000
    item osd.19 weight 4.000
}

# Rack buckets - group hosts by physical rack
rack rack1 {
    id -6
    alg straw2
    hash 0
    item storage01 weight 13.000
    item storage02 weight 13.000
}

rack rack2 {
    id -7
    alg straw2
    hash 0
    item storage03 weight 13.000
    item storage04 weight 13.000
}

# Root bucket - top of the hierarchy
root default {
    id -1
    alg straw2
    hash 0
    item rack1 weight 26.000
    item rack2 weight 26.000
}

# Placement rules defined below
```

## Defining CRUSH Rules

CRUSH rules control how data is placed. Each rule specifies:

1. Which bucket to start from (take)
2. How to traverse the hierarchy (choose/chooseleaf)
3. The failure domain (host, rack, etc.)

### Rule Syntax Breakdown

| Step | Purpose | Example |
|------|---------|---------|
| take | Select starting bucket | take default |
| choose | Select N buckets of type | choose firstn 2 type rack |
| chooseleaf | Select N leaves under type | chooseleaf firstn 0 type host |
| emit | Output selected OSDs | emit |

The `firstn 0` means "use the pool's replication count."

### Standard Replication Rules

Add these rules to your CRUSH map:

```
# Rule for replicated pools - distribute across racks
rule replicated_rack {
    id 0
    type replicated
    # Start at the root of our hierarchy
    step take default
    # Choose OSDs from different hosts, ensuring rack distribution
    step chooseleaf firstn 0 type host
    step emit
}

# Rule specifically for 3-way replication across racks
# Ensures at least one replica in each rack
rule replicated_cross_rack {
    id 1
    type replicated
    step take default
    # First, choose racks
    step choose firstn 0 type rack
    # Then choose one OSD from different hosts within each rack
    step chooseleaf firstn 1 type host
    step emit
}
```

### Device Class Rules

Device classes let you target specific storage tiers. Create rules that only use SSDs or HDDs:

```
# Rule for SSD-only pools (databases, hot data)
rule ssd_only {
    id 2
    type replicated
    # Take only devices with class 'ssd'
    step take default class ssd
    step chooseleaf firstn 0 type host
    step emit
}

# Rule for HDD-only pools (archives, cold data)
rule hdd_only {
    id 3
    type replicated
    # Take only devices with class 'hdd'
    step take default class hdd
    step chooseleaf firstn 0 type host
    step emit
}

# Rule for SSD pools with rack-level failure domain
rule ssd_cross_rack {
    id 4
    type replicated
    step take default class ssd
    step choose firstn 0 type rack
    step chooseleaf firstn 1 type host
    step emit
}
```

### Erasure Coding Rules

For erasure-coded pools, the rule type changes:

```
# Rule for erasure coded pools
# EC pools need more OSDs than replicated pools
rule erasure_hdd {
    id 5
    type erasure
    step take default class hdd
    # For EC, we need at least k+m OSDs
    # Use host-level failure domain
    step chooseleaf firstn 0 type host
    step emit
}

# Erasure coding across racks for maximum durability
rule erasure_cross_rack {
    id 6
    type erasure
    step take default class hdd
    step choose firstn 0 type rack
    step chooseleaf firstn 1 type host
    step emit
}
```

## Complete Custom CRUSH Map Example

Here is the full CRUSH map combining all elements:

```
# Complete custom CRUSH map
# Datacenter: dc1
# Layout: 2 racks, 4 hosts, mixed SSD/HDD

tunable choose_local_tries 0
tunable choose_local_fallback_tries 0
tunable choose_total_tries 50
tunable chooseleaf_descend_once 1
tunable chooseleaf_vary_r 1
tunable chooseleaf_stable 1
tunable straw_calc_version 1
tunable allowed_bucket_algs 54

# Devices
device 0 osd.0 class ssd
device 1 osd.1 class ssd
device 2 osd.2 class hdd
device 3 osd.3 class hdd
device 4 osd.4 class hdd
device 5 osd.5 class ssd
device 6 osd.6 class ssd
device 7 osd.7 class hdd
device 8 osd.8 class hdd
device 9 osd.9 class hdd
device 10 osd.10 class ssd
device 11 osd.11 class ssd
device 12 osd.12 class hdd
device 13 osd.13 class hdd
device 14 osd.14 class hdd
device 15 osd.15 class ssd
device 16 osd.16 class ssd
device 17 osd.17 class hdd
device 18 osd.18 class hdd
device 19 osd.19 class hdd

# Types
type 0 osd
type 1 host
type 2 chassis
type 3 rack
type 4 row
type 5 pdu
type 6 pod
type 7 room
type 8 datacenter
type 9 region
type 10 root

# Hosts
host storage01 {
    id -2
    alg straw2
    hash 0
    item osd.0 weight 0.500
    item osd.1 weight 0.500
    item osd.2 weight 4.000
    item osd.3 weight 4.000
    item osd.4 weight 4.000
}

host storage02 {
    id -3
    alg straw2
    hash 0
    item osd.5 weight 0.500
    item osd.6 weight 0.500
    item osd.7 weight 4.000
    item osd.8 weight 4.000
    item osd.9 weight 4.000
}

host storage03 {
    id -4
    alg straw2
    hash 0
    item osd.10 weight 0.500
    item osd.11 weight 0.500
    item osd.12 weight 4.000
    item osd.13 weight 4.000
    item osd.14 weight 4.000
}

host storage04 {
    id -5
    alg straw2
    hash 0
    item osd.15 weight 0.500
    item osd.16 weight 0.500
    item osd.17 weight 4.000
    item osd.18 weight 4.000
    item osd.19 weight 4.000
}

# Racks
rack rack1 {
    id -6
    alg straw2
    hash 0
    item storage01 weight 13.000
    item storage02 weight 13.000
}

rack rack2 {
    id -7
    alg straw2
    hash 0
    item storage03 weight 13.000
    item storage04 weight 13.000
}

# Root
root default {
    id -1
    alg straw2
    hash 0
    item rack1 weight 26.000
    item rack2 weight 26.000
}

# Rules
rule replicated_rack {
    id 0
    type replicated
    step take default
    step chooseleaf firstn 0 type host
    step emit
}

rule replicated_cross_rack {
    id 1
    type replicated
    step take default
    step choose firstn 0 type rack
    step chooseleaf firstn 1 type host
    step emit
}

rule ssd_only {
    id 2
    type replicated
    step take default class ssd
    step chooseleaf firstn 0 type host
    step emit
}

rule hdd_only {
    id 3
    type replicated
    step take default class hdd
    step chooseleaf firstn 0 type host
    step emit
}

rule ssd_cross_rack {
    id 4
    type replicated
    step take default class ssd
    step choose firstn 0 type rack
    step chooseleaf firstn 1 type host
    step emit
}

rule erasure_hdd {
    id 5
    type erasure
    step take default class hdd
    step chooseleaf firstn 0 type host
    step emit
}

rule erasure_cross_rack {
    id 6
    type erasure
    step take default class hdd
    step choose firstn 0 type rack
    step chooseleaf firstn 1 type host
    step emit
}
```

## Compiling and Injecting the CRUSH Map

### Validate the CRUSH Map

Before applying changes, validate the syntax:

```bash
# Compile the text file to binary format
crushtool -c /tmp/custom-crushmap.txt -o /tmp/custom-crushmap.bin
```

If there are syntax errors, crushtool will report line numbers and error descriptions.

### Test the CRUSH Map Locally

Test placement without applying to the cluster:

```bash
# Simulate placement for a 3-replica pool using rule 0
crushtool -i /tmp/custom-crushmap.bin --test \
    --min-x 0 --max-x 100 \
    --num-rep 3 \
    --rule 0 \
    --show-mappings

# Check placement statistics
crushtool -i /tmp/custom-crushmap.bin --test \
    --min-x 0 --max-x 1000 \
    --num-rep 3 \
    --rule 0 \
    --show-statistics
```

### Test Device Class Rules

Verify that device class rules only select appropriate OSDs:

```bash
# Test SSD-only rule (rule 2)
crushtool -i /tmp/custom-crushmap.bin --test \
    --min-x 0 --max-x 50 \
    --num-rep 3 \
    --rule 2 \
    --show-mappings | head -20

# Test HDD-only rule (rule 3)
crushtool -i /tmp/custom-crushmap.bin --test \
    --min-x 0 --max-x 50 \
    --num-rep 3 \
    --rule 3 \
    --show-mappings | head -20
```

### Inject the CRUSH Map

Apply the new CRUSH map to the cluster:

```bash
# Set the new CRUSH map
ceph osd setcrushmap -i /tmp/custom-crushmap.bin

# Verify the change
ceph osd crush dump | head -100

# Watch for data rebalancing
ceph -w
```

**Warning**: Changing the CRUSH map triggers data movement. Plan for increased cluster load during rebalancing.

## Using CLI Commands for CRUSH Modifications

For smaller changes, use CLI commands instead of editing the full map.

### Managing Buckets

```bash
# Create a new rack bucket
ceph osd crush add-bucket rack3 rack

# Move the rack under root
ceph osd crush move rack3 root=default

# Create a new host
ceph osd crush add-bucket storage05 host

# Move host to rack
ceph osd crush move storage05 rack=rack3

# Add an OSD to a host with weight
ceph osd crush add osd.20 4.0 host=storage05
```

### Managing Device Classes

```bash
# View current device classes
ceph osd crush class ls

# View OSDs in each class
ceph osd crush class ls-osd ssd
ceph osd crush class ls-osd hdd

# Change an OSD's device class
ceph osd crush rm-device-class osd.0
ceph osd crush set-device-class nvme osd.0

# Create a new device class
ceph osd crush class create nvme
```

### Managing Rules

```bash
# List existing rules
ceph osd crush rule ls

# View a specific rule
ceph osd crush rule dump replicated_rack

# Create a simple replicated rule via CLI
ceph osd crush rule create-replicated my_rule default host

# Create a rule for a specific device class
ceph osd crush rule create-replicated ssd_rule default host ssd

# Remove a rule (must not be in use by any pool)
ceph osd crush rule rm old_rule
```

## Creating Pools with Custom Rules

After defining rules, create pools that use them:

```bash
# Create a replicated pool using SSD-only rule
ceph osd pool create fast_pool 128 128 replicated ssd_only

# Create a replicated pool with HDD rule
ceph osd pool create archive_pool 256 256 replicated hdd_only

# Create an erasure coded pool
# First, create an EC profile
ceph osd erasure-code-profile set ec_4_2 \
    k=4 m=2 \
    crush-failure-domain=host \
    crush-device-class=hdd

# Create the EC pool
ceph osd pool create ec_data 256 256 erasure ec_4_2

# Associate the EC pool with a CRUSH rule
ceph osd pool set ec_data crush_rule erasure_hdd
```

### Verifying Pool Placement

Check that data is placed according to your rules:

```bash
# Check which OSDs a pool uses
ceph pg ls-by-pool fast_pool | head -20

# Map a specific object to see its placement
ceph osd map fast_pool testobject

# Check pool's CRUSH rule
ceph osd pool get fast_pool crush_rule
```

## Advanced CRUSH Configurations

### Multi-Datacenter Setup

For clusters spanning multiple datacenters:

```
# Additional datacenter bucket type usage
datacenter dc1 {
    id -10
    alg straw2
    hash 0
    item rack1 weight 26.000
    item rack2 weight 26.000
}

datacenter dc2 {
    id -11
    alg straw2
    hash 0
    item rack3 weight 26.000
    item rack4 weight 26.000
}

root default {
    id -1
    alg straw2
    hash 0
    item dc1 weight 52.000
    item dc2 weight 52.000
}

# Rule to ensure replicas span datacenters
rule replicated_cross_dc {
    id 10
    type replicated
    step take default
    step choose firstn 0 type datacenter
    step chooseleaf firstn 1 type host
    step emit
}
```

### Weighted Failure Domains

Control replica distribution with choose statements:

```
# Place 2 replicas in dc1, 1 in dc2
rule primary_dc1 {
    id 11
    type replicated
    step take dc1
    step chooseleaf firstn 2 type host
    step emit
    step take dc2
    step chooseleaf firstn 1 type host
    step emit
}
```

### Custom Bucket Algorithms

Different algorithms for different use cases:

| Algorithm | Use Case | Behavior |
|-----------|----------|----------|
| uniform | Identical devices | Fast, no weights |
| list | Expanding clusters | Optimal for growth |
| tree | Balanced selection | Logarithmic lookup |
| straw | Legacy weighted | Slower calculation |
| straw2 | Default, weighted | Best for most cases |

Example using different algorithms:

```
# Use uniform for identical SSDs
host ssd_host {
    id -20
    alg uniform
    hash 0
    item osd.100 weight 1.000
    item osd.101 weight 1.000
    item osd.102 weight 1.000
    item osd.103 weight 1.000
}
```

## Troubleshooting CRUSH Issues

### Common Problems and Solutions

**Problem**: PGs stuck in "undersized" or "incomplete" state

```bash
# Check which OSDs are in the PG
ceph pg 1.0 query | jq '.acting'

# Verify CRUSH can find enough OSDs
crushtool -i /tmp/crushmap.bin --test \
    --num-rep 3 --rule 0 \
    --show-bad-mappings
```

**Problem**: Uneven data distribution

```bash
# Check OSD utilization
ceph osd df tree

# Adjust OSD weights (reweight for temporary, crush-reweight for permanent)
ceph osd reweight osd.5 0.9
ceph osd crush reweight osd.5 3.5
```

**Problem**: Rule cannot find enough OSDs

```bash
# Test rule with verbose output
crushtool -i /tmp/crushmap.bin --test \
    --num-rep 3 --rule 2 \
    --show-choose-tries

# Ensure enough OSDs exist in the device class
ceph osd crush class ls-osd ssd | wc -l
```

### Monitoring CRUSH Performance

```bash
# Watch rebalancing progress
ceph -w

# Check for slow requests during rebalancing
ceph health detail

# Monitor OSD performance during data movement
ceph osd perf

# View pg distribution
ceph pg dump pgs_brief | awk '{print $NF}' | sort | uniq -c | sort -rn
```

## Best Practices

### Planning Your CRUSH Hierarchy

1. **Map your physical layout first** - Draw your datacenter, racks, and hosts before writing the CRUSH map
2. **Choose appropriate failure domains** - Match replica distribution to your availability requirements
3. **Use device classes** - Separate fast (SSD/NVMe) and slow (HDD) storage at the CRUSH level
4. **Test before deploying** - Use crushtool to simulate placement

### Weight Management

| Scenario | Action |
|----------|--------|
| New OSD added | Set weight to actual capacity in TB |
| OSD failing frequently | Reduce weight to limit data on it |
| Decommissioning OSD | Set weight to 0, wait for rebalance, then remove |
| Capacity expansion | Gradually increase weight to control rebalance speed |

### Migration Strategies

When changing CRUSH rules, minimize disruption:

```bash
# Set the balancer mode
ceph balancer mode upmap

# Enable the balancer
ceph balancer on

# Limit backfill and recovery operations
ceph tell 'osd.*' injectargs --osd-max-backfills=1
ceph tell 'osd.*' injectargs --osd-recovery-max-active=1

# Apply CRUSH changes during low-traffic periods
ceph osd setcrushmap -i /tmp/custom-crushmap.bin

# Monitor progress
watch ceph -s
```

## Summary

Custom CRUSH maps give you precise control over data placement in Ceph. The key concepts covered:

- **Buckets** define your physical and logical hierarchy
- **Rules** specify placement policies for different pool types
- **Device classes** separate storage tiers (SSD, HDD, NVMe)
- **Failure domains** control how replicas are distributed

Start with a simple hierarchy and add complexity as needed. Always test changes with crushtool before applying to production, and monitor cluster health during and after CRUSH map changes.

For production environments, consider using Ceph's CLI commands for incremental changes rather than replacing the entire CRUSH map. This approach is safer and easier to audit.

## References

- [Ceph CRUSH Map Documentation](https://docs.ceph.com/en/latest/rados/operations/crush-map/)
- [CRUSH Algorithm Paper](https://ceph.com/assets/pdfs/weil-crush-sc06.pdf)
- [Ceph OSD Management](https://docs.ceph.com/en/latest/rados/operations/add-or-rm-osds/)
- [Erasure Coding in Ceph](https://docs.ceph.com/en/latest/rados/operations/erasure-code/)
