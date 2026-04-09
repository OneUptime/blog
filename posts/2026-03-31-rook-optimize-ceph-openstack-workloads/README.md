# How to Optimize Ceph Performance for OpenStack Workloads

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Ceph, Rook, OpenStack, Performance, Tuning, RBD, Optimization

Description: Tune Ceph and OpenStack integration settings to maximize IOPS and throughput for VM workloads, including RBD cache, CRUSH tuning, and Nova disk settings.

---

A default Ceph-OpenStack integration works but may leave significant performance on the table. This guide covers the key tuning knobs on both the Ceph and OpenStack sides to maximize throughput and IOPS for production VM workloads.

## RBD Cache Configuration

Enabling the RBD cache on the compute node significantly improves write latency by buffering writes locally before flushing to Ceph:

```ini
# /etc/ceph/ceph.conf on compute nodes
[client]
rbd_cache = true
rbd_cache_size = 134217728          # 128 MB
rbd_cache_max_dirty = 100663296     # 96 MB
rbd_cache_target_dirty = 67108864  # 64 MB
rbd_cache_max_dirty_age = 5
rbd_cache_writethrough_until_flush = true
```

## Nova Disk Cache Mode

In `nova.conf`, set the disk cache mode to take advantage of RBD caching:

```ini
[libvirt]
disk_cachemodes = "network=writeback"
hw_disk_discard = unmap
```

`writeback` mode allows dirty data in the RBD cache to accumulate before flushing, reducing IOPS load on Ceph. `unmap` enables TRIM/discard to reclaim space when the guest deletes data.

## CRUSH Tuning for OpenStack Pools

Optimize CRUSH for the RBD pools used by OpenStack:

```bash
# Use host-level bucket type for failure domains (not rack)
# unless you have enough hosts per rack
ceph osd crush rule create-replicated openstack-rule default host

# Apply to each OpenStack pool
for pool in volumes vms images; do
  ceph osd pool set ${pool} crush_rule openstack-rule
done

# Set PG autoscaling
ceph osd pool set volumes pg_autoscale_mode on
ceph osd pool set vms pg_autoscale_mode on
ceph osd pool set images pg_autoscale_mode on
```

## OSD Configuration for VM Workloads

```ini
# /etc/ceph/ceph.conf
[osd]
# Increase OSD memory target for better caching
osd_memory_target = 8589934592   # 8 GB per OSD

# Use bluestore compression selectively
bluestore_compression_mode = passive
bluestore_compression_algorithm = snappy

# Keep recovery/backfill conservative to minimize impact on client I/O
osd_recovery_max_active = 3
osd_max_backfills = 1
```

## Network Tuning

Separate the public (client) and cluster (replication) networks:

```ini
[global]
public_network = 10.0.10.0/24
cluster_network = 10.0.20.0/24
ms_bind_msgr1 = false
ms_bind_msgr2 = true
```

## Benchmarking After Tuning

Use `rbd bench` to measure performance from compute nodes:

```bash
# Create a test image
rbd create --size 10G vms/bench-test

# Sequential write benchmark
rbd bench --io-type write --io-size 4M --io-threads 16 \
  --io-total 1G vms/bench-test

# Random read/write benchmark
rbd bench --io-type readwrite --io-size 4K --io-threads 32 \
  --io-total 512M --rw-mix-read 70 vms/bench-test

# Clean up
rbd rm vms/bench-test
```

## Summary

Optimizing Ceph for OpenStack involves enabling and tuning RBD writeback cache on compute nodes, setting Nova's disk cache mode to `writeback`, applying CRUSH rules appropriate for your topology, tuning OSD memory, and separating public and cluster networks. After applying these changes, benchmark with `rbd bench` to measure improvement. Most environments see a 2-4x improvement in write latency and sustained IOPS after enabling RBD cache alone.
