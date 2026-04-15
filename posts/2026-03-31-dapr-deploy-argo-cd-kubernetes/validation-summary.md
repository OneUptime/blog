# Validation Summary: How to Deploy Dapr with Argo CD on Kubernetes

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Dapr (runtime and Helm chart)
- Kubernetes
- Argo CD (GitOps continuous delivery)
- Helm

## Sources Consulted
- Dapr Helm chart index: https://dapr.github.io/helm-charts/index.yaml — confirmed chart `dapr` version 1.14.0 exists, and `dapr-dashboard` is a separate chart
- Dapr Helm chart values.yaml: https://raw.githubusercontent.com/dapr/helm-charts/master/charts/dapr/values.yaml — confirmed `global.ha.enabled` is valid; confirmed `dapr_dashboard` is not present
- Dapr Helm chart Chart.yaml: https://raw.githubusercontent.com/dapr/helm-charts/master/charts/dapr/Chart.yaml — confirmed dashboard is not a subchart dependency
- Argo CD official Helm documentation: https://argo-cd.readthedocs.io/en/stable/user-guide/helm/ — confirmed `source.helm.values` with YAML string block is correct
- Argo CD Application spec documentation — confirmed `apiVersion: argoproj.io/v1alpha1`, `kind: Application`, and all spec fields are valid

## Issues Found
1. **Invalid `dapr_dashboard` Helm values**: The Argo CD Application manifest included `dapr_dashboard.enabled: true` in the Helm values. The Dapr dashboard is a separate Helm chart (`dapr-dashboard`) and is not a subchart or dependency of the main `dapr` chart as of Dapr 1.11+. This value would be silently ignored, meaning the dashboard would not be deployed despite the config suggesting it would be. **Fix**: Removed the `dapr_dashboard.enabled: true` block from the Helm values.

## Review Notes
- Step 2 manually creates the `dapr-system` namespace, but the Argo CD Application in Step 3 includes `CreateNamespace=true` in syncOptions, which would create it automatically. This is redundant but harmless.
- Users who want the Dapr dashboard should deploy it as a separate Argo CD Application using the `dapr-dashboard` chart from the same Helm repository.
- The `targetRevision: 1.14.0` is a valid Dapr version. Users should update this to the latest stable version at the time of deployment.
