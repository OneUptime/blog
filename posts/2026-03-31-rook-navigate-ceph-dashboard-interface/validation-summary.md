# Validation Summary: How to Navigate the Ceph Dashboard Interface

## Status
validated

## Post Type
Guide

## Technologies Covered
- Rook (Ceph operator for Kubernetes)
- Ceph Dashboard (MGR module)
- Kubernetes (kubectl, Services, Secrets, Ingress)
- NFS Ganesha
- Ceph RBD (RADOS Block Device)
- CephFS
- Ceph Object Gateway (RGW)

## Sources Consulted
- Rook CephCluster CRD documentation: https://rook.io/docs/rook/latest/CRDs/Cluster/ceph-cluster-crd/
- Rook Dashboard documentation: https://rook.io/docs/rook/latest/Storage-Configuration/Monitoring/ceph-dashboard/
- Ceph Dashboard documentation: https://docs.ceph.com/en/latest/mgr/dashboard/
- Kubernetes Ingress API reference: https://kubernetes.io/docs/concepts/services-networking/ingress/

## Issues Found
1. **Incorrect CephCluster YAML for enabling the dashboard**: The post showed the dashboard being enabled via `spec.mgr.modules` with `- name: dashboard`, which is not the correct Rook configuration. In Rook's CephCluster CRD, the dashboard has its own dedicated configuration section at `spec.dashboard.enabled: true`. The `spec.mgr.modules` field is used for other MGR modules (like prometheus), but the dashboard is handled separately. Fixed by replacing the `spec.mgr.modules` dashboard entry with the proper `spec.dashboard` block including `enabled: true`, `ssl: true`, and `port: 8443`, while keeping the prometheus module under `spec.mgr.modules`.

## Review Notes
- The dashboard navigation sections and URL structure are accurate for recent Ceph versions (Reef/Squid). Exact menu item names may vary slightly between Ceph releases.
- The post correctly identifies the Rook secret name (`rook-ceph-dashboard-password`) and the default dashboard port (8443).
- The Ingress configuration correctly uses `nginx.ingress.kubernetes.io/backend-protocol: "HTTPS"` since the Ceph Dashboard serves over HTTPS by default.
