# Validation Summary: How to Override Helm Values in ArgoCD

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Argo CD
- Helm
- Kubernetes Application manifests
- GitOps deployment workflows
- kube-prometheus-stack Helm chart

## Sources Consulted
- Argo CD Helm user guide: https://argo-cd.readthedocs.io/en/latest/user-guide/helm/
- Argo CD Application Specification Reference: https://argo-cd.readthedocs.io/en/latest/user-guide/application-specification/
- Argo CD `argocd app set` command reference: https://argo-cd.readthedocs.io/en/latest/user-guide/commands/argocd_app_set/
- Argo CD `argocd app unset` command reference: https://argo-cd.readthedocs.io/en/latest/user-guide/commands/argocd_app_unset/
- Argo CD `argocd app get` command reference: https://argo-cd.readthedocs.io/en/stable/user-guide/commands/argocd_app_get/
- Argo CD `argocd app manifests` command reference: https://argo-cd.readthedocs.io/en/release-2.13/user-guide/commands/argocd_app_manifests/
- Argo CD `argocd app diff` command reference: https://argo-cd.readthedocs.io/en/stable/user-guide/commands/argocd_app_diff/
- Helm values files documentation: https://helm.sh/docs/chart_template_guide/values_files/
- kube-prometheus-stack 55.0.0 chart values: https://raw.githubusercontent.com/prometheus-community/helm-charts/kube-prometheus-stack-55.0.0/charts/kube-prometheus-stack/values.yaml

## Issues Found
- The post said ArgoCD supports four primary Helm override methods and omitted `valuesObject`. Added `valuesObject` as the preferred structured inline-values option and updated the method count.
- The inline-values CLI example used `argocd app set --values` with literal YAML. Official Argo CD docs define `--values` as values file paths, so the example now writes a values block to a file and uses `--values-literal-file`.
- The force-string CLI example mixed `-p` and `--helm-set-string` for the same key. Replaced it with the direct `--helm-set-string` usage from the command reference.
- The precedence section omitted `valuesObject`. Updated the diagram, list, explanation, example, and summary to match the official order: `parameters > valuesObject > values > valueFiles > helm repository values.yaml`.
- The third-party chart example used `${GRAFANA_PASSWORD}` inside `source.helm.values`, which Argo CD does not document as an environment-substituted field. Replaced it with a literal placeholder value.
- The removal command for inline values used `argocd app set --values ''`, which targets values files rather than the literal values block. Replaced it with `argocd app unset --values-literal`.

## Review Notes
The local `argocd` CLI was not installed, so CLI syntax was verified against the official Argo CD command reference instead of local `--help` output.
