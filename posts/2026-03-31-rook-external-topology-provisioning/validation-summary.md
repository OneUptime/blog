# Validation Summary: How to Use Topology-Based Provisioning with External Clusters in Rook

## Status
validated

## Post Type
Tutorial / Step-by-step Guide

## Technologies Covered
- Rook (v1.10+)
- Ceph (CRUSH rules, OSD pools, RBD)
- Kubernetes (StorageClass, PVC, CSI topology, node labels)
- Ceph CSI Driver (topology-constrained pools)

## Sources Consulted
- Ceph documentation on `ceph osd crush rule create-replicated` command syntax: `<name> <root> <failure-domain> [<class>]` where `<class>` is a device class (hdd, ssd, nvme), not a CRUSH type
- Ceph documentation on device classes (hdd, ssd, nvme are the built-in classes)
- Rook documentation on CSI topology configuration (`CSI_ENABLE_TOPOLOGY`, `CSI_TOPOLOGY_DOMAIN_LABELS`)
- Ceph CSI documentation on `topologyConstrainedPools` StorageClass parameter format
- Kubernetes documentation on `volumeBindingMode: WaitForFirstConsumer` and `allowedTopologies`
- Cross-referenced with existing blog posts in this repo: `posts/2026-01-30-ceph-device-classes/README.md`, `posts/2026-03-31-rook-crush-rules-replicated-pools/README.md`

## Issues Found
1. **Incorrect CRUSH rule command** (Step 2, line 59): The command `ceph osd crush rule create-replicated zone-replicated default zone osd` included `osd` as the final argument, which is interpreted as a device class filter. "osd" is not a valid device class — it is a CRUSH bucket type. Valid device classes are hdd, ssd, nvme, or custom-defined classes. Since the tutorial intends to create a rule that distributes replicas across zones without filtering by device class, the `osd` argument was removed. Fixed to: `ceph osd crush rule create-replicated zone-replicated default zone`.

## Review Notes
- The tutorial creates the StorageClass (Step 3) before creating the underlying Ceph pools (Step 4). While this works because Kubernetes does not validate pool existence at StorageClass creation time, readers following the steps sequentially will have a non-functional StorageClass until Step 4 is complete. Consider reordering in a future revision.
- All Kubernetes YAML manifests (StorageClass, PVC, Pod, ConfigMap) are syntactically correct and use valid field names.
- The `topologyConstrainedPools` JSON format with `poolName`, `domainSegments`, `domainLabel`, and `value` fields is correct per Ceph CSI documentation.
- The `CSI_ENABLE_TOPOLOGY` and `CSI_TOPOLOGY_DOMAIN_LABELS` ConfigMap keys are correct for the Rook operator.
- The `ceph osd pool create` commands in Step 4 use correct syntax including the CRUSH rule name as the final argument.
