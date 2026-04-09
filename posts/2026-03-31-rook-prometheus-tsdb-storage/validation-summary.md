# Validation Summary: How to Use Rook-Ceph for Prometheus TSDB Storage

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Rook-Ceph (CephBlockPool, RBD, RGW)
- Kubernetes (StorageClass, PVC, StatefulSet, Secrets)
- Prometheus (TSDB, Prometheus Operator)
- kube-prometheus-stack Helm chart
- Thanos (sidecar, object store config)
- VictoriaMetrics
- Grafana
- Alertmanager

## Sources Consulted
- Rook CephBlockPool CRD documentation (https://rook.io/docs/rook/latest/CRDs/Block-Storage/ceph-block-pool-crd/)
- Rook RBD StorageClass documentation (https://rook.io/docs/rook/latest/Storage-Configuration/Block-Storage-RBD/block-storage/)
- Ceph BlueStore compression documentation (https://docs.ceph.com/en/latest/rados/configuration/bluestore-config-ref/#inline-compression)
- Prometheus Operator API reference for ThanosSpec (https://prometheus-operator.dev/docs/api-reference/api/#monitoring.coreos.com/v1.ThanosSpec)
- kube-prometheus-stack Helm chart values (https://github.com/prometheus-community/helm-charts/tree/main/charts/kube-prometheus-stack)
- Thanos object store configuration (https://thanos.io/tip/thanos/storage.md/)
- VictoriaMetrics command-line flags documentation (https://docs.victoriametrics.com/#list-of-command-line-flags)

## Issues Found

### 1. Deprecated Thanos sidecar fields in kube-prometheus-stack values
- **What was wrong:** The Thanos sidecar configuration used `baseImage: quay.io/thanos/thanos` and `version: v0.36.0` as separate fields. These fields were deprecated in Prometheus Operator v0.32.0 in favor of a single `image` field.
- **What was changed:** Replaced `baseImage` and `version` with `image: quay.io/thanos/thanos:v0.36.0`.
- **Why:** Using deprecated fields may stop working in future Prometheus Operator versions and does not follow current best practices.

### 2. Inaccurate diagram label for Thanos data flow
- **What was wrong:** The mermaid diagram labeled the Prometheus-to-Thanos arrow as "remote write". However, the post configures the Thanos sidecar approach, where the sidecar reads TSDB blocks directly from the shared Prometheus data directory -- it does not use Prometheus remote write.
- **What was changed:** Changed the label from "remote write" to "sidecar / remote write" to accurately cover both the sidecar approach (configured in this post for Thanos) and the remote write approach (used by Cortex/Mimir).
- **Why:** The original label was misleading given that the post's Thanos configuration uses the sidecar pattern, not remote write.

## Review Notes
- The CephBlockPool spec, StorageClass parameters, kube-prometheus-stack Helm values structure, VictoriaMetrics StatefulSet, and all CLI commands are technically correct.
- The `compression_mode: aggressive` parameter is correctly placed under `spec.parameters` in the CephBlockPool CR and is a valid Ceph BlueStore compression setting.
- The StorageClass correctly references `rook-csi-rbd-provisioner` and `rook-csi-rbd-node` secrets, which are the default secret names in Rook deployments.
- The VictoriaMetrics flags (`--storageDataPath`, `--retentionPeriod`, `--httpListenAddr`) are all valid and use correct syntax.
- Thanos v0.36.0 is a valid release version.
- The `retentionSize: 90GB` value in Prometheus config uses the correct format (Prometheus accepts GB suffix).
