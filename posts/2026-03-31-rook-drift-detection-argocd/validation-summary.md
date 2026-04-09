# Validation Summary: How to Configure Rook-Ceph Drift Detection in ArgoCD

## Status
validated

## Post Type
Tutorial / Step-by-step Guide

## Technologies Covered
- ArgoCD (Application CRD, sync policies, CLI, metrics)
- Rook-Ceph (CephCluster, CephBlockPool CRDs)
- Kubernetes (StorageClass, Deployments, Events)
- Prometheus (PrometheusRule for alerting)

## Sources Consulted
- ArgoCD Diffing Documentation: https://argo-cd.readthedocs.io/en/stable/user-guide/diffing/
- ArgoCD Sync Options Documentation: https://argo-cd.readthedocs.io/en/stable/user-guide/sync-options/
- ArgoCD Metrics Documentation: https://argo-cd.readthedocs.io/en/stable/operator-manual/metrics/
- ArgoCD CLI `argocd app diff` Reference: https://argo-cd.readthedocs.io/en/stable/user-guide/commands/argocd_app_diff/
- ArgoCD ConfigMap Reference: https://argo-cd.readthedocs.io/en/stable/operator-manual/argocd-cm-yaml/
- ArgoCD Server Command Reference: https://argo-cd.readthedocs.io/en/stable/operator-manual/server-commands/argocd-server/
- Rook CephCluster CRD: https://rook.io/docs/rook/latest/CRDs/Cluster/ceph-cluster-crd/
- Rook CephBlockPool CRD: https://rook.io/docs/rook/latest/CRDs/Block-Storage/ceph-block-pool-crd/

## Issues Found
1. **Invalid `argocd-cm` ConfigMap keys in Step 5**: The post referenced `audit.logFormat: json` and `server.enable.gzip: "true"` as keys in the `argocd-cm` ConfigMap. Neither key exists in `argocd-cm`. `audit.logFormat` is not a valid ArgoCD configuration key at all — ArgoCD does not have a dedicated audit log format setting in any ConfigMap. `server.enable.gzip` is controlled via the `--enable-gzip` CLI flag on argocd-server, not through a ConfigMap. **Fix:** Changed the ConfigMap reference from `argocd-cm` to `argocd-cmd-params-cm` (the correct ConfigMap for server parameters), replaced `audit.logFormat: json` with `server.log.format: json`, and replaced `server.enable.gzip: "true"` with `server.log.level: info`. Updated the surrounding text to accurately describe what the configuration does.

## Review Notes
- All other technical content verified as correct: `ignoreDifferences` with `jsonPointers`, `RespectIgnoreDifferences=true` sync option, `argocd_app_info` metric with `sync_status` label, `argocd app diff --hard-refresh` flag, Rook-Ceph API groups and CRD kinds, and the kubectl events command.
- The JSON Pointer escape `~1` for `/` in `storageclass.kubernetes.io/is-default-class` is correctly applied per RFC 6901.
- The Prometheus alert expression `argocd_app_info{name="rook-ceph", sync_status!="Synced"} == 1` is valid PromQL and uses the correct metric and label names.
