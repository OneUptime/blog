# Validation Summary: How to Handle Rook-Ceph Upgrades in GitOps Pipelines

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Rook (v1.14.0)
- Ceph (v18.2.x Reef)
- ArgoCD (sync waves, hooks)
- Kubernetes (Jobs, RBAC)
- GitOps workflows

## Sources Consulted
- Rook Upgrade Documentation: https://rook.io/docs/rook/latest-release/Upgrade/rook-upgrade/
- ArgoCD Sync Waves Documentation: https://argo-cd.readthedocs.io/en/stable/user-guide/sync-waves/
- ArgoCD Resource Hooks Documentation: https://argo-cd.readthedocs.io/en/stable/user-guide/resource_hooks/
- Rook v1.14 Release Notes: https://blog.rook.io/rook-v1-14-storage-enhancements-7ce006698e6b
- Ceph CLI Documentation: https://docs.ceph.com/en/reef/man/8/ceph/

## Issues Found
1. **Post-sync verification job missing namespace and serviceAccountName**: The post-sync Job in Step 5 was missing `namespace: rook-ceph` and `serviceAccountName: rook-ceph-operator`, while the pre-sync Job in Step 2 correctly included both. Without these, the Job would be created in the default namespace and lack permissions to query the Ceph cluster. Fixed by adding both fields to match the pre-sync Job pattern.

## Review Notes
- The upgrade order (CRDs, operator, CephCluster) is correct per official Rook documentation.
- ArgoCD sync wave annotations and hook annotations use correct syntax and values.
- Rook v1.14.0 is a valid release that supports Ceph v18.2.x (Reef).
- The Ceph CLI commands (`ceph status`, `ceph version`, `ceph osd versions`) in both pre-sync and post-sync Jobs assume the container has access to Ceph configuration and monitor endpoints. In practice, additional volume mounts for the Ceph config and keyring (from the `rook-ceph-mon` ConfigMap and `rook-ceph-mon` secret) may be needed depending on how the Rook namespace is configured. This is an acceptable simplification for a blog post but readers implementing this should be aware they may need to mount Ceph configuration.
- The `rook/ceph` image is the operator image; for dedicated tooling tasks, `quay.io/ceph/ceph` or the Rook toolbox image could also be used, but the operator image does contain the Ceph CLI tools.
