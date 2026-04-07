# How to Update Ceph Configuration on a Running Rook Cluster

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Rook, Ceph, Configuration, Operation, Kubernetes, Management

Description: Learn how to update Ceph configuration on a live Rook cluster using CephConfigMap, ceph config set commands, and the Rook ConfigOverride mechanism.

---

## Configuration Methods in Rook

Rook provides three ways to update Ceph configuration:
1. `ceph config set` via the toolbox (runtime, persisted to mon KV store)
2. `ConfigMap` override via Rook's `rook-config-override`
3. Editing the `CephCluster` spec (for Rook-managed settings)

## Method 1: ceph config set (Recommended for Runtime Changes)

This method is persistent and immediately applied without restarts:

```bash
# Set OSD memory target to 4GB
kubectl -n rook-ceph exec -it deploy/rook-ceph-tools -- \
  ceph config set osd osd_memory_target 4294967296

# Set RGW thread pool size
kubectl -n rook-ceph exec -it deploy/rook-ceph-tools -- \
  ceph config set client.rgw rgw_thread_pool_size 512

# Verify the setting
kubectl -n rook-ceph exec -it deploy/rook-ceph-tools -- \
  ceph config get osd osd_memory_target
```

## Method 2: rook-config-override ConfigMap

For settings that must be in `ceph.conf`:

```yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: rook-config-override
  namespace: rook-ceph
data:
  config: |
    [global]
    osd_pool_default_size = 3
    osd_pool_default_min_size = 2
    mon_osd_full_ratio = .95
    mon_osd_backfillfull_ratio = .90
    mon_osd_nearfull_ratio = .85

    [osd]
    osd_scrub_begin_hour = 1
    osd_scrub_end_hour = 5
    osd_max_scrubs = 1
```

Apply and restart the relevant daemons for the change to take effect:

```bash
kubectl -n rook-ceph apply -f rook-config-override.yaml
kubectl -n rook-ceph rollout restart deployment/rook-ceph-mgr-a
```

## Method 3: CephCluster Spec Updates

Some settings are managed directly in the CephCluster spec:

```yaml
spec:
  mgr:
    modules:
    - name: pg_autoscaler
      enabled: true
    - name: dashboard
      enabled: true
  monitoring:
    enabled: true
    rulesNamespaceOverride: monitoring
```

```bash
kubectl -n rook-ceph apply -f ceph-cluster.yaml
```

## Checking Currently Applied Configuration

```bash
# View all non-default config settings
kubectl -n rook-ceph exec -it deploy/rook-ceph-tools -- ceph config dump

# Get a specific daemon's full config
kubectl -n rook-ceph exec -it deploy/rook-ceph-tools -- \
  ceph config show osd.0
```

## Resetting a Config to Default

```bash
kubectl -n rook-ceph exec -it deploy/rook-ceph-tools -- \
  ceph config rm osd osd_memory_target
```

## Verifying Config Changes Applied

For runtime changes, verify without restarting:

```bash
kubectl -n rook-ceph exec -it deploy/rook-ceph-tools -- \
  ceph tell osd.0 config get osd_memory_target
```

## Summary

Rook-Ceph supports runtime configuration updates via `ceph config set` (persisted in the mon KV store) and file-based overrides via the `rook-config-override` ConfigMap. Both methods persist across daemon restarts. Runtime changes via `ceph config set` are preferred for most operational tuning, while ConfigMap overrides are useful for settings that must be present in `ceph.conf` before the daemon connects to the monitors.
