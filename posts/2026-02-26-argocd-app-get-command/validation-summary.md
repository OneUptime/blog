# Validation Summary: How to Use argocd app get for Detailed App Info

## Status
validated

## Post Type
Tutorial / CLI guide

## Technologies Covered
- Argo CD
- GitOps
- Kubernetes
- Argo CD CLI
- jq
- Bash

## Sources Consulted
- Argo CD `argocd app get` command reference: https://argo-cd.readthedocs.io/en/stable/user-guide/commands/argocd_app_get/
- Argo CD Resource Health documentation: https://argo-cd.readthedocs.io/en/stable/operator-manual/health/
- Argo CD Sync Windows documentation: https://argo-cd.readthedocs.io/en/stable/user-guide/sync_windows/
- Argo CD Getting Started guide, including `argocd app get` sample output: https://argo-cd.readthedocs.io/en/stable/getting_started/

## Issues Found
- The refresh explanation claimed `--refresh` uses a locally cached Git checkout and `--hard-refresh` re-fetches from Git and re-renders manifests. The official CLI documentation describes these as refreshing application data, and hard-refresh additionally refreshing the target manifests cache. Updated the wording to match the documented behavior.
- The post called the default output "Table"; the official command reference calls the default output format `wide`. Renamed the subsection and summary wording to "wide" while preserving the explanation that it is human-readable.
- The detailed tree example used `argocd app get my-app -o tree --show-operation`, but `--show-operation` shows application operation details and is not the documented way to request detailed tree output. Updated the example to `argocd app get my-app -o tree=detailed`.
- The sync-window troubleshooting example queried `.status.summary`, which contains application summary data such as images and external URLs, not sync-window state. Replaced it with the documented CLI checks: default `argocd app get` output for the current sync-window state and `argocd proj windows list default` for configured project windows.
- The post mentioned a `--watch` flag for `argocd app get`, but the current official command reference does not list that flag. Updated the section to recommend the polling loop directly.

## Review Notes
The remaining CLI flags, JSON/YAML output examples, status field paths, operation-state examples, and health/sync status descriptions are consistent with the official Argo CD documentation and Application status structure.
