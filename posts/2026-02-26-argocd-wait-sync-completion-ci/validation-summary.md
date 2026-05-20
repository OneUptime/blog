# Validation Summary: How to Wait for ArgoCD Sync Completion in CI

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Argo CD CLI
- Argo CD REST API
- Kubernetes
- kubectl
- Bash
- GitHub Actions
- GitLab CI
- jq
- curl

## Sources Consulted
- Argo CD `argocd app wait` command reference: https://argo-cd.readthedocs.io/en/latest/user-guide/commands/argocd_app_wait/
- Argo CD `argocd app sync` command reference: https://argo-cd.readthedocs.io/en/latest/user-guide/commands/argocd_app_sync/
- Argo CD CLI installation documentation: https://argo-cd.readthedocs.io/en/stable/cli_installation/
- Argo CD API documentation: https://argo-cd.readthedocs.io/en/latest/developer-guide/api-docs/
- Argo CD resource health documentation: https://argo-cd.readthedocs.io/en/stable/operator-manual/health/
- Argo CD official releases: https://github.com/argoproj/argo-cd/releases
- Argo CD source definitions for operation phases, sync status, and health status: https://github.com/argoproj/argo-cd and https://github.com/argoproj/gitops-engine
- Kubernetes `kubectl wait` command reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_wait/

## Issues Found
- The primary `argocd app wait` example used `--health` without `--sync`, while the text described waiting for both sync and health. Argo CD only defaults to sync, health, and operation waits when no specific wait options are supplied; once `--health` is set, it selects health only. Added `--sync` to the relevant wait examples.
- The explanation of `--health` implied that the flag extends a sync wait. Updated the wording to describe using `--sync` and `--health` together.
- The REST API polling script could return success while a sync operation was still `Running` or `Terminating` if the application still reported `Synced` and `Healthy` from a prior state. Updated the success condition to require that no operation is running or terminating.
- The GitLab CI example pinned `argoproj/argocd:v2.10.0`, which is an old Argo CD release. Updated the example image to `argoproj/argocd:v3.4.1`, a current official v3.x release available in the Argo CD releases.
- The GitHub Actions CLI installation wrote directly to `/usr/local/bin/argocd`. Updated it to follow the current official Linux installation flow: download the binary, install it with `sudo install`, then remove the downloaded file.

## Review Notes
The CLI flags, REST endpoint shape, status field names, status values, `kubectl rollout status`, and `kubectl wait` examples are otherwise consistent with official documentation. The REST polling script assumes application names do not require URL encoding and that the CI job has permission to read the Argo CD application.
