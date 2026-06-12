# Validation Summary: How to Implement ArgoCD Sync Windows

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Argo CD
- Argo CD AppProject sync windows
- Kubernetes custom resources
- Argo CD CLI
- kubectl
- Prometheus alerting

## Sources Consulted
- Argo CD Sync Windows documentation: https://argo-cd.readthedocs.io/en/stable/user-guide/sync_windows/
- Argo CD `argocd app get` command reference: https://argo-cd.readthedocs.io/en/stable/user-guide/commands/argocd_app_get/
- Argo CD `argocd app sync` command reference: https://argo-cd.readthedocs.io/en/stable/user-guide/commands/argocd_app_sync/
- Argo CD `argocd proj windows list` command reference: https://argo-cd.readthedocs.io/en/stable/user-guide/commands/argocd_proj_windows_list/
- Argo CD application API source for `SyncWindow` fields: https://github.com/argoproj/argo-cd/blob/master/pkg/apis/application/v1alpha1/types.go
- Argo CD Metrics documentation: https://argo-cd.readthedocs.io/en/latest/operator-manual/metrics/

## Issues Found
- The basic namespace-targeting example used both `applications: ['*']` and `namespaces: ['production']` while saying it blocks only the production namespace. Argo CD ORs selector types by default, so `applications: ['*']` would match every application. Removed the application selector from that example.
- The maintenance-window-only example used both `applications: ['*']` and `namespaces: ['production']`, which also made the namespace selector ineffective under default OR matching. Removed the application selector so the window targets the production namespace as described.
- The allow-window flowchart and explanation referred to any allow window being defined. Argo CD applies this rule to matching allow windows, so the wording was updated to say "matching allow window."
- The targeting section did not mention Argo CD's default OR behavior when multiple selector types are used. Added a note explaining OR matching and `andOperator: true`.
- The UI status color list said manual sync only is yellow. The official Argo CD documentation says this state is orange, so the color was corrected.

## Review Notes
- The remaining AppProject fields, sync window fields (`kind`, `schedule`, `duration`, `applications`, `namespaces`, `clusters`, `manualSync`, `timeZone`, and `andOperator`), CLI examples, `kubectl` examples, and Prometheus metric name were checked against official documentation and current source references.
- `argocd app sync myapp --dry-run` previews apply behavior and is valid, but it is not a pure schedule-inspection command; `argocd app get myapp` and `argocd proj windows list production` are the clearer ways to inspect sync-window state.
