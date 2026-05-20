# Validation Summary: How to Use Helm with ArgoCD Application of Applications Pattern

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Argo CD Applications
- Argo CD App of Apps pattern
- Argo CD ApplicationSet
- Helm charts and Helm templating
- Kubernetes manifests
- kubectl

## Sources Consulted
- Argo CD Declarative Setup: https://argo-cd.readthedocs.io/en/stable/operator-manual/declarative-setup/
- Argo CD Application Specification Reference: https://argo-cd.readthedocs.io/en/stable/user-guide/application-specification/
- Argo CD Helm user guide: https://argo-cd.readthedocs.io/en/latest/user-guide/helm/
- Argo CD Automated Sync Policy: https://argo-cd.readthedocs.io/en/stable/user-guide/auto_sync/
- Argo CD Sync Options: https://argo-cd.readthedocs.io/en/stable/user-guide/sync-options/
- Argo CD Sync Phases and Waves: https://argo-cd.readthedocs.io/en/latest/user-guide/sync-waves/
- Argo CD ApplicationSet Generators: https://argo-cd.readthedocs.io/en/stable/operator-manual/applicationset/Generators/
- Argo CD ApplicationSet Go Template: https://argo-cd.readthedocs.io/en/stable/operator-manual/applicationset/GoTemplate/
- Helm template command reference: https://helm.sh/docs/helm/helm_template/
- Helm template function list: https://helm.sh/docs/chart_template_guide/function_list/

## Issues Found
- The parent Helm template used `{{ $app.prune | default true }}` and `{{ $app.selfHeal | default true }}`. Helm's `default` treats boolean `false` as empty, so users could not disable pruning or self-healing by setting those values to `false`. Changed both fields to use `hasKey` so explicit `false` values are preserved while still defaulting to `true` when omitted.
- The parent Helm template always emitted `helm.valueFiles` whenever `helm` was set, even if an app only supplied Helm parameters. Changed the template to emit `valueFiles` only when `helm.valueFiles` is present.
- The external chart example included `syncWave: -1` in the values example, but the extended chart-source template did not render the sync wave annotation. Added conditional sync wave annotations to that template so the example behaves as described.

## Review Notes
The technical approach is valid: Argo CD supports declarative `Application` resources, cascading delete through `resources-finalizer.argocd.argoproj.io`, Helm chart sources through `repoURL` plus `chart`, Helm values and parameters under `spec.source.helm`, automated sync with `prune` and `selfHeal`, and sync waves through `argocd.argoproj.io/sync-wave`. Local CLI verification with `helm` and `kubectl` was not possible because neither binary is installed in the review environment; command syntax was checked against official documentation instead.
