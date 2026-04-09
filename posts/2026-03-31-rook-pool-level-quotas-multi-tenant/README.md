# How to Set Up Pool-Level Quotas for Multi-Tenant Environments

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Rook, Ceph, Pool, Quota, Multi-Tenant, Kubernetes, Storage

Description: Learn how to configure Ceph pool-level quotas to limit storage consumption per tenant, preventing one tenant from consuming all available cluster capacity.

---

## Why Pool Quotas Are Important

In multi-tenant Ceph environments, without quotas a single tenant can fill the entire cluster, causing failures for all other tenants. Pool-level quotas let you enforce hard limits on either the number of objects or the total bytes stored in a pool, ensuring fair resource allocation.

## Setting a Byte Quota on a Pool

The simplest quota limits the total bytes that can be stored in a pool:

```bash
# Set a 1TB quota on the tenant-a pool
kubectl -n rook-ceph exec -it deploy/rook-ceph-tools -- \
  ceph osd pool set-quota tenant-a-pool max_bytes $((1024 * 1024 * 1024 * 1024))

# Set a 500GB quota
kubectl -n rook-ceph exec -it deploy/rook-ceph-tools -- \
  ceph osd pool set-quota tenant-b-pool max_bytes 536870912000
```

## Setting an Object Count Quota

You can also limit the number of objects, which is useful for object storage buckets:

```bash
# Limit to 10 million objects
kubectl -n rook-ceph exec -it deploy/rook-ceph-tools -- \
  ceph osd pool set-quota tenant-a-pool max_objects 10000000
```

## Verifying Quotas

Check quotas on a specific pool:

```bash
kubectl -n rook-ceph exec -it deploy/rook-ceph-tools -- \
  ceph osd pool get-quota tenant-a-pool

# Example output:
# quotas for pool 'tenant-a-pool':
#   max objects: N/A
#   max bytes  : 1.0 TiB
```

List quotas for all pools:

```bash
kubectl -n rook-ceph exec -it deploy/rook-ceph-tools -- \
  ceph df detail
```

## What Happens When a Quota is Reached

When a pool reaches its quota, further write operations are blocked and return a `EDQUOT` (disk quota exceeded) error. Reads and deletes continue to work normally. Other pools are unaffected.

Check quota exhaustion in cluster health:

```bash
kubectl -n rook-ceph exec -it deploy/rook-ceph-tools -- \
  ceph health detail | grep quota
```

## Implementing Quota Management Via Rook

While Rook does not yet expose pool quotas directly in the CephBlockPool CRD, you can apply them via a post-provisioning job:

```yaml
apiVersion: batch/v1
kind: Job
metadata:
  name: set-pool-quota
  namespace: rook-ceph
spec:
  template:
    spec:
      containers:
      - name: quota-setter
        image: rook/ceph:latest
        command:
        - ceph
        - osd
        - pool
        - set-quota
        - tenant-a-pool
        - max_bytes
        - "1099511627776"
        volumeMounts:
        - name: ceph-config
          mountPath: /etc/ceph/ceph.conf
          subPath: ceph.conf
          readOnly: true
        - name: ceph-admin-keyring
          mountPath: /etc/ceph/keyring
          subPath: keyring
          readOnly: true
      volumes:
      - name: ceph-config
        configMap:
          name: rook-ceph-config
      - name: ceph-admin-keyring
        secret:
          secretName: rook-ceph-admin-keyring
      restartPolicy: OnFailure
```

## Monitoring Quota Usage

Track quota utilization with Prometheus:

```promql
# Pool utilization ratio
ceph_pool_bytes_used / on(pool_id) ceph_pool_quota_bytes
```

Set an alert when a tenant pool reaches 80% of its quota:

```yaml
- alert: CephPoolQuotaNearLimit
  expr: |
    (ceph_pool_bytes_used / ceph_pool_quota_bytes > 0.8) and ceph_pool_quota_bytes > 0
  for: 10m
  labels:
    severity: warning
```

## Summary

Pool-level quotas in Ceph are a critical guardrail for multi-tenant deployments. By setting `max_bytes` or `max_objects` quotas, you prevent any single tenant from exhausting shared storage capacity. Pair quotas with Prometheus monitoring and alerting to get advance warning before a tenant hits their limit, giving operations teams time to expand capacity or request cleanup from the tenant.
