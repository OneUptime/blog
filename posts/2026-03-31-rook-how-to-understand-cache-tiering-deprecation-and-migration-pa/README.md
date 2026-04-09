# How to Understand Cache Tiering Deprecation in Ceph

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Ceph, Rook, Cache Tiering, Deprecation, Migration

Description: Understand why Ceph cache tiering is deprecated, its known limitations, and how to migrate workloads to modern alternatives like BlueStore caching and RGW tiering.

---

## Cache Tiering Is Deprecated

As of Ceph Pacific (16.x), cache tiering is officially deprecated. The Ceph documentation states:

> "We do not recommend deploying cache tiering in new clusters. Cache tiering implementation is fragile and is not recommended for production use."

This is a significant warning for anyone considering cache tiering for new deployments.

## Why Cache Tiering Is Being Removed

### Architectural Complexity

Cache tiering adds significant complexity to the RADOS layer. The flush/evict/promote state machine has many edge cases that can lead to:

- Unfound objects (objects lost between cache and backing pool)
- Stuck PGs that block I/O indefinitely
- Split-brain scenarios during OSD failures
- Complex debugging requirements

### Performance Problems

Contrary to expectations, cache tiering often does not improve performance:

- Write latency is unpredictable (depends on flush timing)
- Cache misses cause double I/O (read from backing + write to cache)
- Promotion overhead can overwhelm the cache pool
- The backing pool still gets random I/O during scrubbing and recovery

### Better Alternatives Exist

Modern Ceph has better ways to achieve the goals that cache tiering was meant to address:

```text
Old Cache Tiering Goal    | Modern Alternative
SSD caching for HDDs      | BlueStore WAL/DB on SSD
Hot/cold data separation  | Separate pools with different CRUSH rules
Object lifecycle          | RGW lifecycle policies (S3-compatible)
Tiered object storage     | RGW storage classes (cloud transition)
```

## What Replaced Cache Tiering

### BlueStore RocksDB and WAL on SSD

The most common cache tiering use case was "use SSD for hot data, HDD for bulk." BlueStore achieves this more reliably by placing its metadata (RocksDB) and WAL (write-ahead log) on SSD while data lives on HDD:

```yaml
# Rook CephCluster example: DB/WAL on NVMe, data on HDD
spec:
  storage:
    nodes:
    - name: "node1"
      devices:
      - name: "sda"  # HDD for data
        config:
          metadataDevice: "nvme0n1"  # NVMe for DB/WAL
          deviceClass: hdd
```

### RGW Storage Classes and Lifecycle Policies

For object storage tiering (moving old objects to cheaper storage), RGW now supports S3-compatible lifecycle policies and storage classes:

```bash
# Create a lifecycle policy that moves objects to cold storage
# (Configured via S3 API or radosgw-admin)
cat > lifecycle.json << 'EOF'
{
  "Rules": [
    {
      "ID": "move-to-cold",
      "Status": "Enabled",
      "Filter": {"Prefix": ""},
      "Transitions": [
        {
          "Days": 30,
          "StorageClass": "COLD"
        }
      ]
    }
  ]
}
EOF

aws s3api put-bucket-lifecycle-configuration \
  --bucket mybucket \
  --lifecycle-configuration file://lifecycle.json
```

### Separate Pools by Device Class

Use CRUSH device classes to create separate pools for different hardware:

```bash
# SSD pool for hot data
ceph osd pool create hot-pool 64 64 replicated
ceph osd pool set hot-pool crush_rule ssd_rule

# HDD pool for cold data
ceph osd pool create cold-pool 128 128 replicated
ceph osd pool set cold-pool crush_rule hdd_rule
```

## Migrating Away from Cache Tiering

If you have existing cache tiering, here is the migration process:

### Step 1 - Flush All Dirty Objects

```bash
# Switch cache to forward mode (no new promotions)
ceph osd tier cache-mode <cache-pool> forward

# Flush all remaining dirty objects to backing pool
rados -p <cache-pool> cache-flush-evict-all

# Watch cluster log for flush completion
ceph -w
```

### Step 2 - Remove the Cache Tier

```bash
# Remove the overlay
ceph osd tier remove-overlay <backing-pool>

# Remove the tier relationship
ceph osd tier remove <backing-pool> <cache-pool>

# Delete the cache pool if no longer needed
ceph osd pool delete <cache-pool> <cache-pool> --yes-i-really-really-mean-it
```

### Step 3 - Migrate to Modern Architecture

Move workloads to separate SSD/HDD pools or configure BlueStore with SSD for metadata:

```bash
# Check if OSDs have device class set
ceph osd tree
ceph osd df | grep class

# Set device class if needed
ceph osd crush set-device-class ssd osd.0 osd.1
ceph osd crush set-device-class hdd osd.2 osd.3
```

## Summary

Ceph cache tiering is deprecated as of Pacific and will be removed in a future release due to its complexity, fragility, and poor performance characteristics in real-world deployments. The recommended migration path is to use BlueStore's built-in SSD support for WAL and RocksDB metadata, use CRUSH device classes to separate SSD and HDD pools explicitly, and use RGW lifecycle policies for object storage tiering. Existing cache tier deployments should be migrated during the next maintenance window.
