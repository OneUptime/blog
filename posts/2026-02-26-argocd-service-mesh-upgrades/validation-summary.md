# Validation Summary: How to Handle Service Mesh Upgrades with ArgoCD

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Argo CD
- GitOps
- Kubernetes
- Istio service mesh
- Helm charts
- kubectl
- istioctl
- Lua custom health checks

## Sources Consulted
- Argo CD sync phases and waves documentation: https://argo-cd.readthedocs.io/en/latest/user-guide/sync-waves/
- Argo CD resource health and custom health checks documentation: https://argo-cd.readthedocs.io/en/latest/operator-manual/health/
- Argo CD Application specification reference: https://argo-cd.readthedocs.io/en/release-2.13/user-guide/application-specification/
- Istio canary upgrade documentation: https://istio.io/latest/docs/setup/upgrade/canary/
- Istio Helm installation documentation: https://istio.io/latest/docs/setup/install/helm/
- Istio istioctl command reference: https://istio.io/latest/docs/reference/commands/istioctl/
- Istio configuration status field documentation: https://istio.io/latest/docs/reference/config/config-status/
- Kubernetes kubectl rollout restart documentation: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_rollout/kubectl_rollout_restart/
- Kubernetes kubectl rollout status documentation: https://kubernetes.io/docs/reference/generated/kubectl/kubectl-commands
- OneUptime linked monitoring post: https://oneuptime.com/blog/post/2026-02-26-argocd-monitor-service-mesh/view

## Issues Found
- The examples used Istio 1.21.0, which is outdated relative to the current Istio documentation track. Updated example chart and image versions to 1.30.0 and the revision name to 1-30-0.
- The base Helm chart example omitted `defaultRevision`, which Istio requires for revisioned installations so validation works correctly. Added `defaultRevision: default`.
- The post implied sync waves order separate Argo CD Applications by themselves. Clarified that this ordering applies when the Application manifests are managed by a parent app-of-apps Application, while ApplicationSet requires progressive syncs and independently managed Applications must be synced in order by the release process.
- The pre-upgrade hook did not run Istio's recommended `istioctl x precheck`. Added that check before `istioctl analyze --all-namespaces`.
- The data plane restart hook only selected namespaces with `istio-injection=enabled`, missing revision-based namespaces labeled with `istio.io/rev`. Updated it to include both label styles and de-duplicate namespaces.
- The rollback wording described rollback as instant and did not mention data plane restart/relabeling. Adjusted the language to describe a clear rollback path and the need to restart affected workloads after moving back to the previous control plane.
- The VirtualService health check used `msg.type == "ERROR"` and `msg.documentation`, but Istio validation messages use fields such as `level`, `message`, and `documentationUrl`. Updated the Lua check accordingly and clarified that Istio status fields require status/analysis to be enabled.

## Review Notes
- The guide remains a high-level GitOps pattern. In a production setup, RBAC for the hook service account, Pod Security constraints, maintenance windows, and compatibility checks for the specific source and target Istio versions should be documented in the deployment repository.
