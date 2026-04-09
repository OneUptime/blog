# How to Use Pool Quotas for Capacity Management in Ceph

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Rook, Ceph, Storage, Kubernetes, Capacity Management

Description: Learn how to configure and manage pool quotas in Ceph to control storage capacity usage and prevent pools from consuming unlimited disk space.

---

## What Are Pool Quotas in Ceph

Ceph pool quotas allow administrators to set limits on the maximum number of objects or the maximum number of bytes stored in a pool. This is a critical tool for multi-tenant environments, preventing any single pool from consuming all available cluster storage.

Quotas can be applied to:
- **Max bytes** - total bytes allowed in the pool
- **Max objects** - total number of objects allowed in the pool

## Setting Pool Quotas

### Set a Maximum Bytes Quota

To limit a pool to 100 GiB of storage:

```bash
ceph osd pool set-quota <pool-name> max_bytes 107374182400
```

For example, to limit the `rbd` pool to 100 GiB:

```bash
ceph osd pool set-quota rbd max_bytes 107374182400
```

### Set a Maximum Objects Quota

To limit a pool to 1 million objects:

```bash
ceph osd pool set-quota <pool-name> max_objects 1000000
```

### Set Both Quotas Together

You can combine both quotas on a single pool:

```bash
ceph osd pool set-quota mypool max_bytes 53687091200
ceph osd pool set-quota mypool max_objects 500000
```

## Checking Current Quotas

To view the quotas set on a pool:

```bash
ceph osd pool get-quota <pool-name>
```

Example output:

```text
quotas for pool 'mypool':
  max objects: 500000 objects
  max bytes  : 50 GiB
```

To check quota information as part of broader pool stats:

```bash
ceph df detail
```

This shows usage and quota info for each pool:

```text
POOLS:
    NAME         ID  QUOTA OBJECTS  QUOTA BYTES  USED   %USED  MAX AVAIL
    mypool        1          500k       50 GiB  20 GiB   40.0   30 GiB
```

## Removing Quotas

To remove a quota, set it to 0 (which means unlimited):

```bash
ceph osd pool set-quota <pool-name> max_bytes 0
ceph osd pool set-quota <pool-name> max_objects 0
```

## Configuring Pool Quotas via Rook CRD

When using Rook-Ceph, you can define pool quotas directly in the `CephBlockPool` custom resource:

```yaml
apiVersion: ceph.rook.io/v1
kind: CephBlockPool
metadata:
  name: mypool
  namespace: rook-ceph
spec:
  replicated:
    size: 3
  quotas:
    maxSize: "100Gi"
    maxObjects: 1000000
```

Apply the manifest with:

```bash
kubectl apply -f pool.yaml
```

Verify the pool configuration:

```bash
kubectl -n rook-ceph get cephblockpool mypool -o yaml
```

## What Happens When a Quota Is Exceeded

When a write operation would cause a pool to exceed its quota, Ceph returns an error. For RBD clients, this typically results in:

```text
rbd: error: error writing to image block device: No space left on device
```

For RGW (object storage), S3 clients receive an HTTP 403 error:

```text
<Error>
  <Code>QuotaExceeded</Code>
  <Message>Your quota has been exceeded.</Message>
</Error>
```

## Monitoring Pool Capacity and Quotas

Regularly monitor pool usage relative to quotas using:

```bash
ceph df
```

Or to get detailed information:

```bash
ceph df detail | grep -E "NAME|mypool"
```

You can also query pool stats via the Ceph admin socket or Prometheus metrics. The metric `ceph_pool_quota_bytes` and `ceph_pool_quota_objects` reflect configured limits.

## Best Practices

- Set quotas slightly below the physical capacity to preserve space for recovery and rebalancing.
- Use `max_bytes` quotas when you have variable object sizes (e.g., RBD images, RGW buckets).
- Use `max_objects` quotas to control metadata overhead in high-object-count workloads.
- Monitor pool usage against quotas with alerts so you can proactively expand capacity.
- In multi-tenant setups, assign separate pools with quotas per tenant to isolate resource usage.

## Summary

Ceph pool quotas are a straightforward mechanism for capacity governance in both single-cluster and multi-tenant deployments. By setting `max_bytes` and `max_objects` limits on pools, you prevent runaway storage consumption and ensure fair resource allocation. In Rook-Ceph environments, quotas can be declared directly in the `CephBlockPool` CRD, making them part of your GitOps workflow.
