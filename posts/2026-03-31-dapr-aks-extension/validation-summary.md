# Validation Summary: How to Use Dapr AKS Extension

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Dapr (Distributed Application Runtime)
- Azure Kubernetes Service (AKS)
- Azure CLI (`az k8s-extension`)
- Kubernetes (`kubectl`)
- Azure Monitor diagnostic settings

## Sources Consulted
- Azure CLI `az k8s-extension` reference documentation (https://learn.microsoft.com/en-us/cli/azure/k8s-extension)
- Dapr AKS extension installation guide (https://learn.microsoft.com/en-us/azure/aks/dapr)
- Dapr Helm chart configuration reference (https://docs.dapr.io/operations/hosting/kubernetes/kubernetes-deploy/#helm-chart-customization)
- Dapr Kubernetes annotations reference (https://docs.dapr.io/reference/arguments-annotations-overview/)
- Azure Monitor diagnostic settings CLI reference (https://learn.microsoft.com/en-us/cli/azure/monitor/diagnostic-settings)

## Issues Found

1. **Invalid kubectl command for checking Dapr version**: The command `kubectl get configuration/daprsystem -n dapr-system -o jsonpath='{.status.daprVersion}'` referenced a `.status.daprVersion` field that does not exist on the Dapr Configuration CRD. Replaced with the correct `az k8s-extension show ... --query version` command, which is the proper way to check the installed Dapr version when using the AKS extension.

2. **Removed `dapr_dashboard.enabled=true` configuration setting**: The Dapr dashboard is not part of the main Dapr Helm chart that the AKS extension manages. This setting is not documented as a valid configuration option for the AKS extension and would have no effect or cause an error.

3. **Removed `dapr_placement.replicaCount=3` configuration setting**: This is not a documented parameter for the Dapr Helm chart or AKS extension. When `global.ha.enabled=true` is set (which was already present in the same command), placement is automatically configured with 3 replicas. The setting was both non-standard and redundant.

## Review Notes
- All `az k8s-extension` CLI commands (create, show, list, update, delete) use correct syntax, flags, and parameter values.
- The `--cluster-type managedClusters` value is correct for AKS clusters.
- The `--extension-type Microsoft.Dapr` is the correct extension type identifier.
- Dapr sidecar annotations (`dapr.io/enabled`, `dapr.io/app-id`, `dapr.io/app-port`) are all correct.
- The Kubernetes Deployment YAML for the Dapr application is well-formed and follows best practices.
- The Azure Monitor diagnostic settings command is structurally correct, though users will need to substitute their own subscription ID and workspace path.
- The `--version 1.13.0` in the update section is a valid example version but users should check for the latest available version.
