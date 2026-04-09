# How to Understand Performance Tradeoffs of Erasure Coding in Ceph

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Rook, Ceph, Kubernetes, ErasureCoding, Performance, Storage

Description: Learn the key performance tradeoffs of erasure coding versus replication in Ceph, including latency, throughput, CPU usage, and recovery speed considerations.

---

Erasure coding reduces raw storage consumption at the cost of increased computational overhead and higher I/O latency. Understanding these tradeoffs helps you decide when to use EC versus replication in a Rook-Ceph deployment.

## Read Performance

For a healthy cluster (no failures), EC reads can be as fast as replicated reads for large objects. Ceph can read only the k data chunks it needs without involving parity chunks:

```text
Read Type              Replicated (3x)   EC (k=4, m=2)
Small random reads     Fast (1 OSD)      Higher latency (k OSDs contacted)
Large sequential       Fast              Fast (4 OSDs in parallel)
Degraded read          1 OSD             Requires all k shards + decode CPU
```

For small objects (< stripe size), EC may have higher latency because Ceph needs to contact more OSDs to assemble the full stripe.

## Write Performance

Writes are where EC has the biggest disadvantage:

```text
Write Type              Replicated (3x)   EC (k=4, m=2)
New object write        3 OSDs touched    6 OSDs touched (k+m)
Overwrite (full stripe) 3 OSDs            6 OSDs + CPU encoding
Overwrite (partial)     3 OSDs            Read + encode + 6 OSDs
Small random writes     Low latency       High latency (RMW)
```

The latency difference for small random writes can be 3-5x higher with EC due to the required read-modify-write cycle.

## CPU Overhead

EC encoding and decoding consumes CPU on OSD nodes. For Jerasure with k=4, m=2 at 1 GB/s throughput:

```bash
# Monitor OSD CPU usage during benchmark
top -p $(pgrep ceph-osd | head -1)
```

```text
Plugin    k=4,m=2 encode CPU   decode CPU
Jerasure  ~15% per OSD core    ~12% per OSD core
ISA-L     ~4% per OSD core     ~3% per OSD core
```

ISA-L reduces CPU usage by roughly 2-3x on Intel hardware via optimized SIMD instructions (AVX2/AVX-512).

## Network Overhead

EC pools require more network bandwidth per write operation. Writing 1 GiB of data to an EC k=4, m=2 pool requires transmitting 1.5 GiB of data (data + parity) to 6 OSDs:

```text
Pool Type     Network per 1 GiB write
3x Replicated 3 GiB (3 full copies)
EC k=4,m=2    1.5 GiB (4 data + 2 parity chunks)
```

EC uses less network bandwidth for writes than 3x replication.

## Recovery Performance

When an OSD fails, recovery for EC pools is slower than for replicated pools:

- **Replicated**: Copy data from one surviving OSD to the new OSD
- **EC**: Read k chunks from k different OSDs, decode, compute missing chunk, write to new OSD

This means EC recovery creates more IOPS on healthy OSDs and takes longer. During recovery, read performance on EC pools degrades significantly as some reads require decoding from surviving shards.

## Workload Decision Matrix

```text
Workload Type              Best Pool Type
Random small I/O (<4 KiB)  Replicated
Database (PostgreSQL, MySQL) Replicated
Sequential large writes     EC (k=4,m=2 or larger k)
Object storage (RGW)        EC (write-once objects)
Archive/backup data         EC (highest k for efficiency)
CephFS metadata             Replicated (always)
CephFS bulk data            EC (with allow_ec_overwrites)
```

## Summary

Erasure coding trades write latency and CPU overhead for storage efficiency. It excels for write-once large-object workloads like RGW and archival storage. Replicated pools remain the best choice for random write-heavy workloads like databases and Kubernetes persistent volumes backing transactional applications. Always benchmark your specific workload with `fio` or `rados bench` before committing to EC in production.
