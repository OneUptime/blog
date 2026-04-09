# How to Configure Dynamic Bucket Index Resharding in Ceph RGW

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Rook, Ceph, Bucket, Performance, Object Storage, Resharding

Description: Learn how to enable and configure dynamic bucket index resharding in Ceph RGW to automatically scale bucket indices as object counts grow.

---

As buckets grow to millions of objects, a single bucket index shard becomes a performance bottleneck. Ceph RGW supports dynamic resharding, which automatically increases the number of index shards when a bucket exceeds a configured threshold.

## Understanding Bucket Index Sharding

Each bucket in Ceph RGW maintains an index stored in RADOS objects. By default a bucket has one index shard. When object counts grow, operations slow because all metadata reads and writes hit the same RADOS object. Resharding distributes the index across multiple shards.

## Enabling Dynamic Resharding

Dynamic resharding is enabled by default in recent Ceph versions, but you can verify and configure it:

```bash
ceph config set client.rgw rgw_dynamic_resharding true
ceph config set client.rgw rgw_max_objs_per_shard 100000
ceph config set client.rgw rgw_reshard_thread_interval 600
```

- `rgw_max_objs_per_shard`: Object count threshold per shard before resharding triggers
- `rgw_reshard_thread_interval`: How often (seconds) the resharding thread checks buckets

## Checking Resharding Status

List all pending and active reshard jobs:

```bash
radosgw-admin reshard list
```

Check the current shard count for a specific bucket:

```bash
radosgw-admin bucket stats --bucket mybucket | grep num_shards
```

## Manually Triggering a Reshard

If you want to proactively reshard a bucket without waiting for the automatic threshold:

```bash
radosgw-admin bucket reshard \
  --bucket mybucket \
  --num-shards 64
```

Monitor the reshard progress:

```bash
radosgw-admin reshard status --bucket mybucket
```

## Rook Configuration

In a Rook-managed cluster, apply RGW config options via the Ceph config map or directly through `ceph config set`:

```yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: rook-config-override
  namespace: rook-ceph
data:
  config: |
    [client.rgw]
    rgw_dynamic_resharding = true
    rgw_max_objs_per_shard = 100000
    rgw_reshard_thread_interval = 600
```

Apply and restart:

```bash
kubectl apply -f rook-config-override.yaml
kubectl rollout restart deployment -n rook-ceph -l app=rook-ceph-rgw
```

## Handling Large-Scale Resharding

For buckets with tens of millions of objects, resharding can take significant time. During resharding, RGW processes requests normally using the old index while building the new one. After completion it atomically switches to the new shards:

```bash
# Check resharding progress and completion
radosgw-admin reshard status --bucket mybucket
```

## Summary

Dynamic bucket index resharding in Ceph RGW automatically scales bucket indices as object counts grow, preventing performance degradation. Configure the threshold per shard and the resharding interval to match your workload. For Rook deployments, apply the config via the rook-config-override ConfigMap and restart RGW pods.
