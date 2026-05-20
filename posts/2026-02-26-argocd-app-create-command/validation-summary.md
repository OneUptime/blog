# Validation Summary: How to Use argocd app create with All Options

## Status
validated

## Post Type
Reference guide

## Technologies Covered
- Argo CD
- Argo CD CLI
- GitOps
- Kubernetes
- Helm
- Kustomize

## Sources Consulted
- Argo CD `argocd app create` command reference: https://argo-cd.readthedocs.io/en/stable/user-guide/commands/argocd_app_create/
- Argo CD `argocd app get` command reference: https://argo-cd.readthedocs.io/en/stable/user-guide/commands/argocd_app_get/
- Argo CD Application specification reference: https://argo-cd.readthedocs.io/en/stable/user-guide/application-specification/
- Argo CD Helm user guide: https://argo-cd.readthedocs.io/en/latest/user-guide/helm/

## Issues Found
- The Helm example used `--helm-version 3`, but Argo CD documents Helm versions as `v2` or `v3`. Changed the example to `--helm-version v3`.
- The Dry Run section used `argocd app create --dry-run -o yaml`, but the current `argocd app create` command reference does not include `--dry-run` or output flags. Replaced those examples with `argocd app get my-app -o yaml` for inspecting an already-created application as YAML, and updated the summary to remove the unsupported `--dry-run -o yaml` recommendation.

## Review Notes
The article intentionally covers important `argocd app create` options rather than every available CLI flag. Current Argo CD also supports additional flags such as annotations, Jsonnet, plugin, multi-source, hydration, and advanced Helm/Kustomize options that are not covered here.
