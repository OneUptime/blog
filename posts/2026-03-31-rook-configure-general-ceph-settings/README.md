# How to Configure General Ceph Settings

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Rook, Ceph, Configuration, Global, Setting

Description: Learn how to configure general Ceph global settings including networking, authentication, capacity thresholds, and monitor tuning.

---

## The Global Section

Ceph's `[global]` section in `ceph.conf` applies to all daemons unless overridden by a more specific section. In modern Ceph, these settings are stored in the monitor configuration database and can be viewed and modified with `ceph config` commands.

In Rook, global settings are applied via the `CephCluster` CR's `cephConfig.global` map.

## Networking Settings

Always configure separate public and cluster networks in production:

```ini
[global]
public_network = 192.168.1.0/24
cluster_network = 10.0.0.0/24
```

The public network carries client I/O; the cluster network carries replication and heartbeat traffic. Separating them prevents client traffic from affecting replication.

Apply in Rook with host networking using `addressRanges`:

```yaml
spec:
  network:
    provider: host
    addressRanges:
      public:
        - "192.168.1.0/24"
      cluster:
        - "10.0.0.0/24"
```

## Capacity and Ratio Settings

```bash
# Stop accepting writes when 95% full
kubectl -n rook-ceph exec -it deploy/rook-ceph-tools -- \
  ceph config set global mon_osd_full_ratio 0.95

# Warn when 85% full
kubectl -n rook-ceph exec -it deploy/rook-ceph-tools -- \
  ceph config set global mon_osd_nearfull_ratio 0.85

# Stop backfill when 90% full
kubectl -n rook-ceph exec -it deploy/rook-ceph-tools -- \
  ceph config set global mon_osd_backfillfull_ratio 0.90
```

## Monitor Settings

Prevent accidental pool deletion in production:

```bash
kubectl -n rook-ceph exec -it deploy/rook-ceph-tools -- \
  ceph config set mon mon_allow_pool_delete false
```

Set the minimum ratio of OSDs that must remain `in` to prevent automatic OSD out-marking:

```bash
kubectl -n rook-ceph exec -it deploy/rook-ceph-tools -- \
  ceph config set global mon_osd_min_in_ratio 0.75
```

## Max Object Name Length

Some workloads (S3, RGW) require longer object names. Increase the max:

```bash
kubectl -n rook-ceph exec -it deploy/rook-ceph-tools -- \
  ceph config set global osd_max_object_name_len 4096

kubectl -n rook-ceph exec -it deploy/rook-ceph-tools -- \
  ceph config set global osd_max_object_namespace_len 256
```

## Applying via Rook CephCluster CR

```yaml
apiVersion: ceph.rook.io/v1
kind: CephCluster
metadata:
  name: rook-ceph
  namespace: rook-ceph
spec:
  cephConfig:
    global:
      mon_osd_full_ratio: "0.95"
      mon_osd_nearfull_ratio: "0.85"
      osd_max_object_name_len: "4096"
    mon:
      mon_allow_pool_delete: "false"
```

## Viewing All Current Settings

Display the full configuration stored in the monitor database:

```bash
kubectl -n rook-ceph exec -it deploy/rook-ceph-tools -- \
  ceph config dump
```

View settings for a specific daemon:

```bash
kubectl -n rook-ceph exec -it deploy/rook-ceph-tools -- \
  ceph config show mon.a
```

## Summary

General Ceph settings in `[global]` control networking, capacity thresholds, monitor behavior, and object limits. Use `ceph config set` for runtime changes and the `CephCluster` CR's `cephConfig` field for persistent Rook-managed configuration. Always separate public and cluster networks, and set conservative capacity thresholds to prevent silent cluster degradation.
