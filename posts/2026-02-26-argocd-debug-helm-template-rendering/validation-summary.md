# Validation Summary: How to Debug Helm Template Rendering Issues in ArgoCD

## Status
validated

## Post Type
Guide

## Technologies Covered
- Argo CD
- Helm
- Kubernetes
- GitOps
- YAML

## Sources Consulted
- Argo CD Helm user guide: https://argo-cd.readthedocs.io/en/release-3.2/user-guide/helm/
- Argo CD Application specification reference: https://argo-cd.readthedocs.io/en/release-3.0/user-guide/application-specification/
- Argo CD `argocd app get` command reference: https://argo-cd.readthedocs.io/en/stable/user-guide/commands/argocd_app_get/
- Argo CD `argocd app manifests` command reference: https://argo-cd.readthedocs.io/en/release-2.9/user-guide/commands/argocd_app_manifests/
- Argo CD `argocd app diff` command reference: https://argo-cd.readthedocs.io/en/stable/user-guide/commands/argocd_app_diff/
- Argo CD `argocd repo add` command reference: https://argo-cd.readthedocs.io/en/stable/user-guide/commands/argocd_repo_add/
- Helm template command reference: https://helm.sh/docs/helm/helm_template/
- Helm lint command reference: https://helm.sh/docs/helm/helm_lint/
- Helm dependency update command reference: https://helm.sh/docs/helm/helm_dependency_update/
- Helm debugging templates guide: https://helm.sh/docs/chart_template_guide/debugging/

## Issues Found
- The missing-values example used `default` after dereferencing `.Values.image.repository`, which can still fail when `.Values.image` is absent. Changed it to default the parent map to `dict` before reading `repository` and `tag`.
- The YAML indentation error example showed `indent 4` while saying the indentation was wrong. Changed the bad example to `indent 2` so the example matches the explanation.
- The type mismatch section said Helm parameter values are always strings. Adjusted it to explain that Argo CD stores parameter values as strings in the Application spec, but passes them to Helm like `--set` by default, where Helm can coerce numeric and boolean-looking values unless `forceString: true` is used.
- The cache refresh section described `argocd app get --refresh` as deleting the app from cache. Changed the description to match the documented behavior: refreshing application data without clearing the target manifests cache.

## Review Notes
The post is technically relevant and the reviewed commands and options are current in the consulted official documentation. `helm` and `argocd` CLIs were not installed in the local environment, so command verification was performed against official command references rather than local `--help` output.
