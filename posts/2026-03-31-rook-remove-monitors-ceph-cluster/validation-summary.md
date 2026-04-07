# Validation Summary: How to Remove Monitors from a Ceph Cluster

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Rook (Ceph operator for Kubernetes)
- Ceph (monitor subsystem, quorum management)
- Kubernetes (kubectl, CRDs, ConfigMaps, Deployments, Services, PVCs)

## Sources Consulted
- Ceph official documentation on monitor management: https://docs.ceph.com/en/latest/rados/operations/add-or-rm-mons/
- Rook documentation on CephCluster CRD mon configuration: https://rook.io/docs/rook/latest/CRDs/Cluster/ceph-cluster-crd/
- Rook documentation on monitor troubleshooting: https://rook.io/docs/rook/latest/Troubleshooting/ceph-common-issues/#mon-out-of-quorum

## Issues Found
- **Misleading comment on service deletion command**: The comment `# Delete the MON configmap entry if present` was placed above a `kubectl delete svc` command that deletes a Kubernetes Service, not a ConfigMap entry. Changed the comment to `# Delete the MON service` to accurately describe the command. ConfigMap cleanup is correctly covered in a separate section below.

## Review Notes
- All `ceph` CLI commands (`mon dump`, `quorum_status`, `mon remove`) are correct and current.
- The `CephCluster` CRD `spec.mon.count` field is the correct declarative approach for Rook-managed monitor scaling.
- The ConfigMap `rook-ceph-mon-endpoints` is the correct resource that stores monitor endpoint mappings, with `data.mapping` and `data.data` fields.
- Kubernetes resource naming conventions (`rook-ceph-mon-<name>` for deployments, services, and PVCs) are accurate.
- The post correctly emphasizes maintaining quorum as the critical safety constraint when removing monitors.
- When manually editing the `rook-ceph-mon-endpoints` ConfigMap, users should be aware that the Rook operator may reconcile and overwrite manual changes. The post could benefit from a note about this in the future, but this is not an error.
