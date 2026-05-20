# Validation Summary: How to Deploy Ceph/Rook with ArgoCD

## Status
validated

## Post Type
Tutorial / deployment guide

## Technologies Covered
- Argo CD
- GitOps
- Kubernetes
- Rook-Ceph
- Ceph RBD
- CephFS
- Ceph CSI
- Prometheus Operator ServiceMonitor
- PromQL

## Sources Consulted
- Argo CD sync waves documentation: https://argo-cd.readthedocs.io/en/latest/user-guide/sync-waves/
- Argo CD automated sync policy documentation: https://argo-cd.readthedocs.io/en/stable/user-guide/auto_sync/
- Rook Ceph operator Helm chart values for v1.19.4: https://raw.githubusercontent.com/rook/rook/v1.19.4/deploy/charts/rook-ceph/values.yaml
- Rook CephCluster CRD documentation for v1.19: https://rook.io/docs/rook/v1.19/CRDs/Cluster/ceph-cluster-crd/
- Rook Ceph CSI driver documentation: https://rook.github.io/docs/rook/latest/Storage-Configuration/Ceph-CSI/ceph-csi-drivers/
- Rook RBD StorageClass example for v1.19.4: https://raw.githubusercontent.com/rook/rook/v1.19.4/deploy/examples/csi/rbd/storageclass.yaml
- Rook CephFS StorageClass example for v1.19.4: https://raw.githubusercontent.com/rook/rook/v1.19.4/deploy/examples/csi/cephfs/storageclass.yaml
- Rook Prometheus ServiceMonitor example for v1.19.4: https://raw.githubusercontent.com/rook/rook/v1.19.4/deploy/examples/monitoring/service-monitor.yaml
- Rook upgrade documentation: https://rook.io/docs/rook/latest/Upgrade/rook-upgrade/
- Rook Ceph upgrade documentation: https://rook.io/docs/rook/latest-release/Upgrade/ceph-upgrade/
- Ceph release index: https://docs.ceph.com/en/latest/releases/
- Ceph Prometheus module documentation: https://docs.ceph.com/en/latest/mgr/prometheus/
- Ceph monitoring overview and PromQL examples: https://docs.ceph.com/en/latest/monitoring/

## Issues Found
- The guide pinned Rook `v1.13.0` and Ceph `v18.2.1`, which are outdated for a 2026 production deployment. Updated the examples to Rook `v1.19.4` and Ceph Squid `v19.2.3`, which align with current supported release guidance.
- The sync-wave guidance implied ordering across independent Argo CD Applications. Clarified that sync waves enforce the shown Application ordering when the Application resources are managed by a parent app-of-apps Application.
- The RBD and CephFS StorageClass snippets were missing the current `controller-publish-secret-*` parameters shown in Rook's current examples. Added those parameters.
- The RBD StorageClass used the full RBD image feature set without noting the kernel requirement. Added a short comment that the full feature set assumes Linux kernel 5.4 or newer.
- The ServiceMonitor example was less specific than Rook's current example. Updated the name, namespace selector, `rook_cluster` match label, `/metrics` path, and `honorLabels` setting.
- Several PromQL examples used non-current or ambiguous metric names, including `ceph_osd_utilization` and `ceph_osd_slow_ops`. Replaced them with documented Ceph metrics and queries for health details, raw capacity, pool usage, IOPS, and daemon socket health.
- The upgrade snippet claimed to override auto-sync by setting `prune: false`, but Argo CD still auto-syncs when automated sync is enabled. Added `automated.enabled: false` to correctly disable automated sync while keeping related fields explicit.

## Review Notes
The examples are still infrastructure templates and require environment-specific node names, disk names, namespaces, Prometheus Operator configuration, and kernel compatibility checks before production use.
