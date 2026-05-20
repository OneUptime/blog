# Validation Summary: Automate Creating ArgoCD Apps with Shell Scripts

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Argo CD
- Argo CD CLI
- Argo CD Application manifests
- Kubernetes
- GitOps
- Bash shell scripting
- CSV-driven automation
- CI/CD automation

## Sources Consulted
- Argo CD `argocd app create` command reference: https://argo-cd.readthedocs.io/en/latest/user-guide/commands/argocd_app_create/
- Argo CD Application specification reference: https://argo-cd.readthedocs.io/en/latest/user-guide/application-specification/
- Argo CD sync options documentation: https://argo-cd.readthedocs.io/en/stable/user-guide/sync-options/
- Argo CD automated sync policy documentation: https://argo-cd.readthedocs.io/en/stable/user-guide/auto_sync/
- Argo CD `argocd app list` command reference: https://argo-cd.readthedocs.io/en/stable/user-guide/commands/argocd_app_list/
- Argo CD app deletion documentation: https://argo-cd.readthedocs.io/en/latest/user-guide/app_deletion/
- Argo CD `argocd app delete` command reference: https://argo-cd.readthedocs.io/en/latest/user-guide/commands/argocd_app_delete/

## Issues Found
- The basic creation script read `$1`, `$2`, and `$3` directly while using `set -u`, so running the script without enough arguments would fail with an unbound variable before reaching the usage message. Changed those assignments to `${1:-}`, `${2:-}`, and `${3:-}`.
- The batch creation script appended to `FAILED_APPS` inside a piped `while` loop. In Bash, that loop commonly runs in a subshell, so failures would not be visible after the loop. Changed the loop to use process substitution so failure reporting works.
- The CI/CD script passed multiple labels as one comma-separated `--label` value. The Argo CD CLI documents `--label` as a repeatable string array flag, so the script now passes one `--label key=value` argument per label.
- The validation wrapper referenced required variables while using `set -u` without declaring or validating them first. Added explicit required environment variable checks and defaults for `DEST_SERVER` and `PROJECT`.
- The validation wrapper attempted to auto-register any missing repository with `--ssh-private-key-path ~/.ssh/id_rsa`, which is not generally correct for HTTPS repositories and unsafe as a generic example. Changed it to fail with instructions to register the repository using credentials appropriate for that repository.

## Review Notes
- The Argo CD Application manifest fields, sync policy fields, sync options, finalizer, retry settings, deletion command, and app listing label selector examples match current Argo CD documentation.
- `argocd` was not installed in the local environment, so CLI validation was performed against official Argo CD command references rather than local `--help` output.
