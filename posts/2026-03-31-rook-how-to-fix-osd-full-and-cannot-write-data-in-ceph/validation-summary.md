# Validation Summary: How to Fix 'osd full' and Cannot Write Data in Ceph

## Status
validated

## Post Type
Troubleshooting Guide

## Technologies Covered
- Rook-Ceph (Ceph storage orchestrator for Kubernetes)
- Ceph OSD (Object Storage Daemon)
- Ceph RBD (RADOS Block Device)
- Ceph RGW (RADOS Gateway)
- BlueStore (Ceph storage backend)
- Kubernetes (kubectl)

## Sources Consulted
- Ceph official documentation on OSD full ratios: https://docs.ceph.com/en/latest/rados/configuration/mon-config-ref/#storage-capacity
- Ceph official documentation on `ceph osd reweight-by-utilization`: https://docs.ceph.com/en/latest/rados/operations/control/#osd-subsystem
- Ceph official documentation on BlueStore compression: https://docs.ceph.com/en/latest/rados/configuration/bluestore-config-ref/#inline-compression
- Rook-Ceph documentation on CephCluster CR storage configuration: https://rook.io/docs/rook/latest/CRDs/Cluster/ceph-cluster-crd/
- Ceph official documentation on RBD commands: https://docs.ceph.com/en/latest/man/8/rbd/
- Ceph official documentation on radosgw-admin: https://docs.ceph.com/en/latest/man/8/radosgw-admin/

## Issues Found
1. **Missing `kubectl exec` prefix on RBD and radosgw-admin commands in Step 4**: The `rbd` commands (`rbd ls`, `rbd snap ls`, `rbd snap purge`, `rbd rm`) and the `radosgw-admin` commands were shown as bare commands without the `kubectl -n rook-ceph exec -it deploy/rook-ceph-tools --` prefix. Every other command in the post correctly includes this prefix since the context is Rook-Ceph on Kubernetes. Without the prefix, readers would get "command not found" errors when copying and pasting these commands on their Kubernetes nodes. Fixed by adding the `kubectl exec` prefix to all six commands.

## Review Notes
- The default threshold values (nearfull_ratio 0.85, backfillfull_ratio 0.90, full_ratio 0.95) are accurate for current Ceph releases.
- The claim that "Ceph stops accepting new writes across the entire cluster" when any OSD hits full_ratio is a slight simplification — technically writes are blocked only to PGs mapped to the full OSD. However, in practice with replicated pools, this commonly cascades to affect the whole cluster, making this a reasonable description for a troubleshooting guide.
- The `ceph osd reweight osd.<id> 0.9` syntax is correct — Ceph accepts both numeric IDs and the `osd.N` format for the reweight command.
- The recommendation to plan for expansion before reaching 80% utilization is sound operational advice, though not an official Ceph threshold.
