# Validation Summary: How to Configure Ceph for GPU Cluster Data Storage

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Rook (Kubernetes operator for Ceph)
- Ceph (distributed storage system)
- Kubernetes (container orchestration)
- NVIDIA A100 GPUs / NVLink
- NVMe storage devices
- CephFS / RBD
- Python (dataset preloader)

## Sources Consulted
- Rook CephCluster CRD documentation (network spec, provider options, selectors usage) - https://rook.io/docs/rook/latest/CRDs/Cluster/ceph-cluster-crd/
- Ceph OSD configuration reference (osd_op_num_shards, osd_op_num_threads_per_shard) - https://docs.ceph.com/en/reef/rados/configuration/osd-config-ref/
- Ceph RBD configuration reference (rbd_cache, rbd_cache_size) - https://docs.ceph.com/en/latest/rbd/rbd-config-ref/
- Ceph centralized config store documentation (entity-based config, ceph config set) - https://docs.ceph.com/en/latest/rados/configuration/ceph-conf/
- Kubernetes Job specification (restartPolicy requirements) - https://kubernetes.io/docs/concepts/workloads/controllers/job/
- NVIDIA A100 GPU specifications (HBM2e memory bandwidth ~2TB/s)

## Issues Found

### 1. Invalid network selectors with host provider (Storage Network Topology section)
**What was wrong:** The CephCluster YAML combined `provider: host` with `selectors` containing host interface names (`enp5s0f0`, `enp5s0f1`). The `selectors` field is only valid with `provider: multus` and expects NetworkAttachmentDefinition names, not host interface names. With `provider: host`, selectors are not used.
**What was changed:** Removed the invalid `selectors` block from the CephCluster YAML. Added a separate bash code block showing the correct approach: using `ceph config set global public_network` and `cluster_network` with CIDR ranges to bind Ceph traffic to specific 100GbE subnets.
**Why:** The original configuration would be silently ignored or cause errors. The correct way to control which interfaces Ceph uses with host networking is through Ceph's native public_network/cluster_network CIDR settings.

### 2. Section title mismatch: "DaemonSet" vs Job (Deploy Data Pre-loading section)
**What was wrong:** The section was titled "Deploy Data Pre-loading DaemonSet" but the YAML defined a Kubernetes Job (`kind: Job` under `apiVersion: batch/v1`), not a DaemonSet.
**What was changed:** Renamed the section heading from "Deploy Data Pre-loading DaemonSet" to "Deploy Data Pre-loading Job".
**Why:** A Job is the correct resource for a one-time data preloading task. The title was misleading.

### 3. Missing restartPolicy in Job pod spec (Deploy Data Pre-loading section)
**What was wrong:** The Job's pod template was missing the `restartPolicy` field. The default pod restartPolicy is `Always`, which is invalid for Jobs. The Kubernetes API server rejects Jobs with `restartPolicy: Always` with: `Unsupported value: "Always": supported values: "OnFailure", "Never"`.
**What was changed:** Added `restartPolicy: Never` to the pod template spec.
**Why:** Without an explicit restartPolicy of `Never` or `OnFailure`, the Job would fail validation and not be created.

## Review Notes
- The Ceph tuning options (`osd_op_num_shards`, `osd_op_num_threads_per_shard`, `objecter_inflight_ops`, `rbd_cache`, `rbd_cache_size`) are all valid and correctly named across Ceph Quincy, Reef, and Squid releases.
- The `ceph config set client.gpu-node-1` syntax for per-entity config is valid, though users need to ensure the entity name matches an actual CephX auth entity.
- The bandwidth calculation (8 x 32 x 10MB / 0.5s = 5.12 GB/s) is mathematically correct.
- For NVMe-specific OSD tuning, `osd_op_num_shards_ssd` could be more precise than the general `osd_op_num_shards`, but the general option is valid and will work.
- The `public_network` and `cluster_network` Ceph config settings should ideally be configured before cluster bootstrap for best results. Setting them post-bootstrap requires daemon restarts to take full effect.
- The pool creation uses explicit PG count (256) followed by enabling pg_autoscaler, which is slightly contradictory but not incorrect -- the autoscaler will adjust PGs over time.
