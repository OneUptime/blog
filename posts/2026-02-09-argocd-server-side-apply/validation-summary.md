# Validation Summary: How to configure ArgoCD server-side apply for improved resource management

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Argo CD
- Kubernetes server-side apply
- Kubernetes managed fields
- Argo CD sync options and diff strategies
- Argo CD Application and ApplicationSet resources
- Kubernetes HorizontalPodAutoscaler

## Sources Consulted
- Argo CD sync options documentation: https://argo-cd.readthedocs.io/en/latest/user-guide/sync-options/
- Argo CD diff strategies documentation: https://argo-cd.readthedocs.io/en/release-3.3/user-guide/diff-strategies/
- Argo CD diff customization documentation: https://argo-cd.readthedocs.io/en/latest/user-guide/diffing/
- Argo CD `argocd app get` command reference: https://argo-cd.readthedocs.io/en/latest/user-guide/commands/argocd_app_get/
- Argo CD `argocd app list` command reference: https://argo-cd.readthedocs.io/en/latest/user-guide/commands/argocd_app_list/
- Argo CD `argocd app resources` command reference: https://argo-cd.readthedocs.io/en/latest/user-guide/commands/argocd_app_resources/
- Kubernetes server-side apply documentation: https://kubernetes.io/docs/reference/using-api/server-side-apply/
- Kubernetes server-side apply GA announcement: https://kubernetes.io/blog/2021/08/06/server-side-apply-ga

## Issues Found
- The post said Kubernetes introduced server-side apply in version 1.16 without mentioning its later stability status. Updated this to say it was beta in 1.16 and stable since 1.22.
- The global Argo CD configuration example used the nonexistent/incorrect `resource.server-side-diff` key in `argocd-cm` to enable server-side apply. Replaced it with the documented `controller.diff.server.side` setting in `argocd-cmd-params-cm` for server-side diff, and clarified that server-side apply is enabled through Application or ApplicationSet sync options.
- The managed fields command omitted `--show-managed-fields`, even though `kubectl get` hides managed fields by default. Added the flag and corrected the example managed field content.
- The HPA guidance implied server-side apply alone lets HPA manage `replicas` while Argo CD keeps applying it. Clarified that fields left in Git are still applied, and added `RespectIgnoreDifferences=true` where `ignoreDifferences` is intended to affect sync behavior.
- The Replace sync option was described as a way to force field ownership. Corrected it to the documented behavior: `Replace=true` uses `kubectl replace/create`, takes precedence over server-side apply, and can be destructive.
- The conflict section implied Argo CD normally reports SSA ownership conflicts. Current Argo CD uses `kubectl apply --server-side --force-conflicts`, so the section now emphasizes avoiding ownership fights by not applying fields owned by other controllers.
- The migration section repeated the incorrect server-side diff key and claimed global server-side apply via `sync.defaultSyncOptions`. Updated it to use the documented server-side diff ConfigMap setting and ApplicationSet template sync options.
- The troubleshooting section combined `ServerSideApply=true` with `Replace=true` for immutable-field handling. Removed the redundant server-side apply option because `Replace=true` takes precedence.

## Review Notes
The corrected post is technically valid against current Argo CD and Kubernetes documentation. One caveat for future updates: Argo CD server-side diff is stable in Argo CD 3.1+, while older Argo CD 2.10-2.x documentation describes it as beta.
