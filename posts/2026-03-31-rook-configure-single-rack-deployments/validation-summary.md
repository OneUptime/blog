# Validation Summary: How to Configure Ceph for Single-Rack Deployments

## Status
validated

## Post Type
Tutorial / Configuration Guide

## Technologies Covered
- Rook (Kubernetes Ceph operator)
- Ceph (distributed storage system)
- CRUSH maps and failure domains
- Kubernetes pod anti-affinity and topology labels
- Linux NIC bonding
- mClock OSD scheduler

## Sources Consulted
- Rook CephCluster CRD network configuration documentation (https://rook.io/docs/rook/latest/CRDs/Cluster/ceph-cluster-crd/)
- Rook network providers documentation (https://rook.io/docs/rook/latest/CRDs/Cluster/network-providers/)
- Ceph OSD Config Reference — osd_op_queue and mClock profiles
- Ceph Network Config Reference — ms_dispatch_throttle_bytes
- Ceph CRUSH Maps documentation — crush rule create-replicated syntax
- Rook CephBlockPool CRD documentation

## Issues Found

### 1. Incorrect `spec.network.selectors` usage for bonded NICs (Fixed)
**What was wrong:** The post used `spec.network.selectors` with bare interface names (`"bond0"`, `"bond1"`) to configure Ceph to use bonded network interfaces. The `selectors` field is exclusively for the Multus CNI provider and expects NetworkAttachmentDefinition references (e.g., `rook-ceph/ceph-public-net`), not Linux interface names. Additionally, the `provider` field was missing entirely.

**What was changed:** Replaced with `spec.network.provider: "host"` and `spec.network.addressRanges` configuration. Host networking is the correct and simpler approach for single-rack deployments with bonded NICs — Ceph daemons use the host network stack directly, which includes the bonded interfaces. The `addressRanges` field specifies which subnets correspond to each bond for public vs. cluster traffic separation.

**Why:** Using bare interface names as selector values would cause Rook to fail to configure networking correctly. The selectors would not match any NetworkAttachmentDefinition resources, and without `provider: multus`, the selectors field is ignored entirely.

### 2. Clarified ms_dispatch_throttle_bytes comment (Minor fix)
**What was wrong:** The command `ceph config set global ms_dispatch_throttle_bytes 104857600` sets the value to its default (100 MiB = 104857600 bytes), making it effectively a no-op from a fresh install.

**What was changed:** Added a clarifying comment noting this is the default value and explaining the intent is to ensure WAN-reduced settings are not in effect.

**Why:** Without the clarification, a reader might wonder why the post explicitly sets a value to its default. The intent is to ensure single-rack clusters are not running with a WAN-optimized (lower) throttle value.

## Review Notes
- All CRUSH-related commands (`ceph osd crush rule ls`, `ceph osd crush rule dump`, `ceph osd crush rule create-replicated`) use correct syntax.
- The CephBlockPool YAML uses correct field names (`failureDomain`, `replicated.size`, `replicated.requireSafeReplicaSize`) for the `ceph.rook.io/v1` API.
- The mClock commands are correct: `mclock_scheduler` is a valid `osd_op_queue` value (default since Quincy), and `high_recovery_ops` is a valid built-in mClock profile.
- The capacity planning math is accurate (verified all calculations).
- The pod anti-affinity configuration for monitors uses correct Kubernetes and Rook CRD structure.
- The use of `topology.kubernetes.io/zone` for power circuit labeling is unconventional but technically valid — it's a creative reuse of the topology label for a single-rack scenario.
