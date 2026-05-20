# Validation Summary: How to Deploy HorizontalPodAutoscalers with ArgoCD

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Argo CD
- GitOps
- Kubernetes Deployments
- Kubernetes HorizontalPodAutoscaler autoscaling/v2
- Kubernetes resource requests and Metrics Server
- Kubernetes custom metrics API
- Prometheus Adapter
- Kubernetes PodDisruptionBudget
- Kustomize overlays

## Sources Consulted
- Argo CD Sync Options: https://argo-cd.readthedocs.io/en/stable/user-guide/sync-options/
- Argo CD Diff Customization: https://argo-cd.readthedocs.io/en/latest/user-guide/diffing/
- Argo CD Sync Phases and Waves: https://argo-cd.readthedocs.io/en/latest/user-guide/sync-waves/
- Argo CD Resource Health: https://argo-cd.readthedocs.io/en/stable/operator-manual/health/
- Argo CD Automated Sync Policy: https://argo-cd.readthedocs.io/en/stable/user-guide/auto_sync/
- Kubernetes Horizontal Pod Autoscaling: https://kubernetes.io/docs/concepts/workloads/autoscaling/horizontal-pod-autoscale/
- Kubernetes HorizontalPodAutoscaler Walkthrough: https://kubernetes.io/docs/tasks/run-application/horizontal-pod-autoscale-walkthrough/
- Kubernetes PodDisruptionBudget Documentation: https://kubernetes.io/docs/tasks/run-application/configure-pdb/

## Issues Found
- The post said automated sync alone would continuously reset HPA-managed replica changes. Updated this to automated sync with self-healing, because Argo CD's self-heal option is what automatically retries sync for live cluster drift.
- The post stated that Argo CD considers HPAs healthy using specific built-in criteria. Argo CD's documented built-in health checks do not include HorizontalPodAutoscaler, so this was changed to describe a custom HPA health check based on Kubernetes HPA status conditions.
- The custom HPA health check only compared current and desired replicas. Replaced it with condition-based logic using `AbleToScale`, `ScalingActive`, and `ScalingLimited`, which reflects the status conditions exposed by `autoscaling/v2`.
- The PodDisruptionBudget percentage example said 25% of 10 replicas allows 2 disruptions. Kubernetes rounds `maxUnavailable` percentages up, so this was corrected to 3 disruptions for 10 replicas and 5 for 20 replicas.

## Review Notes
The Kubernetes manifests use current stable APIs (`autoscaling/v2` and `policy/v1`). The Argo CD `RespectIgnoreDifferences=true`, `ignoreDifferences`, system-level diff customization, and sync-wave examples match the documented configuration patterns.
