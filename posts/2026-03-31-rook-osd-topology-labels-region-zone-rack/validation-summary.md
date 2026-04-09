# Validation Summary: How to Configure OSD Topology Labels (Region, Zone, Rack) in Rook

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Rook (Ceph operator for Kubernetes)
- Ceph (CRUSH algorithm, OSD management, pool creation)
- Kubernetes (node labels, topology spread constraints, ConfigMaps)

## Sources Consulted
- Rook official documentation: CephCluster CRD topology section (https://rook.io/docs/rook/latest/CRDs/Cluster/ceph-cluster-crd/)
- Rook source code: `pkg/operator/ceph/cluster/osd/topology/topology.go` (KubernetesTopologyLabels, CRUSHTopologyLabels variables)
- Rook operator ConfigMap documentation and Helm chart values
- Ceph documentation: CRUSH Maps (https://docs.ceph.com/en/latest/rados/operations/crush-map/)
- Ceph documentation: Pool operations (https://docs.ceph.com/en/latest/rados/operations/pools/)

## Issues Found

### 1. Incomplete default topology priority list
**What was wrong:** The post listed only 5 default topology labels (region, zone, rack, chassis, hostname), but Rook recognizes 10 labels by default corresponding to the full Ceph CRUSH bucket hierarchy. The missing labels were: `topology.rook.io/datacenter`, `topology.rook.io/room`, `topology.rook.io/pod`, `topology.rook.io/pdu`, and `topology.rook.io/row`.

**What was changed:** Expanded the default priority list to include all 10 labels in the correct order from broadest to narrowest.

**Why:** The post stated "The default priority is:" implying completeness. Omitting 5 of 10 default labels could mislead readers into thinking those CRUSH bucket types are not supported by Rook.

### 2. Non-existent ConfigMap key `ROOK_TOPOLOGY_NODE_LABELS`
**What was wrong:** The post claimed you can override the OSD topology label priority by setting `ROOK_TOPOLOGY_NODE_LABELS` in the `rook-ceph-operator-config` ConfigMap. This key does not exist in Rook. The OSD CRUSH topology label detection is hardcoded in the operator source code and cannot be overridden via ConfigMap.

**What was changed:** Replaced with the correct key `CSI_TOPOLOGY_DOMAIN_LABELS` (which does exist) and clarified that this controls which topology labels the CSI driver uses for volume provisioning. Added a note that Rook automatically creates CRUSH buckets for whichever labels from the built-in list are present on nodes.

**Why:** Using a non-existent ConfigMap key would have no effect, and the original text misrepresented how OSD CRUSH topology is configured. The corrected text accurately describes both what the operator does automatically and what can actually be customized.

## Review Notes
- The `topologySpreadConstraints` section in the CephCluster spec is valid but serves a different purpose than CRUSH bucket assignment. TopologySpreadConstraints controls Kubernetes pod scheduling (ensuring OSD pods are evenly distributed across zones), while CRUSH bucket assignment is driven by node labels independently. The post could be clearer about this distinction, but the configuration shown is useful and correct.
- The `topology.rook.io/pod` label refers to a physical data center pod (a CRUSH bucket type), not a Kubernetes pod. This could be confusing but is the standard Ceph terminology.
- All CLI commands (`kubectl label`, `ceph osd tree`, `ceph osd crush rule create-replicated`, `ceph osd pool create`) use correct syntax and valid flags.
- The example `ceph osd tree` output correctly shows the CRUSH hierarchy with consistent weights.
- The CephCluster YAML uses the correct API version (`ceph.rook.io/v1`) and valid spec fields.
