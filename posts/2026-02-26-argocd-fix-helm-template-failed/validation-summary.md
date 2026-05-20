# Validation Summary: How to Fix 'helm template failed' Error in ArgoCD

## Status
validated

## Post Type
Troubleshooting guide

## Technologies Covered
- Argo CD
- Helm
- Kubernetes
- GitOps
- YAML
- Argo CD CLI
- kubectl

## Sources Consulted
- Argo CD Helm user guide: https://argo-cd.readthedocs.io/en/latest/user-guide/helm/
- Argo CD multiple sources documentation: https://argo-cd.readthedocs.io/en/stable/user-guide/multiple_sources/
- Argo CD high availability/repo-server timeout documentation: https://argo-cd.readthedocs.io/en/stable/operator-manual/high_availability/
- Argo CD CLI command reference for `argocd app get`: https://argo-cd.readthedocs.io/en/stable/user-guide/commands/argocd_app_get/
- Argo CD CLI command reference for `argocd app diff`: https://argo-cd.readthedocs.io/en/stable/user-guide/commands/argocd_app_diff/
- Argo CD CLI command reference for `argocd app manifests`: https://argo-cd.readthedocs.io/en/release-2.13/user-guide/commands/argocd_app_manifests/
- Helm template debugging guide: https://helm.sh/docs/chart_template_guide/debugging/
- Helm template function list: https://helm.sh/docs/chart_template_guide/function_list/
- Helm dependency command documentation: https://helm.sh/docs/helm/helm_dependency/
- Helm dependency update documentation: https://helm.sh/docs/helm/helm_dependency_update/
- Argo CD source code for Helm dependency build behavior: https://github.com/argoproj/argo-cd

## Issues Found
- The missing-values example used `{{ .Values.image.tag | default "latest" }}`, which can still fail when the parent `image` map is missing. Changed it to default the parent map before reading nested keys.
- The Helm version section implied that setting `apiVersion: v2` in `Chart.yaml` specifies the Helm version Argo CD should use. Argo CD documents Helm version selection with `spec.source.helm.version` and assumes Helm v3 by default unless v2 is explicitly configured. Updated the snippet and explanation.
- The dependency section said Git-sourced charts must commit the `charts/` directory. Current Argo CD can run `helm dependency build` after Helm reports missing dependencies, provided dependency repositories are reachable and permitted. Updated the guidance to cover both accessible dependency repositories and vendored dependencies.
- The template-function example claimed `toRawJson` was added in Helm 3.12. Helm 3.11 and 3.12 both use Sprig 3.2.3, where `toRawJson` is available. Replaced the example with `toYamlPretty`, which is present in current Helm documentation but not older Helm 3 releases.

## Review Notes
The remaining commands and configuration snippets align with current Argo CD and Helm documentation. The post could later mention `ignoreMissingValueFiles` and full Helm value precedence, but those are enhancements rather than correctness fixes.
