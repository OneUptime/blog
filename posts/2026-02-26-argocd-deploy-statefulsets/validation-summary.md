# Validation Summary: How to Deploy StatefulSets with ArgoCD

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Argo CD
- Kubernetes
- StatefulSets
- PersistentVolumeClaims
- Redis
- GitOps

## Sources Consulted
- Kubernetes StatefulSet documentation: https://kubernetes.io/docs/concepts/workloads/controllers/statefulset/
- Argo CD Sync Phases and Waves documentation: https://argo-cd.readthedocs.io/en/latest/user-guide/sync-waves/
- Argo CD Sync Options documentation: https://argo-cd.readthedocs.io/en/stable/user-guide/sync-options/
- Argo CD Resource Health documentation: https://argo-cd.readthedocs.io/en/stable/operator-manual/health/
- Argo CD Diff Customization documentation: https://argo-cd.readthedocs.io/en/latest/user-guide/diffing/
- Argo CD Resource Tracking documentation: https://argo-cd.readthedocs.io/en/latest/user-guide/resource_tracking/

## Issues Found
- The post stated that StatefulSet PVCs are not deleted when the StatefulSet is deleted. Kubernetes now supports `persistentVolumeClaimRetentionPolicy`, with `Retain` as the default, so the statement was updated to describe the default behavior and the configurable deletion policy.
- The Argo CD `PrunePropagationPolicy=orphan` explanation claimed it keeps PVCs when pruning. This was too broad because PVC retention is controlled by Kubernetes StatefulSet PVC retention policy. The explanation was updated to distinguish orphan deletion propagation from PVC retention.
- The PVC lifecycle section said PVCs are not shown as part of the Argo CD Application. Argo CD may show related child resources in the resource tree, but controller-created PVCs are not tracked as desired resources from Git. The wording was corrected.
- The PVC listing command used `kubectl get pvc -l app=redis`, but the `volumeClaimTemplates` example did not explicitly apply that label to generated PVCs. The template now includes `labels: app: redis`.
- The diff customization section described "status field differences" while the snippet ignored `volumeClaimTemplates` fields. The heading and explanation were corrected, and the note now states that Argo CD ignores resource `status` fields by default.
- The StatefulSet health section claimed Argo CD checks only `readyReplicas` against desired replicas. Argo CD's built-in check also considers observed generation and updated replicas, so the claim and sample Lua health check were corrected.
- The scaling section stated that scale-down PVCs persist unconditionally. This was updated to mention `persistentVolumeClaimRetentionPolicy.whenScaled: Delete`.

## Review Notes
- The StatefulSet example uses `rollingUpdate.maxUnavailable`, which is documented as a beta field in current Kubernetes documentation and enabled by default. Clusters older than the Kubernetes version that supports this field may reject it.
- The Redis manifests are suitable as illustrative Kubernetes resources, but a production Redis Cluster deployment would still need complete cluster initialization, readiness checks, and operational safeguards beyond the scope of this post.
