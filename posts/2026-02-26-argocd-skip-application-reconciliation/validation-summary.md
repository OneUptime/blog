# Validation Summary: How to Skip Application Reconciliation Temporarily in ArgoCD

## Status
validated

## Post Type
Tutorial / operational guide

## Technologies Covered
- Argo CD Applications
- Argo CD automated sync
- Argo CD sync windows
- Argo CD application controller
- Kubernetes CRDs, annotations, ConfigMaps, StatefulSets, and kubectl patch/annotate/scale commands
- Prometheus alerting

## Sources Consulted
- Argo CD automated sync policy documentation: https://argo-cd.readthedocs.io/en/stable/user-guide/auto_sync/
- Argo CD `argocd app set` command reference: https://argo-cd.readthedocs.io/en/release-2.9/user-guide/commands/argocd_app_set/
- Argo CD annotations and labels reference: https://argo-cd.readthedocs.io/en/stable/user-guide/annotations-and-labels/
- Argo CD skip application reconcile documentation: https://argo-cd.readthedocs.io/en/release-3.0/user-guide/skip_reconcile/
- Argo CD sync windows documentation: https://argo-cd.readthedocs.io/en/stable/user-guide/sync_windows/
- Argo CD `argocd app sync` command reference: https://argo-cd.readthedocs.io/en/stable/user-guide/commands/argocd_app_sync/
- Argo CD FAQ for `timeout.reconciliation`: https://argo-cd.readthedocs.io/en/latest/faq/
- Argo CD `argocd-cm` example for reconciliation timeout restart requirements: https://argo-cd.readthedocs.io/en/latest/operator-manual/argocd-cm-yaml/
- Argo CD official install manifest: https://raw.githubusercontent.com/argoproj/argo-cd/stable/manifests/install.yaml
- Argo CD metrics documentation: https://argo-cd.readthedocs.io/en/stable/operator-manual/metrics/

## Issues Found
- The post described `argocd.argoproj.io/refresh="-1"` as a way to pause reconciliation. Official Argo CD documentation only supports `normal` and `hard` for this annotation, and it requests a refresh rather than pausing reconciliation. Replaced that section with a warning not to use the refresh annotation for pausing.
- The post described `argocd.argoproj.io/refresh="86400"` as a per-application reconciliation frequency control. That value is not supported. Replaced the section with the supported global `timeout.reconciliation` setting in `argocd-cm` and noted its limitations.
- The post said the skip-reconcile annotation is supported in Argo CD v2.8+. Official documentation describes it as an alpha feature since v2.7.0. Updated the version note.
- The controller scale commands targeted a Deployment. The official current install manifest deploys `argocd-application-controller` as a StatefulSet. Updated the commands to scale the StatefulSet.
- The emergency sync example used `argocd app sync --force` in a sync window context. The `--force` flag means force apply; it is not needed to use a deny window with `manualSync: true`. Removed `--force`.
- The monitoring command only detected applications where `.spec.syncPolicy.automated` was absent. Argo CD also supports explicitly setting `.spec.syncPolicy.automated.enabled: false`. Updated the jq filter to include both cases.
- The sync-window inspection comment said it listed active deny windows, but the command lists configured sync windows. Updated the comment.

## Review Notes
The post is accurate after the fixes. Sync windows prevent sync operations, while disabling auto-sync still allows reconciliation and status updates. The skip-reconcile annotation is the closest per-Application reconciliation pause, but it remains an alpha feature and is primarily intended for controller integrations.
