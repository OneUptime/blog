# Validation Summary: How to Configure Ceph for SOC2 Compliance

## Status
validated

## Post Type
Guide

## Technologies Covered
- Rook (Kubernetes operator for Ceph)
- Ceph (distributed storage)
- Ceph OSD encryption (LUKS via Rook)
- Ceph Messenger v2 (msgr2 wire encryption)
- Ceph Object Gateway (RGW) with TLS
- radosgw-admin CLI (user and capability management)
- Prometheus alerting rules for Ceph
- SOC2 Trust Service Criteria

## Sources Consulted
- Rook CephCluster CRD documentation: https://rook.io/docs/rook/latest/CRDs/Cluster/ceph-cluster-crd/
- Rook CephObjectStore CRD documentation: https://rook.io/docs/rook/latest/CRDs/Object-Storage/ceph-object-store-crd/
- Ceph Messenger v2 documentation: https://docs.ceph.com/en/latest/rados/configuration/msgr2/
- Ceph radosgw-admin documentation: https://docs.ceph.com/en/latest/radosgw/admin/
- Ceph MGR Prometheus module documentation: https://docs.ceph.com/en/latest/mgr/prometheus/
- Ceph configuration reference: https://docs.ceph.com/en/latest/rados/configuration/

## Issues Found

1. **Invalid caps format in `radosgw-admin caps add` command**: The command used `--caps="buckets=read,write"` which is not valid Ceph caps syntax. Ceph does not support comma-separated permissions. Changed to `--caps="buckets=*"` which grants both read and write access on buckets.

2. **RGW-specific config options set at wrong scope**: `rgw_enable_ops_log` and `rgw_enable_usage_log` were set at the `global` config section. These are RGW-specific options (prefixed with `rgw_`) and should be scoped to `client.rgw` for correctness and best practice. Changed `ceph config set global` to `ceph config set client.rgw` for both options.

## Review Notes
- The Encryption at Rest section correctly uses `encrypted: true` on `storageClassDeviceSets` for LUKS-based OSD encryption via Rook.
- The messenger v2 commands (`ms_cluster_mode`, `ms_service_mode`, `ms_client_mode` set to `secure`) are correct for enforcing AES-GCM encryption on all Ceph wire traffic.
- The RGW TLS snippet correctly references `gateway.securePort` and `gateway.sslCertificateRef` fields from the CephObjectStore CRD.
- The Prometheus alert rules use correct metric names (`ceph_health_status`, `ceph_osd_up`) and label names (`ceph_daemon`) from the Ceph MGR Prometheus exporter.
- In a Rook-managed cluster, `ceph config set` commands would need to be run from the Rook toolbox pod. The post does not mention this, but it is a usage detail rather than a technical error.
