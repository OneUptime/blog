# How to Optimize Ceph RGW for Small Object Workloads

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Rook, Ceph, RGW, Object Storage, Performance

Description: Optimize Ceph RGW in Rook for small object workloads by tuning thread pools, frontend settings, and bucket index sharding to maximize small object IOPS.

---

## Small Object Challenges in RGW

Small objects (under 1 MB) stress RGW differently than large objects. Each PUT or GET requires a full metadata roundtrip to the bucket index, and high request rates can create hotspots in the index RADOS objects. The key tuning areas are request threading, bucket index sharding, and RADOS operation concurrency.

## Thread Pool Tuning

Increase the RGW frontend thread count to handle more concurrent small object requests:

```yaml
apiVersion: ceph.rook.io/v1
kind: CephObjectStore
metadata:
  name: my-store
  namespace: rook-ceph
spec:
  gateway:
    port: 80
    instances: 2
    resources:
      requests:
        cpu: "4"
        memory: "4Gi"
      limits:
        cpu: "8"
        memory: "8Gi"
```

Configure thread count via Ceph config:

```bash
kubectl -n rook-ceph exec -it deploy/rook-ceph-tools -- \
  ceph config set client.rgw rgw_thread_pool_size 512
```

## Bucket Index Sharding

For buckets with millions of objects, default single-shard bucket indexes become a bottleneck:

```bash
# Set default shard count for new buckets
kubectl -n rook-ceph exec -it deploy/rook-ceph-tools -- \
  ceph config set client.rgw rgw_override_bucket_index_max_shards 64

# Reshard an existing bucket
kubectl -n rook-ceph exec -it deploy/rook-ceph-tools -- \
  radosgw-admin bucket reshard --bucket=my-bucket --num-shards=64
```

## RADOS Throttle Tuning

Increase the number of concurrent RADOS operations per RGW instance:

```bash
kubectl -n rook-ceph exec -it deploy/rook-ceph-tools -- \
  ceph config set client.rgw rgw_max_concurrent_requests 1024

kubectl -n rook-ceph exec -it deploy/rook-ceph-tools -- \
  ceph config set client.rgw objecter_inflight_ops 24576
```

## Frontend Configuration

Use the Beast frontend (default in modern Ceph) for best small object performance:

```bash
kubectl -n rook-ceph exec -it deploy/rook-ceph-tools -- \
  ceph config set client.rgw rgw_frontends "beast port=80"
```

## Dedicated Pool for Small Objects

Create a dedicated pool using SSD OSDs for small object metadata:

```yaml
apiVersion: ceph.rook.io/v1
kind: CephObjectStore
metadata:
  name: my-store
  namespace: rook-ceph
spec:
  metadataPool:
    deviceClass: ssd
    replicated:
      size: 3
  dataPool:
    deviceClass: ssd
    replicated:
      size: 3
```

## Benchmarking Small Object IOPS

Use s3bench to test small object performance:

```bash
s3bench -accessKey=<key> -accessSecret=<secret> \
  -endpoint=http://<rgw-endpoint> \
  -bucket=test-bucket \
  -objectSize=1024 \
  -numSamples=100000 \
  -numClients=100
```

Target: 10,000+ PUT/GET operations per second per RGW instance on NVMe OSDs.

## Summary

Optimizing RGW for small objects requires increasing thread pool sizes, sharding bucket indexes to prevent single-shard bottlenecks, and raising RADOS concurrency limits. Placing both data and metadata pools on SSD OSDs eliminates disk latency from the critical path for small object operations.
