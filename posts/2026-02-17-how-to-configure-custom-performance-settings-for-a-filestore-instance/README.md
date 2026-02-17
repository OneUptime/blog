# How to Configure Custom Performance Settings for a Filestore Instance

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: GCP, Filestore, Performance Tuning, NFS, Storage

Description: Learn how to configure and tune custom performance settings for Google Cloud Filestore instances including IOPS, throughput, and client-side NFS mount options.

---

Filestore instances come with default performance settings that work well for general-purpose workloads. But if you are running a workload with specific performance requirements - like a media rendering pipeline that needs maximum sequential throughput or a web server farm that needs high random read IOPS - you can tune things to match your access patterns. In this post, I will walk through the performance levers available on both the server side (Filestore configuration) and the client side (NFS mount options).

## Understanding Filestore Performance Model

Filestore performance is primarily determined by two factors: the tier you select and the provisioned capacity. For Basic tiers, performance is fixed regardless of capacity. For Zonal, Regional, and Enterprise tiers, performance scales linearly with capacity up to certain limits.

Here is a rough breakdown:

**Basic HDD:** Fixed 100 MB/s read, 100 MB/s write. No amount of configuration changes this.

**Basic SSD:** Throughput scales with capacity. At 2.5 TB, you get about 180 MB/s read. At 63.9 TB, you get the maximum of 1.2 GB/s read.

**Zonal and Regional:** Performance scales more aggressively with capacity. You can also configure custom IOPS and throughput settings independently of capacity.

**Enterprise:** Similar to Zonal/Regional with additional configurability.

## Configuring Custom Performance for Zonal and Regional Tiers

For Zonal and Regional tier instances, you can specify custom performance limits at creation time. This lets you pay for exactly the performance you need rather than being locked to the default scaling curve.

```bash
# Create a Zonal instance with custom IOPS and throughput settings
gcloud filestore instances create perf-tuned-share \
  --zone=us-central1-a \
  --tier=ZONAL \
  --file-share=name=data,capacity=2TB \
  --network=name=default \
  --performance-limits=max-read-iops=30000,max-read-throughput-mibps=1200
```

This creates a 2 TB instance but with higher read performance than the default scaling would provide.

You can also update performance settings on an existing instance:

```bash
# Update performance limits on an existing instance
gcloud filestore instances update perf-tuned-share \
  --zone=us-central1-a \
  --performance-limits=max-read-iops=50000,max-read-throughput-mibps=2400
```

## Client-Side NFS Mount Options

The Filestore server handles one side of the performance equation. The NFS client configuration on your VMs handles the other side. The default mount options are conservative and optimized for correctness over performance. You can tune them for better throughput.

### Read and Write Buffer Sizes

The default NFS read/write buffer sizes are usually 32 KB or 64 KB. For large file operations, increasing these to 1 MB can dramatically improve throughput:

```bash
# Mount with 1MB read/write buffers for maximum throughput
sudo mount -t nfs -o rsize=1048576,wsize=1048576 10.0.0.2:/vol1 /mnt/filestore
```

The `rsize` parameter controls how much data is requested in a single NFS read operation, and `wsize` controls the write equivalent. Larger values mean fewer round trips for large file transfers.

### Async vs Sync Writes

By default, NFS mounts use async writes, which means the client can acknowledge writes to the application before the data reaches the server. This is faster but has a small risk of data loss if the client crashes before flushing.

If you need guaranteed durability:

```bash
# Mount with synchronous writes for data safety
sudo mount -t nfs -o sync 10.0.0.2:/vol1 /mnt/filestore
```

For most workloads, the default async mode is the right choice. Only switch to sync if your application requires strong write durability guarantees.

### Attribute Caching

NFS clients cache file attributes (size, timestamps, permissions) to reduce network calls. The default cache times work well for single-client setups but can cause stale data issues when multiple clients write to the same files.

For multi-client environments where freshness matters:

```bash
# Reduce attribute cache times for multi-client freshness
sudo mount -t nfs -o actimeo=3 10.0.0.2:/vol1 /mnt/filestore
```

The `actimeo` parameter sets both the minimum and maximum attribute cache time in seconds. A value of 3 means attributes are re-validated every 3 seconds. Setting it to 0 disables caching entirely but has a significant performance cost.

For single-client environments where you want more caching:

```bash
# Increase attribute cache for single-client performance
sudo mount -t nfs -o acregmin=30,acregmax=60,acdirmin=30,acdirmax=60 \
  10.0.0.2:/vol1 /mnt/filestore
```

### NFS Version

Filestore supports NFS v3. Make sure your clients are using v3 for the best compatibility:

```bash
# Explicitly specify NFS version 3
sudo mount -t nfs -o vers=3 10.0.0.2:/vol1 /mnt/filestore
```

### Combined Optimized Mount

Here is a mount command with all the performance-oriented options combined:

```bash
# Fully optimized NFS mount for high-throughput workloads
sudo mount -t nfs -o \
  vers=3,\
  rsize=1048576,\
  wsize=1048576,\
  hard,\
  nointr,\
  timeo=600,\
  retrans=2,\
  async,\
  actimeo=30 \
  10.0.0.2:/vol1 /mnt/filestore
```

And the corresponding fstab entry:

```
10.0.0.2:/vol1 /mnt/filestore nfs vers=3,rsize=1048576,wsize=1048576,hard,nointr,timeo=600,retrans=2,async,actimeo=30,_netdev 0 0
```

## Benchmarking Your Configuration

After configuring performance settings, benchmark to verify you are getting the expected throughput. The `fio` tool is excellent for this:

```bash
# Install fio for benchmarking
sudo apt-get install -y fio

# Sequential read throughput test
fio --name=seq-read --directory=/mnt/filestore --rw=read \
  --bs=1M --size=10G --numjobs=4 --time_based --runtime=60 \
  --group_reporting

# Sequential write throughput test
fio --name=seq-write --directory=/mnt/filestore --rw=write \
  --bs=1M --size=10G --numjobs=4 --time_based --runtime=60 \
  --group_reporting

# Random read IOPS test
fio --name=rand-read --directory=/mnt/filestore --rw=randread \
  --bs=4K --size=1G --numjobs=16 --time_based --runtime=60 \
  --group_reporting
```

Compare the results to the performance limits of your instance. If you are not hitting the expected numbers, check:

1. Are the NFS mount options correctly applied? Run `mount | grep filestore` to verify.
2. Is the VM network bandwidth sufficient? A small VM might be the bottleneck.
3. Are you testing with enough parallelism? Single-threaded tests will not saturate high-performance instances.

## Performance Tips

**Use larger VMs for higher throughput.** The VM's network bandwidth caps what you can achieve. An n2-standard-2 has 10 Gbps bandwidth, while an n2-standard-64 has 32 Gbps.

**Increase parallelism.** NFS throughput improves with multiple concurrent operations. Applications that read or write in parallel will see better numbers than single-threaded sequential access.

**Match capacity to performance needs.** For Zonal and Regional tiers, provisioning more capacity gives you higher default performance limits, even if you do not need the extra space.

**Avoid small random I/O on Basic HDD.** The IOPS limits on Basic HDD (600 reads, 1000 writes) are extremely low by modern standards. If your workload involves lots of small random operations, you need SSD.

Tuning Filestore performance is about understanding where the bottleneck is and adjusting the right knob. Server-side configuration sets the ceiling, client-side mount options determine how efficiently you use that ceiling, and VM sizing determines whether the network pipe is wide enough.
