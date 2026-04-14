# Validation Summary: How to Install Dapr on Azure Kubernetes Service (AKS)

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Dapr (distributed application runtime)
- Azure Kubernetes Service (AKS)
- Azure CLI (`az`)
- Helm 3
- Dapr CLI
- Azure Key Vault (secret store component)
- AKS Workload Identity / OIDC
- Azure Monitor (Container Insights)

## Sources Consulted
- [Dapr CLI install script](https://raw.githubusercontent.com/dapr/cli/master/install/install.sh) - verified the install URL resolves correctly
- [Dapr Kubernetes deployment docs](https://docs.dapr.io/operations/hosting/kubernetes/kubernetes-deploy/) - verified Helm repo URL, HA values, and install commands
- [Dapr Helm chart values.yaml (root)](https://github.com/dapr/dapr/blob/master/charts/dapr/values.yaml) - verified `global.ha.enabled` and `global.ha.replicaCount` defaults
- [Dapr Helm chart values.yaml (placement)](https://github.com/dapr/dapr/blob/master/charts/dapr/charts/dapr_placement/values.yaml) - confirmed `dapr_placement.replicaCount` is not a valid value
- [Dapr Azure Key Vault secret store docs](https://docs.dapr.io/reference/components-reference/supported-secret-stores/azure-keyvault/) - verified component type and metadata field names
- [Azure CLI `az aks enable-addons` docs](https://learn.microsoft.com/en-us/cli/azure/aks?view=azure-cli-latest) - verified `--workspace-resource-id` format

## Issues Found

1. **Invalid Helm value `dapr_placement.replicaCount=3`**: The Dapr Helm chart does not expose a `dapr_placement.replicaCount` value. The HA replica count is controlled by `global.ha.replicaCount`, which defaults to 3 when `global.ha.enabled=true`. Removed the incorrect `--set dapr_placement.replicaCount=3` line from the Helm install command since enabling HA already provides 3 replicas by default.

2. **Incomplete ARM resource ID format for `--workspace-resource-id`**: The original placeholder `/subscriptions/.../workspaces/my-workspace` omitted the `resourceGroups` and `providers/Microsoft.OperationalInsights` path segments, which could mislead readers about the required format. Replaced with the full ARM resource ID template: `/subscriptions/<subscription-id>/resourceGroups/<resource-group>/providers/Microsoft.OperationalInsights/workspaces/<workspace-name>`.

## Review Notes
- The post description mentions "Dapr CLI or Helm" installation but only demonstrates the Helm method. This is not technically incorrect but could be expanded in a future update to also show `dapr init -k` for simpler dev setups.
- The Azure Key Vault component example shows `azureClientId` for authentication, which works but the post could mention that workload identity (covered in a later section) is the preferred authentication method for AKS, eliminating the need for explicit client IDs.
- The Dapr CLI install script URL still uses the `master` branch, which resolves correctly as of validation date.
