# Validation Summary: How to Add New Nodes to a Running Rook-Ceph Cluster

## Status
validated

## Post Type
Tutorial / Step-by-step Guide

## Technologies Covered
- Rook (Kubernetes Ceph operator)
- Ceph (distributed storage system)
- Kubernetes (container orchestration)
- sgdisk (GPT partition tool)
- kubectl CLI
- Ceph CLI (ceph osd, ceph status)

## Sources Consulted
- Rook official documentation: CephCluster CRD specification (https://rook.io/docs/rook/latest/CRDs/Cluster/ceph-cluster-crd/)
- Rook official documentation: OSD configuration (https://rook.io/docs/rook/latest/CRDs/Cluster/ceph-cluster-crd/#osd-configuration-settings)
- Ceph official documentation: CRUSH map management (https://docs.ceph.com/en/latest/rados/operations/crush-map/)
- Ceph official documentation: `ceph osd crush reweight` command reference
- Kubernetes documentation: Well-known labels (`topology.kubernetes.io/zone`) (https://kubernetes.io/docs/reference/labels-annotations-taints/)
- sgdisk man page for `--print` flag validation

## Issues Found
No technical issues found.

## Review Notes
- The `ceph osd crush reweight` command in Step 6 uses `osd.9` and weight `2.0` as examples. The weight value corresponds to disk size in TB, which is correct but could benefit from a brief inline note explaining that convention. Not an error, just a potential clarity improvement.
- The `ssh new-worker-4` commands assume the Kubernetes node name matches the SSH hostname, which may not always be the case in production environments. This is acceptable for a tutorial example.
- All commands use `-it` flags with `kubectl exec` for the Ceph toolbox, which works correctly even for non-interactive single commands. This is standard practice in Rook documentation.
