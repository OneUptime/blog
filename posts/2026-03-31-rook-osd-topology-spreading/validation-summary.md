# Validation Summary: How to Configure OSD Topology Spreading in Rook-Ceph

## Status
validated

## Post Type
Tutorial / How-to Guide

## Technologies Covered
- Rook (Kubernetes operator for Ceph)
- Ceph (distributed storage system, CRUSH maps)
- Kubernetes (topologySpreadConstraints, pod scheduling, node labels)
- OSD (Object Storage Daemon) placement and topology

## Sources Consulted
- Rook CephCluster CRD source code (`pkg/apis/ceph.rook.io/v1/types.go`) on GitHub - confirmed `placement.osd.topologySpreadConstraints` and `storageClassDeviceSets[].placement.topologySpreadConstraints` paths
- Rook official example manifests (`cluster.yaml`, `cluster-on-pvc.yaml`) - confirmed YAML structure and `app: rook-ceph-osd` label selector
- Ceph CRUSH Map documentation (https://docs.ceph.com/en/latest/rados/operations/crush-map/) - confirmed "zone" is default CRUSH bucket type (ID 9)
- Ceph CRUSH Map CLI documentation (https://docs.ceph.com/en/latest/rados/operations/crush-map-edits/) - confirmed `crush add-bucket`, `crush move`, `crush tree --show-shadow` syntax
- Ceph Monitoring documentation (https://docs.ceph.com/en/latest/rados/operations/monitoring/) - confirmed `ceph osd df tree` command
- Kubernetes topologySpreadConstraints documentation - confirmed GA in 1.19, valid schema fields, `DoNotSchedule`/`ScheduleAnyway` values
- Kubernetes well-known labels documentation - confirmed `topology.kubernetes.io/zone` and `kubernetes.io/hostname` as valid topology keys

## Issues Found
1. **Incorrect verification command for OSD zone distribution** (line 163-164): The original command used `.spec.nodeSelector.'topology\.kubernetes\.io/zone'` to extract zone information from OSD pods. This is incorrect because `topologySpreadConstraints` do not add entries to a pod's `nodeSelector` field -- the zone label exists on the node, not on the pod. The ZONE column would return `<none>` for all pods. **Fix:** Replaced with two commands: `kubectl get pods -o wide` to show which node each OSD pod runs on, and a separate `kubectl get nodes` command to display zone labels on nodes.

## Review Notes
- The manual CRUSH map configuration section ("Configure Ceph CRUSH to Match Topology") is valid but worth noting that when Rook detects `topology.kubernetes.io/zone` labels on nodes, it can automatically configure the CRUSH hierarchy. Manual CRUSH manipulation may conflict with Rook's automatic topology management in some configurations. The post doesn't mention this, but it's not incorrect as presented since manual CRUSH configuration is a valid approach.
- The `topology.rook.io/rack` label shown in the node labeling section is a Rook-specific convention. It works correctly but users should be aware it's not a standard Kubernetes well-known label.
- All YAML configurations use the current stable `ceph.rook.io/v1` API version and correct CRD field paths, verified against the Rook source code.
