# How to Create Dedicated CRUSH Rules for Cache Pool Drives

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Ceph, Rook, CRUSH, Cache Tiering, SSD

Description: Create dedicated CRUSH rules that pin Ceph cache pools to SSD or NVMe drives, ensuring cache data never lands on HDD storage devices.

---

## Why Dedicated CRUSH Rules for Cache

Cache tiering is only effective when the cache pool uses faster storage than the backing pool. Without a dedicated CRUSH rule, Ceph may place cache pool data on the same HDDs as the backing pool, eliminating any performance benefit.

Dedicated CRUSH rules ensure the cache pool exclusively uses SSD or NVMe drives.

## Step 1 - Label OSDs with Device Classes

First, assign device classes to your OSDs based on their hardware:

```bash
# Set SSD class
ceph osd crush set-device-class ssd osd.0 osd.1 osd.2

# Set NVMe class (for highest performance)
ceph osd crush set-device-class nvme osd.6 osd.7

# Set HDD class for spinning disks
ceph osd crush set-device-class hdd osd.3 osd.4 osd.5

# Verify classes
ceph osd tree
```

If Ceph cannot auto-detect device class (it uses `rotational` kernel hint by default), set it manually as shown above.

## Step 2 - Create a CRUSH Rule for SSD Drives

Ceph provides a shortcut for creating device-class-specific rules:

```bash
# Create a replicated rule that only uses SSD devices
ceph osd crush rule create-replicated ssd-rule default host ssd

# Verify the rule was created
ceph osd crush rule ls
ceph osd crush rule dump ssd-rule
```

The parameters:
- `ssd-rule` - name of the new rule
- `default` - root bucket to start from
- `host` - failure domain (replicas across different hosts)
- `ssd` - device class to filter (only SSD OSDs)

## Step 3 - Create CRUSH Rule via CRUSH Map (Advanced)

For more control, edit the CRUSH map directly:

```bash
# Extract the CRUSH map
ceph osd getcrushmap -o /tmp/crushmap.bin
crushtool -d /tmp/crushmap.bin -o /tmp/crushmap.txt
```

Add a rule targeting SSDs:

```text
rule ssd_cache_rule {
    id 10
    type replicated
    min_size 1
    max_size 10
    step take default class ssd
    step chooseleaf firstn 0 type host
    step emit
}
```

```bash
# Recompile and inject
crushtool -c /tmp/crushmap.txt -o /tmp/crushmap_new.bin
ceph osd setcrushmap -i /tmp/crushmap_new.bin
```

## Step 4 - Apply the Rule to the Cache Pool

```bash
# Create the cache pool with the SSD rule
ceph osd pool create ssd-cache-pool 64 64 replicated ssd-rule

# Or apply to an existing pool
ceph osd pool set existing-cache-pool crush_rule ssd-rule

# Verify
ceph osd pool get ssd-cache-pool crush_rule
```

## Step 5 - Verify Placement

Confirm the cache pool PGs are landing on SSD OSDs:

```bash
# Check which OSDs hold PGs for the cache pool
ceph pg ls-by-pool ssd-cache-pool

# Cross-reference with SSD OSD list
ceph osd tree | grep ssd
```

## Step 6 - Set Up the Cache Tier Relationship

```bash
# Assume backing pool uses HDD rule (default)
ceph osd pool create hdd-backing-pool 128 128 replicated hdd-rule

# Link the pools
ceph osd tier add hdd-backing-pool ssd-cache-pool
ceph osd tier cache-mode ssd-cache-pool writeback
ceph osd tier set-overlay hdd-backing-pool ssd-cache-pool

# Configure cache settings
ceph osd pool set ssd-cache-pool hit_set_type bloom
ceph osd pool set ssd-cache-pool hit_set_count 4
ceph osd pool set ssd-cache-pool hit_set_period 3600
ceph osd pool set ssd-cache-pool target_max_bytes 107374182400
ceph osd pool set ssd-cache-pool min_read_recency_for_promote 2
```

## Separating SSD and HDD in the CRUSH Hierarchy

For a fully isolated hierarchy, create separate CRUSH roots for each device class:

```bash
# This is handled automatically by device classes in Ceph Luminous+
# Each device class gets a "shadow" CRUSH hierarchy

# View the shadow hierarchies
ceph osd crush tree --show-shadow
```

## Testing the Rule

Verify data is landing on the correct OSDs:

```bash
# Map a test object
ceph osd map ssd-cache-pool testobject

# Verify the mapped OSDs are SSD-class
ceph osd find <osd-id>
```

## Rook Configuration

In Rook, set the CRUSH device class in the CephBlockPool spec:

```yaml
apiVersion: ceph.rook.io/v1
kind: CephBlockPool
metadata:
  name: ssd-cache
  namespace: rook-ceph
spec:
  failureDomain: host
  deviceClass: ssd
  replicated:
    size: 3
```

## Summary

Creating dedicated CRUSH rules for cache pools ensures that all cache data resides on fast SSD or NVMe storage. The process involves labeling OSDs with device classes (`ceph osd crush set-device-class`), creating a device-class-specific CRUSH rule (`ceph osd crush rule create-replicated`), and applying that rule to the cache pool. This guarantees physical separation between the fast cache tier and the slow backing tier, which is a prerequisite for cache tiering to provide any performance benefit.
