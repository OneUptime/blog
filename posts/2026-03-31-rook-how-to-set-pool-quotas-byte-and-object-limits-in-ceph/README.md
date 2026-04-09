# How to Set Pool Quotas in Ceph

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Ceph, Rook, Pool Quotas, Storage Management, Capacity Planning

Description: Set byte and object count quotas on Ceph pools to prevent runaway usage, enforce storage limits per tenant, and protect cluster stability.

---

## Why Set Pool Quotas

Without quotas, a single pool can consume all available cluster capacity, causing other pools and services to fail. Quotas provide:

- Protection against runaway applications
- Multi-tenant storage fairness
- Predictable capacity planning
- Compliance with storage SLAs

Ceph supports two types of pool quotas:
- **Byte quota**: Maximum total bytes the pool can store
- **Object quota**: Maximum number of objects the pool can contain

## Setting Byte Quotas

```bash
# Set a 100 GiB quota on a pool
ceph osd pool set-quota mypool max_bytes 107374182400

# Set a 1 TiB quota
ceph osd pool set-quota mypool max_bytes 1099511627776

# Using human-readable sizes (Ceph Nautilus+)
ceph osd pool set-quota mypool max_bytes 100G
```

When the pool reaches the byte quota, the pool is marked full and write operations return `-ENOSPC`. Existing data and read operations are unaffected.

## Setting Object Count Quotas

```bash
# Limit pool to 1 million objects
ceph osd pool set-quota mypool max_objects 1000000

# Limit to 500,000 objects
ceph osd pool set-quota mypool max_objects 500000
```

## Viewing Pool Quotas

```bash
# View quotas for a specific pool
ceph osd pool get-quota mypool

# Output:
# quotas for pool 'mypool':
#   max objects: 1M objects
#   max bytes  : 100 GiB
```

## Checking Quota Usage

```bash
# View current usage vs quota
ceph df detail | grep mypool

# Or get detailed pool stats
ceph osd pool stats mypool
```

Example output:

```text
POOL    OBJECTS  USED    %USED  QUOTA OBJECTS  QUOTA BYTES
mypool  250000   45 GiB   45%   1000000        100 GiB
```

## Removing Quotas

To remove a quota (set to 0 = unlimited):

```bash
# Remove byte quota
ceph osd pool set-quota mypool max_bytes 0

# Remove object quota
ceph osd pool set-quota mypool max_objects 0
```

## Setting Quotas in Rook

In Rook, pool quotas can be set in the CephBlockPool or CephFilesystem specs:

```yaml
apiVersion: ceph.rook.io/v1
kind: CephBlockPool
metadata:
  name: tenant-pool
  namespace: rook-ceph
spec:
  failureDomain: host
  replicated:
    size: 3
  quotas:
    maxSize: "100Gi"
    maxObjects: 1000000
```

Apply the spec:

```bash
kubectl apply -f cephblockpool.yaml

# Verify quota was set
kubectl -n rook-ceph exec -it deploy/rook-ceph-tools -- ceph osd pool get-quota tenant-pool
```

## Monitoring Quota Warnings

Ceph generates health warnings when pools approach their quotas:

```bash
# Check for quota warnings
ceph health detail | grep quota

# Example warning:
# HEALTH_WARN pool 'mypool' has 85 objects (max 100)
```

Configure alerts in Prometheus/Alertmanager for proactive monitoring:

```yaml
# Prometheus alert for quota usage
- alert: CephPoolNearQuota
  expr: ceph_pool_stored_raw / ceph_pool_quota_bytes > 0.85
  for: 5m
  labels:
    severity: warning
  annotations:
    summary: "Ceph pool near byte quota"
    description: "Pool {{ $labels.pool_id }} is at {{ $value | humanizePercentage }} of its byte quota"
```

## Quota Behavior at Different Ceph Levels

Quotas exist at multiple levels in Ceph:

```text
Level           | Command                                    | Applies to
Pool quota      | ceph osd pool set-quota                    | Single pool
Namespace quota | RADOS namespace (limited support)          | Namespace within pool
CephFS quota    | setfattr -n ceph.quota.max_bytes            | Directory subtree
RGW user quota  | radosgw-admin user modify --max-size       | User's total storage
RGW bucket quota| radosgw-admin quota set --quota-scope=bucket| Single bucket
```

## Setting RGW User and Bucket Quotas

For object storage, set quotas at the user or bucket level:

```bash
# Set user quota (max 50 GiB, max 10000 objects)
radosgw-admin quota set --quota-scope=user --uid=myuser \
  --max-size=53687091200 \
  --max-objects=10000

# Enable the quota
radosgw-admin quota enable --quota-scope=user --uid=myuser

# Verify
radosgw-admin quota get --quota-scope=user --uid=myuser
```

## Summary

Ceph pool quotas limit storage usage per pool via `ceph osd pool set-quota`, supporting both byte (`max_bytes`) and object count (`max_objects`) limits. When a quota is reached, the pool is marked full and writes return `-ENOSPC` while reads continue normally. In Rook, quotas can be declared in pool specs. For multi-tenant environments, consider layering pool quotas with RGW user/bucket quotas and CephFS directory quotas for granular control. Monitor quota usage proactively with Prometheus alerts.
