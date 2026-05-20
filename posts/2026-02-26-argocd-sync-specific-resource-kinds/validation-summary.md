# Validation Summary: How to Sync Only Specific Resource Kinds in ArgoCD

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Argo CD CLI
- Kubernetes resource synchronization
- Bash scripting
- jq JSON filtering
- GitLab CI/CD

## Sources Consulted
- Argo CD `argocd app sync` command reference: https://argo-cd.readthedocs.io/en/latest/user-guide/commands/argocd_app_sync/
- Argo CD `argocd app get` command reference: https://argo-cd.readthedocs.io/en/stable/user-guide/commands/argocd_app_get/
- Argo CD `argocd app resources` command reference: https://argo-cd.readthedocs.io/en/latest/user-guide/commands/argocd_app_resources/
- Argo CD Selective Sync documentation: https://argo-cd.readthedocs.io/en/latest/user-guide/selective_sync/
- Argo CD Sync Phases and Waves documentation: https://argo-cd.readthedocs.io/en/latest/user-guide/sync-waves/
- Argo CD `argocd login` command reference: https://argo-cd.readthedocs.io/en/stable/user-guide/commands/argocd_login/

## Issues Found
- The post used `argocd app resources --output json`, but the current official `argocd app resources` command reference documents only tree output formats. I changed the examples and scripts to use `argocd app get APP -o json` and read `.status.resources[]`, which is the documented JSON source for application resource status.
- Resource selectors were built as `GROUP:KIND:NAME` without preserving namespace. Argo CD documents namespace-qualified selectors for same-name resources in different namespaces, so I updated selector construction to emit `GROUP:KIND:NAMESPACE/NAME` when `.namespace` is present.
- The original `xargs` pipelines could run `argocd app sync my-app` without any `--resource` flags when no resources matched, causing a full application sync. I replaced those one-liners with `while read` loops that do nothing on empty input.
- The reusable scripts built command strings and executed them with `eval`, which is fragile and unsafe for shell arguments. I changed them to build Bash arrays and pass `--resource` values as separate arguments.
- The multiple-kind script generated jq code with `sed`, which could break on unexpected input. I replaced it with `jq --arg kinds "$TARGET_KINDS"` and `split(",")`.
- The limitations section said kind-based sync does not respect sync waves. Official docs say sync waves order resources during sync operations, while selective sync skips unselected resources and does not run hooks. I revised the wording to explain that only selected resources are applied, so omitted earlier-wave resources can still affect dependency assumptions.

## Review Notes
The local environment did not have the `argocd` binary installed, so CLI behavior was verified against official Argo CD documentation rather than local `--help` output. Bash snippets were syntax-checked with `bash -n`, and the linked OneUptime follow-up posts exist in the repository.
