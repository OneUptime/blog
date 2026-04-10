# Validation Summary: How to Configure Rook-Ceph Health Checks in ArgoCD

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Rook-Ceph (Kubernetes storage operator)
- ArgoCD (GitOps continuous delivery tool)
- Kubernetes (container orchestration)
- Lua (scripting language used by ArgoCD health checks)

## Sources Consulted
- Rook source code: `pkg/apis/ceph.rook.io/v1/types.go` in the `rook/rook` GitHub repository — verified `ConditionType` phase values (`Ready`, `Progressing`, `Connecting`, `Connected`, `Failure`, `Deleting`)
- ArgoCD installation manifests (`manifests/install.yaml`) in the `argoproj/argo-cd` GitHub repository — verified `argocd-application-controller` is a StatefulSet
- ArgoCD `resource_customizations/ceph.rook.io/` directory — verified built-in health check coverage for Rook CRDs
- ArgoCD documentation on resource health customizations and `argocd-cm` ConfigMap configuration

## Issues Found

1. **Incorrect Rook error phase value in all three health checks (Steps 1, 2, 3):** The post used `"Error"` as the phase value for detecting failed Rook resources. The correct value is `"Failure"`. All Rook CRDs (CephCluster, CephBlockPool, CephFilesystem) use the `ConditionType` Go type, which defines `ConditionFailure = "Failure"`. There is no `"Error"` value in the Rook type system. With the original code, the Degraded health check would never trigger for any of these resources — errors would silently fall through to the default `Progressing` state. Changed `"Error"` to `"Failure"` in all three Lua scripts.

2. **Incorrect resource type for application controller restart (Step 4):** The command `kubectl -n argocd rollout restart deployment/argocd-application-controller` referenced the application controller as a Deployment. In standard ArgoCD 2.x installations, the application controller is deployed as a **StatefulSet**. The original command would fail with a "not found" error. Changed `deployment/argocd-application-controller` to `statefulset/argocd-application-controller`.

## Review Notes
- ArgoCD (2.5+) includes built-in health checks for `CephCluster` and `CephObjectStore`, but not for `CephBlockPool` or `CephFilesystem`. The custom health checks in this post are therefore most useful for CephBlockPool and CephFilesystem. The CephCluster health check serves as an override/enhancement of the built-in one (adding Failure/Degraded detection).
- ArgoCD watches the `argocd-cm` ConfigMap for changes and may pick up health check modifications without a restart. The restart commands are a reasonable "belt and suspenders" approach but may not always be strictly necessary.
- The health checks could be further improved by handling the `Connecting` and `Connected` phases for CephBlockPool and CephFilesystem, similar to how the CephCluster check handles `Progressing`.
