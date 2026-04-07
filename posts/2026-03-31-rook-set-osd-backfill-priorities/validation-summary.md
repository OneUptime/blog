# Validation Summary: How to Set OSD Backfill Priorities in Ceph

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Rook (Ceph operator for Kubernetes)
- Ceph (distributed storage system)
- Ceph OSD backfill and recovery subsystem
- Kubernetes (kubectl, ConfigMaps)

## Sources Consulted
- Ceph official documentation on OSD configuration options: https://docs.ceph.com/en/latest/rados/configuration/osd-config-ref/
- Rook documentation on Ceph configuration overrides: https://rook.io/docs/rook/latest/Storage-Configuration/Advanced/ceph-configuration/
- Ceph documentation on backfill and recovery: https://docs.ceph.com/en/latest/rados/operations/placement-groups/
- Rook toolbox documentation: https://rook.io/docs/rook/latest/Troubleshooting/ceph-toolbox/

## Issues Found
1. **Incorrect CephCluster CRD configuration section**: The post originally showed a `spec.cephConfig` field in the CephCluster CRD for persisting Ceph configuration. This field does not exist in the Rook CephCluster CRD. The correct approach for persisting Ceph config overrides in Rook is to use the `rook-config-override` ConfigMap. Replaced the incorrect CephCluster CRD YAML with the correct ConfigMap approach, and added a note about restarting OSD pods after applying the ConfigMap. Also updated the summary paragraph to reference the ConfigMap instead of the CRD.

## Review Notes
- The `osd_max_backfills` default of 1 is correct for current Ceph releases.
- All `ceph config set` commands use the correct syntax for the centralized config store (Ceph Luminous+).
- The `ceph osd set/unset nobackfill` commands are correct.
- The `watch` command inside the toolbox container is a practical approach, though users should be aware that the toolbox image must have `watch` installed (it typically does in the standard Rook toolbox image).
