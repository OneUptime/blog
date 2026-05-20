# Validation Summary: How to Debug Sync Window Issues in ArgoCD

## Status
validated

## Post Type
Troubleshooting guide

## Technologies Covered
- Argo CD
- GitOps
- Kubernetes
- AppProject sync windows
- Argo CD CLI
- Cron expressions
- Time zones and daylight saving time

## Sources Consulted
- Argo CD Sync Windows user guide: https://argo-cd.readthedocs.io/en/stable/user-guide/sync_windows/
- Argo CD `argocd proj windows list` command reference: https://argo-cd.readthedocs.io/en/stable/user-guide/commands/argocd_proj_windows_list/
- Argo CD `argocd app get` command reference: https://argo-cd.readthedocs.io/en/stable/user-guide/commands/argocd_app_get/
- Argo CD `argocd version` command reference: https://argo-cd.readthedocs.io/en/stable/user-guide/commands/argocd_version/
- Argo CD v2.7 AppProject CRD schema showing `syncWindows.timeZone`: https://raw.githubusercontent.com/argoproj/argo-cd/v2.7.0/manifests/crds/appproject-crd.yaml
- robfig/cron v3 package documentation for standard five-field cron syntax: https://pkg.go.dev/github.com/robfig/cron/v3

## Issues Found
- The timezone example said that using `0 2 * * *` for 2 AM Eastern would make the window "7 hours off." This was incorrect: 2 AM UTC is 9 PM Eastern during EST or 10 PM Eastern during EDT, so it starts 4 or 5 hours earlier than intended. Updated the sentence to state the correct offset.

## Review Notes
The Argo CD CLI and `kubectl` binaries were not installed in the local environment, so command verification was performed against official Argo CD command documentation rather than local `--help` output. The post does not mention newer sync-window options such as sync overrun, but that omission is not a technical error for this troubleshooting guide.
