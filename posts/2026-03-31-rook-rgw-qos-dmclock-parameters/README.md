# How to Set QoS and dmclock Parameters for Ceph RGW

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Rook, Ceph, RGW, QoS, Performance, DmClock

Description: Configure Quality of Service (QoS) and dmclock scheduling parameters in Ceph RGW to ensure fair resource allocation across multiple tenants.

---

Ceph's dmclock (Distributed Modified Clock) scheduler enables QoS for RADOS operations by assigning reservation, weight, and limit values to clients. RGW can expose this to provide per-client or per-tenant bandwidth guarantees.

## Understanding dmclock Parameters

For each client class, three parameters control resource allocation:

- **Reservation** - Minimum guaranteed IOPS/throughput
- **Weight** - Proportional share during contention
- **Limit** - Maximum allowed IOPS/throughput

## RGW-Level QoS Parameters

```bash
# Check current QoS configuration
ceph config get client.rgw rgw_dmclock_admin_res
ceph config get client.rgw rgw_dmclock_admin_wgt
ceph config get client.rgw rgw_dmclock_admin_lim
```

## Configuring dmclock for Different Request Types

RGW classifies requests into categories with separate dmclock budgets:

```bash
# Admin API requests
ceph config set client.rgw rgw_dmclock_admin_res 100
ceph config set client.rgw rgw_dmclock_admin_wgt 100
ceph config set client.rgw rgw_dmclock_admin_lim 0

# Authentication requests (swift auth, STS)
ceph config set client.rgw rgw_dmclock_auth_res 100
ceph config set client.rgw rgw_dmclock_auth_wgt 100
ceph config set client.rgw rgw_dmclock_auth_lim 0

# Data upload/download (PUT/GET) requests
ceph config set client.rgw rgw_dmclock_data_res 500
ceph config set client.rgw rgw_dmclock_data_wgt 500
ceph config set client.rgw rgw_dmclock_data_lim 0

# Metadata requests (bucket operations, object metadata)
ceph config set client.rgw rgw_dmclock_metadata_res 50
ceph config set client.rgw rgw_dmclock_metadata_wgt 200
ceph config set client.rgw rgw_dmclock_metadata_lim 0
```

A limit of 0 means unlimited.

## Applying in Rook

```yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: rook-config-override
  namespace: rook-ceph
data:
  config: |
    [client.rgw.my-store.a]
    rgw_dmclock_admin_res = 100
    rgw_dmclock_admin_wgt = 100
    rgw_dmclock_admin_lim = 0
    rgw_dmclock_auth_res = 100
    rgw_dmclock_auth_wgt = 100
    rgw_dmclock_auth_lim = 0
    rgw_dmclock_data_res = 500
    rgw_dmclock_data_wgt = 500
    rgw_dmclock_data_lim = 0
    rgw_dmclock_metadata_res = 50
    rgw_dmclock_metadata_wgt = 200
    rgw_dmclock_metadata_lim = 0
```

Apply and restart:

```bash
kubectl apply -f rook-config-override.yaml
kubectl -n rook-ceph rollout restart deployment rook-ceph-rgw-my-store-a
```

## Monitoring QoS Enforcement

```bash
# Check dmclock queue stats
kubectl -n rook-ceph exec -it deploy/rook-ceph-rgw-my-store-a -- \
  ceph daemon /var/run/ceph/ceph-client.rgw.*.asok perf dump | \
  python3 -m json.tool | grep -i "dmclock\|queue"
```

## When to Use dmclock QoS

Use dmclock QoS when:
- Multiple tenants share the same RGW instance
- Background tasks (GC, lifecycle) are starving foreground requests
- You need guaranteed minimum throughput for critical workloads

## Summary

Ceph RGW dmclock QoS uses reservation, weight, and limit parameters to allocate RADOS operation budgets across different request categories. Configure separate budgets for admin, auth, data, and metadata operations. Set `res` for guaranteed minimums, `wgt` for proportional fair sharing, and `lim` to 0 for no cap or a positive value to enforce a ceiling.
