# Validation Summary: How to Use argocd app manifests to Inspect Generated Manifests

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Argo CD CLI
- GitOps
- Kubernetes manifests
- Helm
- Kustomize
- YAML
- GitHub Actions
- kubeconform
- kubeval
- Conftest / Open Policy Agent
- kubesec
- Trivy
- jq and yq

## Sources Consulted
- Argo CD official command reference for `argocd app manifests`: https://argo-cd.readthedocs.io/en/stable/user-guide/commands/argocd_app_manifests/
- Argo CD official command reference for `argocd app list`: https://argo-cd.readthedocs.io/en/stable/user-guide/commands/argocd_app_list/
- Argo CD official command reference for `argocd app get`: https://argo-cd.readthedocs.io/en/stable/user-guide/commands/argocd_app_get/
- Argo CD official command reference for `argocd app diff`: https://argo-cd.readthedocs.io/en/stable/user-guide/commands/argocd_app_diff/
- kubeconform official usage documentation: https://kubeconform.mandragor.org/docs/usage/
- Conftest official documentation: https://www.conftest.dev/
- Trivy official `config` command reference: https://trivy.dev/v0.39/docs/references/cli/trivy_config/

## Issues Found
- The source manifest examples used `argocd app manifests my-app --source` and `argocd app manifests "$APP_NAME" --source` without a value. The official Argo CD CLI reference defines `--source` as a string option whose value must be one of `live` or `git`, with `git` as the default. Updated both examples to use `--source git`.

## Review Notes
- `argocd app manifests` supports `--revision` for single-source applications and newer multi-source flags such as `--revisions`, `--source-names`, and `--source-positions`. The post's single-source examples are valid.
- For direct desired-versus-live comparisons, `argocd app diff` is the purpose-built Argo CD command, but the manifest export approach shown in the post is still technically valid for inspection.
