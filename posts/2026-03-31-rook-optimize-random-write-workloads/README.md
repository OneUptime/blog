# How to Optimize Ceph for Random Write Workloads

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Rook, Ceph, Performance, Storage, Optimization, Write

Description: Tune Ceph for high-performance random write workloads by configuring BlueStore WAL placement, OSD journal settings, pool parameters, and client write caching strategies.

---

## Random Write Workload Challenges

Random write workloads - typical of OLTP databases, virtual machine disks, and message queues - are the most demanding for Ceph. Each small random write must be journaled, replicated, and acknowledged by all replicas in the placement group before completing. Write amplification from BlueStore, RocksDB, and replication means a single 4k client write can generate 30-50k of actual disk I/O.

## Hardware Foundation for Random Writes

NVMe drives for BlueStore WAL/DB combined with SSD or NVMe data devices are essential for high-IOPS random write workloads:

```bash
# View current I/O scheduler for OSD devices
cat /sys/block/nvme0n1/queue/scheduler
# Set to mq-deadline or none for NVMe
echo mq-deadline > /sys/block/nvme0n1/queue/scheduler
echo none > /sys/block/nvme0n1/queue/scheduler
```

## BlueStore WAL Configuration

The WAL absorbs burst writes - sizing and placing it correctly is critical:

```yaml
# Rook CephCluster - separate WAL/DB on NVMe, data on SSD
apiVersion: ceph.rook.io/v1
kind: CephCluster
metadata:
  name: rook-ceph
  namespace: rook-ceph
spec:
  storage:
    nodes:
    - name: node1
      config:
        metadataDevice: "nvme0n1"   # WAL/DB on fast NVMe
      devices:
      - name: sda                   # data device
        config:
          osdsPerDevice: "1"
```

## Pool Configuration for Random Writes

Use replica pools (not erasure coding) for random write workloads - EC has very high write amplification for small random writes:

```bash
# Create SSD-backed replica pool
ceph osd pool create rw-workload 64 64
ceph osd pool set rw-workload size 3
ceph osd pool set rw-workload min_size 2

# Target SSD device class
ceph osd crush set-device-class ssd osd.0 osd.1 osd.2
ceph osd crush rule create-replicated ssd-rule default host ssd
ceph osd pool set rw-workload crush_rule ssd-rule

# Disable read-ahead for random workloads (wastes cache)
ceph config set client rbd_readahead_max_bytes 0
```

## Tuning BlueStore for Small Writes

```bash
# Set minimum allocation size to match workload block size (takes effect on new OSDs only)
ceph config set osd bluestore_min_alloc_size_ssd 4096    # 4 KB for SSD

# Increase deferred write size to batch small writes
ceph config set osd bluestore_deferred_batch_ops 16
ceph config set osd bluestore_deferred_batch_ops_ssd 32

# Tune RocksDB write buffer
ceph config set osd bluestore_rocksdb_options \
  "write_buffer_size=268435456,max_write_buffer_number=4"
```

## Client-Side Write Optimization

Configure the RBD client for write-heavy workloads:

```bash
# Configure RBD write-back cache
ceph config set client rbd_cache_size 67108864      # 64 MB cache
ceph config set client rbd_cache_max_dirty 50331648 # 48 MB max dirty
ceph config set client rbd_cache_target_dirty 33554432

# Disable read-ahead (wasteful for random write workloads)
ceph config set client rbd_readahead_max_bytes 0
```

## Benchmarking Random Write Performance

Measure 4k random write IOPS with fio:

```bash
# Create test image
rbd create rw-workload/iops-test --size 20G

# 4k random write benchmark
fio --ioengine=rbd --pool=rw-workload --rbdname=iops-test \
    --rw=randwrite --bs=4k --numjobs=4 --iodepth=128 \
    --runtime=60 --name=randwrite --group_reporting \
    --lat_percentiles=1

# Mixed OLTP simulation (70% read, 30% write)
fio --ioengine=rbd --pool=rw-workload --rbdname=iops-test \
    --rw=randrw --rwmixread=70 --bs=8k --numjobs=8 \
    --iodepth=64 --runtime=60 --name=oltp-sim --group_reporting
```

## Tracking Write Latency

Monitor OSD apply and commit latency:

```bash
# Check per-OSD latency
ceph osd perf | awk 'NR==1 || $3>5 {print}' | head -20

# Tail latency from daemon stats
ceph daemon osd.0 perf dump | python3 -c "
import json,sys
data = json.load(sys.stdin)
ops = data.get('osd', {})
print('commit_latency_ms:', ops.get('op_commit_latency_ms', {}).get('sum', 0) / max(ops.get('op_commit_latency_ms', {}).get('avgcount', 1), 1))
"
```

## Summary

Random write optimization in Ceph requires NVMe drives for BlueStore WAL/DB, small minimum allocation sizes (4 KB for SSD), increased RocksDB write buffer sizes, and replica pools instead of erasure coding. Configuring the I/O scheduler to mq-deadline or none on NVMe devices removes unnecessary queuing overhead. Client-side write caching with a large dirty buffer reduces round trips to the cluster for burst write workloads.
