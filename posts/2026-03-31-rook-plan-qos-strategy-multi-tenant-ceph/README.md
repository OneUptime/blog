# How to Plan QoS Strategy for Multi-Tenant Ceph

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Rook, Ceph, QoS, Multi-Tenant, Storage

Description: Learn how to design and implement a QoS strategy for multi-tenant Ceph clusters to ensure fair resource allocation and prevent noisy-neighbor issues.

---

## Understanding QoS in Multi-Tenant Ceph

Running Ceph in a multi-tenant environment introduces resource contention challenges. Without proper QoS controls, a single tenant's workload can saturate cluster IOPS, bandwidth, or capacity, degrading performance for all other tenants. Ceph provides several mechanisms to address this: dmClock for OSD-level scheduling, RBD throttling for block storage, and RGW rate limiting for object storage.

## Step 1 - Identify Tenant Workload Profiles

Before configuring QoS, classify tenants by their I/O patterns:

```bash
# Sample OSD performance baseline per pool
ceph osd pool stats tenant-a-rbd
ceph osd pool stats tenant-b-rbd
# Check current IOPS and throughput for each pool
rados bench -p tenant-a-rbd 30 write --no-cleanup
```

Categorize tenants as:
- Latency-sensitive (databases, low IOPS, strict latency SLA)
- Throughput-hungry (backups, media, high bandwidth)
- Bursty (CI/CD pipelines, intermittent spikes)

## Step 2 - Configure RBD QoS per Pool

Ceph's RBD QoS provides client-side throttling with IOPS and bandwidth limits per pool or image:

```bash
# Set RBD QoS parameters for tenant pools
rbd config pool set tenant-a-rbd rbd_qos_iops_limit 5000
rbd config pool set tenant-a-rbd rbd_qos_bps_limit 524288000
rbd config pool set tenant-b-rbd rbd_qos_iops_limit 2000
rbd config pool set tenant-b-rbd rbd_qos_bps_limit 209715200

# Verify settings
rbd config pool get tenant-a-rbd rbd_qos_iops_limit
```

## Step 3 - Apply RBD Image-Level Throttling

For finer control, apply QoS directly to individual RBD images:

```bash
# Set per-image QoS for a specific tenant volume
rbd config image set tenant-a-rbd/db-volume rbd_qos_iops_limit 3000
rbd config image set tenant-a-rbd/db-volume rbd_qos_iops_burst 6000
rbd config image set tenant-a-rbd/db-volume rbd_qos_iops_burst_seconds 10

# List current image QoS config
rbd config image list tenant-a-rbd/db-volume
```

## Step 4 - Configure RGW Rate Limits per User

For object storage tenants, use RGW rate limiting:

```bash
# Set rate limits for an RGW user
radosgw-admin user modify --uid tenant-a \
  --max-buckets 100

# Apply rate limiting via RGW config
radosgw-admin ratelimit set --ratelimit-scope user \
  --uid tenant-a \
  --max-read-ops 1000 \
  --max-write-ops 500

# Enable the rate limit (required to activate it)
radosgw-admin ratelimit enable --ratelimit-scope user \
  --uid tenant-a
```

## Step 5 - Define Quota Policies

Complement QoS with capacity quotas to prevent runaway usage:

```yaml
# Rook CephObjectStoreUser with quotas
apiVersion: ceph.rook.io/v1
kind: CephObjectStoreUser
metadata:
  name: tenant-a
  namespace: rook-ceph
spec:
  store: my-store
  displayName: "Tenant A"
  quotas:
    maxBuckets: 50
    maxSize: "500Gi"
    maxObjects: 10000000
```

## Step 6 - Monitor and Adjust

Use Prometheus metrics to track QoS effectiveness:

```bash
# Check throttling events
ceph tell osd.* perf dump | grep -i throttle

# Review per-pool statistics
ceph osd pool stats --format json | jq '.[] | {pool_name, read_op_per_sec: .client_io_rate.read_op_per_sec, write_op_per_sec: .client_io_rate.write_op_per_sec}'
```

Set up alerts in Grafana for pools exceeding 80% of their IOPS limit, and review tenant usage weekly to adjust limits based on actual workloads.

## Summary

A successful QoS strategy for multi-tenant Ceph requires classifying tenant workloads, applying RBD QoS limits at the pool and image level, enforcing RGW rate limits for object tenants, and continuously monitoring metrics. Combining QoS throttling with capacity quotas ensures predictable performance and fair resource distribution across all tenants.
