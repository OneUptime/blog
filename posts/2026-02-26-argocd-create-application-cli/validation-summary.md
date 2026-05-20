# Validation Summary: How to Create an ArgoCD Application Using the CLI

## Status
validated

## Post Type
Tutorial / CLI guide

## Technologies Covered
- Argo CD CLI
- Argo CD Applications
- GitOps
- Kubernetes
- Helm
- Kustomize
- Bash scripting
- jq

## Sources Consulted
- Argo CD `argocd app create` command reference: https://argo-cd.readthedocs.io/en/stable/user-guide/commands/argocd_app_create/
- Argo CD `argocd app sync` command reference: https://argo-cd.readthedocs.io/en/stable/user-guide/commands/argocd_app_sync/
- Argo CD `argocd app wait` command reference: https://argo-cd.readthedocs.io/en/stable/user-guide/commands/argocd_app_wait/
- Argo CD `argocd app get` command reference: https://argo-cd.readthedocs.io/en/stable/user-guide/commands/argocd_app_get/
- Argo CD `argocd app set` command reference: https://argo-cd.readthedocs.io/en/stable/user-guide/commands/argocd_app_set/
- Argo CD `argocd app list` command reference: https://argo-cd.readthedocs.io/en/stable/user-guide/commands/argocd_app_list/
- Argo CD `argocd app diff` command reference: https://argo-cd.readthedocs.io/en/stable/user-guide/commands/argocd_app_diff/
- Argo CD `argocd app history` command reference: https://argo-cd.readthedocs.io/en/stable/user-guide/commands/argocd_app_history/
- Argo CD `argocd app rollback` command reference: https://argo-cd.readthedocs.io/en/stable/user-guide/commands/argocd_app_rollback/
- Argo CD `argocd app delete` command reference: https://argo-cd.readthedocs.io/en/stable/user-guide/commands/argocd_app_delete/
- Argo CD `argocd login` command reference: https://argo-cd.readthedocs.io/en/stable/user-guide/commands/argocd_login/
- Argo CD CLI source for `argocd app list` JSON output handling: https://github.com/argoproj/argo-cd/blob/master/cmd/argocd/commands/app.go
- Linked OneUptime YAML article: https://oneuptime.com/blog/post/2026-02-26-argocd-application-declarative-yaml/view
- Linked OneUptime UI article: https://oneuptime.com/blog/post/2026-02-26-argocd-create-application-ui/view

## Issues Found
- The `argocd app list -o json` jq example used `.items[]`, but the Argo CD CLI passes `apps.Items` to its resource-list printer, so the JSON output is a top-level array. Changed the example to use `.[]`.

## Review Notes
The local `argocd` binary was not installed in the review environment, so validation used current official Argo CD command references and Argo CD CLI source code. The command flags shown in the post are current in the stable Argo CD documentation.
