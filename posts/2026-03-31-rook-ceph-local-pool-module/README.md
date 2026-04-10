# How to Configure the Local Pool Module in Ceph

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Rook, Ceph, Pool, Manager, Storage

Description: Configure the Ceph Manager local pool module to create and manage storage pools optimized for local workloads with configurable replication and placement.

---

The Ceph Manager local pool module automatically creates RADOS pools that are localized to a subset of the overall cluster. It monitors the CRUSH topology and creates pools with corresponding CRUSH rules, applying sensible defaults while exposing key tuning parameters.

## Understanding the Local Pool Module

The local pool module is a MGR module that:
- Automatically creates localized pools for each CRUSH subtree (e.g., per rack or per host)
- Generates CRUSH rules that restrict data placement to the local subtree
- Manages placement group counts automatically

## Enabling the Local Pool Module

```bash
# Enable the local pool module
kubectl -n rook-ceph exec -it deploy/rook-ceph-mgr-a -- \
  ceph mgr module enable localpool

# Verify activation
kubectl -n rook-ceph exec -it deploy/rook-ceph-mgr-a -- \
  ceph mgr module ls | grep localpool
```

## Configuring Default Pool Settings

```bash
# Set default replication size for new pools
kubectl -n rook-ceph exec -it deploy/rook-ceph-mgr-a -- \
  ceph config set mgr mgr/localpool/num_rep 3

# Set minimum replication size (for degraded write acceptance)
kubectl -n rook-ceph exec -it deploy/rook-ceph-mgr-a -- \
  ceph config set mgr mgr/localpool/min_size 2

# Set the CRUSH subtree type for pool creation (default: rack)
kubectl -n rook-ceph exec -it deploy/rook-ceph-mgr-a -- \
  ceph config set mgr mgr/localpool/subtree host
```

## Creating Pools Manually

The localpool module creates pools automatically, but you can also create pools manually using standard Ceph commands:

```bash
# Create a replicated pool with 32 placement groups
kubectl -n rook-ceph exec -it deploy/rook-ceph-mgr-a -- \
  ceph osd pool create my-app-pool 32 32

# Set application type on the pool
kubectl -n rook-ceph exec -it deploy/rook-ceph-mgr-a -- \
  ceph osd pool application enable my-app-pool rbd
```

## Creating Rook-Managed Pools

In Rook, use `CephBlockPool` for replicated pools:

```yaml
apiVersion: ceph.rook.io/v1
kind: CephBlockPool
metadata:
  name: my-app-pool
  namespace: rook-ceph
spec:
  replicated:
    size: 3
    requireSafeReplicaSize: true
  parameters:
    compression_mode: "aggressive"
  mirroring:
    enabled: false
  statusCheck:
    mirror:
      disabled: false
```

Apply and verify:

```bash
kubectl apply -f pool.yaml
kubectl -n rook-ceph get cephblockpool my-app-pool
```

## Pool Health Checks

```bash
# List all pools and their stats
kubectl -n rook-ceph exec -it deploy/rook-ceph-mgr-a -- \
  ceph osd pool ls detail

# Check pool utilization
kubectl -n rook-ceph exec -it deploy/rook-ceph-mgr-a -- \
  ceph df detail

# Verify replication health
kubectl -n rook-ceph exec -it deploy/rook-ceph-mgr-a -- \
  ceph health detail | grep -i pool
```

## Setting Pool Quotas

```bash
# Set maximum object count
kubectl -n rook-ceph exec -it deploy/rook-ceph-mgr-a -- \
  ceph osd pool set-quota my-app-pool max_objects 10000000

# Set maximum size in bytes (100 GB)
kubectl -n rook-ceph exec -it deploy/rook-ceph-mgr-a -- \
  ceph osd pool set-quota my-app-pool max_bytes 107374182400
```

## Summary

The Ceph MGR local pool module streamlines pool creation with configurable replication and CRUSH rule defaults. In Rook deployments, prefer the `CephBlockPool` CRD for declarative pool management. Configure pool quotas with `ceph osd pool set-quota` to prevent any single pool from consuming all available storage capacity.
