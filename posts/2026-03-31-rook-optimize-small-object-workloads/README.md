# How to Optimize Ceph for Small Object Workloads

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Rook, Ceph, Performance, Object Storage, Optimization, RGW

Description: Configure Ceph for high-performance small object workloads by tuning RGW, BlueStore allocation sizes, metadata caching, and RocksDB parameters to handle millions of tiny objects.

---

## Small Object Challenges in Ceph

Small objects (under 1 MB) create unique challenges for Ceph. Each object requires multiple metadata operations: namespace lookup in RGW, onode allocation in BlueStore, RocksDB key-value entries, and CRUSH placement calculations. A cluster handling millions of 1-100 KB objects can become metadata-bound rather than bandwidth-bound.

## RGW Configuration for Small Objects

Tune the RADOS Gateway for high-frequency small object operations:

```bash
# Increase RGW operation threads for concurrency
ceph config set client.rgw rgw_thread_pool_size 512

# Enable RGW metadata cache
ceph config set client.rgw rgw_cache_enabled true
ceph config set client.rgw rgw_cache_lru_size 100000  # Cache 100k objects

# Tune bucket index sharding (prevents hot spots)
ceph config set client.rgw rgw_override_bucket_index_max_shards 64
```

## BlueStore Allocation Size Tuning

The minimum allocation unit must match your typical object size:

```bash
# For workloads with 4-64 KB objects
ceph config set osd bluestore_min_alloc_size_ssd 4096    # 4 KB
ceph config set osd bluestore_min_alloc_size_hdd 4096

# Note: bluestore_min_alloc_size is set at OSD creation time.
# Changing it requires recreating the OSD to take effect.
```

## Metadata Cache Tuning

Small object workloads are metadata-intensive. Increase the RocksDB and BlueStore metadata cache:

```bash
# Increase OSD memory for metadata-heavy workloads
ceph config set osd osd_memory_target 8589934592  # 8 GiB

# Prioritize key-value (metadata) cache over data cache
ceph config set osd bluestore_cache_kv_ratio 0.5     # 50% for RocksDB
ceph config set osd bluestore_cache_meta_ratio 0.4   # 40% for metadata
# Remaining 10% is automatically allocated to data cache
```

## PG Count Optimization

Small object workloads may require more PGs to distribute metadata load:

```bash
# More PGs reduce per-PG object count, improving lookup speed
ceph osd pool create small-objects 256 256

# Set target object count per PG (aim for 100-300 per PG)
ceph osd pool set small-objects pg_autoscale_mode on
ceph osd pool set small-objects target_size_ratio 0.1
```

Check current objects per PG:

```bash
ceph pg ls | awk 'NR>1 {print $1, $20}' | sort -k2 -n | tail -20
```

## RGW Bucket Index Optimization

With millions of small objects, bucket index becomes a bottleneck:

```bash
# Enable dynamic resharding
ceph config set global osd_pool_default_pg_num 64
ceph config set client.rgw rgw_dynamic_resharding true
ceph config set client.rgw rgw_reshard_num_logs 16

# Pre-shard buckets expecting high object counts
radosgw-admin bucket reshard --bucket=my-bucket --num-shards=64
```

## Concurrent S3 Uploads for Small Objects

For applications uploading many small objects, concurrent uploads reduce overhead:

```python
import boto3
from concurrent.futures import ThreadPoolExecutor

s3 = boto3.client('s3', endpoint_url='http://rook-ceph-rgw:80')

def upload_object(key_data):
    key, data = key_data
    s3.put_object(Bucket='small-objects', Key=key, Body=data)

# Upload 1000 objects concurrently
objects = [(f"obj_{i}", b"x" * 4096) for i in range(1000)]
with ThreadPoolExecutor(max_workers=32) as executor:
    executor.map(upload_object, objects)
```

## Monitoring Metadata Performance

Track OSD metadata operations:

```bash
# Monitor onode hit rate (higher is better)
ceph daemon osd.0 perf dump | python3 -m json.tool | grep -E "onode|cache"

# Watch RGW request rate and latency
ceph daemon client.rgw perf dump | grep -E "req|latency"
```

## Summary

Small object workloads strain Ceph's metadata layer rather than its raw I/O capacity. Key optimizations include setting `bluestore_min_alloc_size` to match your object size, increasing RocksDB's share of the OSD cache, enabling RGW metadata caching, and pre-sharding high-object-count buckets. Properly sized PG counts with autoscaling ensure metadata load distributes evenly across all OSDs.
