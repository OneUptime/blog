# How to Optimize Ceph RGW for Large Object Workloads

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Rook, Ceph, RGW, Object Storage, Performance

Description: Optimize Ceph RGW in Rook for large object workloads by tuning multipart upload, network buffers, and pool striping to maximize throughput for multi-GB objects.

---

## Large Object Workload Profile

Large object workloads involve files from 100 MB to multiple GB: database dumps, video files, ML model checkpoints, and archive tarballs. Throughput is more important than IOPS. The bottleneck is typically network bandwidth and OSD write throughput rather than bucket index operations.

## Multipart Upload Tuning

For objects larger than 100 MB, clients should use multipart upload. Configure RGW to handle large parts efficiently:

```bash
kubectl -n rook-ceph exec -it deploy/rook-ceph-tools -- \
  ceph config set client.rgw rgw_multipart_min_part_size 67108864
```

Set the maximum object size allowed:

```bash
kubectl -n rook-ceph exec -it deploy/rook-ceph-tools -- \
  ceph config set client.rgw rgw_max_put_size 107374182400
```

## Write Window and Timeout Tuning

Increase the RGW write window size and operation timeout for large object transfers:

```bash
kubectl -n rook-ceph exec -it deploy/rook-ceph-tools -- \
  ceph config set client.rgw rgw_op_thread_timeout 1800

kubectl -n rook-ceph exec -it deploy/rook-ceph-tools -- \
  ceph config set client.rgw rgw_put_obj_max_window_size 134217728
```

Set the maximum chunk size for object writes:

```bash
kubectl -n rook-ceph exec -it deploy/rook-ceph-tools -- \
  ceph config set client.rgw rgw_max_chunk_size 33554432
```

## Data Pool for Large Objects

Use erasure coding for the data pool to reduce storage overhead while maintaining high throughput:

```yaml
apiVersion: ceph.rook.io/v1
kind: CephObjectStore
metadata:
  name: large-store
  namespace: rook-ceph
spec:
  metadataPool:
    replicated:
      size: 3
      deviceClass: ssd
  dataPool:
    erasureCoded:
      dataChunks: 4
      codingChunks: 2
    deviceClass: hdd
    parameters:
      compression_mode: none
```

Disable compression for already-compressed data (video, archives):

```bash
kubectl -n rook-ceph exec -it deploy/rook-ceph-tools -- \
  ceph osd pool set large-store.rgw.buckets.data compression_mode none
```

## Thread and Connection Tuning

Large object transfers are long-lived connections. Reduce the thread count but increase their timeout:

```bash
kubectl -n rook-ceph exec -it deploy/rook-ceph-tools -- \
  ceph config set client.rgw rgw_thread_pool_size 128

kubectl -n rook-ceph exec -it deploy/rook-ceph-tools -- \
  ceph config set client.rgw rgw_frontends \
    "beast port=80 request_timeout_ms=600000"
```

## Concurrent Large Object Uploads

Scale RGW instances to distribute large object upload load:

```yaml
spec:
  gateway:
    instances: 4
    resources:
      requests:
        cpu: "4"
        memory: "8Gi"
      limits:
        cpu: "8"
        memory: "16Gi"
```

## Benchmarking Large Object Throughput

Test with a 1 GB object using the AWS CLI:

```bash
dd if=/dev/urandom bs=1M count=1024 | aws s3 cp - \
  s3://test-bucket/large-test.bin \
  --endpoint-url http://<rgw-endpoint> \
  --expected-size 1073741824
```

Measure aggregate throughput across all RGW instances with warp:

```bash
warp put --host=<rgw-endpoint> \
  --access-key=<key> --secret-key=<secret> \
  --obj.size=1GiB --concurrent=8
```

## Summary

Large object RGW optimization focuses on multipart upload configuration, increased write chunk sizes, and erasure-coded data pools for storage efficiency. Reducing thread count while increasing connection timeouts prevents thread pool exhaustion during long-running large object transfers.
