# Validation Summary: How to Retry a Failed Sync in ArgoCD

## Status
validated

## Post Type
Tutorial / troubleshooting guide

## Technologies Covered
- Argo CD
- Argo CD CLI
- Argo CD API
- Kubernetes
- Bash

## Sources Consulted
- Argo CD `argocd app sync` command reference: https://argo-cd.readthedocs.io/en/latest/user-guide/commands/argocd_app_sync/
- Argo CD `argocd app get` command reference: https://argo-cd.readthedocs.io/en/stable/user-guide/commands/argocd_app_get/
- Argo CD `argocd app resources` command reference: https://argo-cd.readthedocs.io/en/latest/user-guide/commands/argocd_app_resources/
- Argo CD `argocd app wait` command reference: https://argo-cd.readthedocs.io/en/latest/user-guide/commands/argocd_app_wait/
- Argo CD Sync Options documentation: https://argo-cd.readthedocs.io/en/stable/user-guide/sync-options/
- Argo CD API documentation: https://argo-cd.readthedocs.io/en/latest/developer-guide/api-docs/

## Issues Found
- The post described the application sync status itself as `Failed`. Argo CD sync status is normally `Synced`, `OutOfSync`, or `Unknown`; failed execution is represented by the last sync operation result. Updated the explanation to distinguish application sync status from the operation result.
- The UI section claimed the UI preserves previous sync options. I could not verify that as a general Argo CD behavior, so I changed it to advise reviewing options before retrying.
- The force-sync section implied `argocd app sync --force` refreshes stale cache/comparison state and described it as delete/recreate behavior. Official CLI docs describe `--force` as force apply, while delete/create behavior is documented through `Force=true,Replace=true` sync options. Updated the section to use `--refresh` and `--hard-refresh` for stale state and clarified force behavior.
- The retry-with-modified-options section used `argocd app sync --sync-option ...`, but current official `argocd app sync` docs do not list `--sync-option`. Updated examples to use `argocd app set --sync-option Validate=false` where appropriate, and current one-off sync flags `--server-side` and `--replace`.

## Review Notes
The Argo CD CLI was not installed locally, so CLI validation was performed against official Argo CD command documentation rather than local `--help` output.
