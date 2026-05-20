# Validation Summary: How to Use Selective Sync from the ArgoCD CLI

## Status
validated

## Post Type
Technical guide / CLI reference

## Technologies Covered
- Argo CD
- Argo CD CLI
- Kubernetes
- GitOps
- jq
- Bash

## Sources Consulted
- Argo CD `argocd app sync` command reference: https://argo-cd.readthedocs.io/en/stable/user-guide/commands/argocd_app_sync/
- Argo CD Selective Sync documentation: https://argo-cd.readthedocs.io/en/latest/user-guide/selective_sync/
- Argo CD Sync Phases and Waves documentation: https://argo-cd.readthedocs.io/en/latest/user-guide/sync-waves/
- Argo CD `argocd app resources` command reference: https://argo-cd.readthedocs.io/en/latest/user-guide/commands/argocd_app_resources/
- Argo CD `argocd app get` command reference: https://argo-cd.readthedocs.io/en/stable/user-guide/commands/argocd_app_get/
- Argo CD `argocd app wait` command reference: https://argo-cd.readthedocs.io/en/stable/user-guide/commands/argocd_app_wait/

## Issues Found
- `argocd app resources my-app --output json` is not a valid current documented output mode. The current `argocd app resources` command documents `tree` and `tree=detailed` output formats. Replaced JSON scripting examples with `argocd app get my-app -o json | jq '.status.resources...'`, which is supported by the `argocd app get` command.
- The jq examples used `\(.group)` directly. Core Kubernetes resources may omit `group` in Argo CD application JSON, which would produce `null:ConfigMap:name` instead of `:ConfigMap:name`. Updated selectors to use `\(.group // "")`.
- The Bash script built a string of flags and executed it with `eval`. Replaced it with a Bash array so repeated `--resource` flags are passed correctly without shell re-evaluation.
- The limitations section stated that selective sync bypasses sync waves and hooks. Official documentation explicitly states that hooks do not run during selective sync, but does not support that broad wording for sync waves. Changed the sentence to the documented hook limitation.

## Review Notes
The main `argocd app sync --resource GROUP:KIND:NAME` examples, repeated `--resource` usage, `--dry-run`, `--force`, `--replace`, `--prune`, retry flags, `--revision`, `argocd app wait --resource`, and `argocd app get --show-operation` were consistent with official Argo CD CLI documentation.
