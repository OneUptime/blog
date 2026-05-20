# Validation Summary: How to Use argocd app list for Application Overview

## Status
validated

## Post Type
Guide

## Technologies Covered
- Argo CD CLI
- GitOps
- Kubernetes
- Bash scripting
- jq
- GitHub Actions

## Sources Consulted
- Argo CD official `argocd app list` command reference: https://argo-cd.readthedocs.io/en/stable/user-guide/commands/argocd_app_list/
- Argo CD official `argocd app sync` command reference: https://argo-cd.readthedocs.io/en/latest/user-guide/commands/argocd_app_sync/
- Argo CD official Application specification reference: https://argo-cd.readthedocs.io/en/release-2.12/user-guide/application-specification/
- Argo CD official metrics documentation: https://argo-cd.readthedocs.io/en/release-3.4/operator-manual/metrics/

## Issues Found
- The post described `argocd app list -o table` as the default table output. Current Argo CD documentation lists the valid `argocd app list` output formats as `wide`, `name`, `json`, and `yaml`, with `wide` as the default. I changed the section to use `argocd app list -o wide` and updated the sample table to include the wide output columns.
- The monitoring example calculated `HEALTHY * 100 / TOTAL` without handling an empty application list. I added a guard that exits cleanly when `TOTAL` is `0`.

## Review Notes
- The remaining `argocd app list` filters, including `--project`, `--repo`, `--cluster`, and label selectors, match the official command reference.
- The `argocd app sync "$app" --async` usage in the batch sync example matches the official command reference.
- Argo CD exposes native Prometheus application metrics such as `argocd_app_info`, which may be preferable to polling `argocd app list` for production monitoring.
