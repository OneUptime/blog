# Validation Summary: How to Troubleshoot ImagePullBackOff Errors When Pulling from ACR in AKS

## Status
validated

## Post Type
Troubleshooting guide

## Technologies Covered
- Azure Kubernetes Service (AKS)
- Azure Container Registry (ACR)
- Kubernetes pods, image pulls, imagePullSecrets, and node selectors
- Azure CLI
- Azure Monitor and Log Analytics

## Sources Consulted
- Kubernetes Images documentation: https://kubernetes.io/docs/concepts/containers/images/
- Kubernetes kubectl create secret docker-registry reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_create/kubectl_create_secret_docker-registry/
- Kubernetes node labels reference: https://kubernetes.io/docs/reference/node/node-labels/
- Azure AKS and ACR integration documentation: https://learn.microsoft.com/en-us/azure/aks/cluster-container-registry-integration
- Azure Architecture Center AKS container registry connectivity triage: https://learn.microsoft.com/en-us/azure/architecture/operator-guides/aks/aks-triage-container-registry
- Azure CLI az aks reference: https://learn.microsoft.com/en-us/cli/azure/aks
- Azure CLI az acr repository reference: https://learn.microsoft.com/en-us/cli/azure/acr/repository
- Azure CLI az acr manifest reference: https://learn.microsoft.com/en-us/cli/azure/acr/manifest
- Azure Container Registry SKU features and limits: https://learn.microsoft.com/en-us/azure/container-registry/container-registry-skus
- Azure Container Registry service endpoint network rules: https://learn.microsoft.com/en-us/azure/container-registry/container-registry-vnet
- Azure Monitor ContainerRegistryRepositoryEvents reference: https://learn.microsoft.com/en-us/azure/azure-monitor/reference/tables/containerregistryrepositoryevents
- Azure Monitor supported logs for ACR: https://learn.microsoft.com/en-us/azure/azure-monitor/reference/supported-logs/microsoft-containerregistry-registries-logs
- Azure CLI az monitor log-analytics reference: https://learn.microsoft.com/en-us/cli/azure/monitor/log-analytics
- Azure CLI az ad sp credential reference: https://learn.microsoft.com/en-us/cli/azure/ad/sp/credential

## Issues Found
- Replaced the deprecated or unavailable `az acr repository show-manifests` example with `az acr repository show-tags` and a JMESPath filter for checking a specific tag. The current Azure CLI repository command reference lists `show-tags`, while manifest inspection is under the newer `az acr manifest` group.
- Changed the image pull secret creation example from `--namespace default` to `--namespace <namespace>` because Kubernetes image pull secrets must exist in the same namespace as the pod that references them.
- Expanded the private DNS expected IP comment to include the `192.168.x.x` private range and the narrower `172.16.x.x-172.31.x.x` private range.
- Changed the platform mismatch wording from a definite `manifest unknown` error to a `no matching manifest` style error, which better matches common container runtime behavior for OS or architecture mismatches.
- Removed outdated exact ACR read operation limits from the throttling section. The current ACR SKU documentation describes throttling, concurrency, and throughput as SKU-dependent and no longer presents those exact values in the main SKU table.
- Replaced an Azure Activity Log command with a Log Analytics query against `ContainerRegistryRepositoryEvents`. Image pulls are repository/data-plane events when diagnostic repository logs are enabled, not ordinary Azure Activity Log control-plane operations.

## Review Notes
The post is technically relevant and the remaining AKS-ACR integration, `az aks check-acr`, `az aks update --attach-acr`, network rule, image pull secret, node selector, and service principal credential commands align with current official documentation. The `az acr manifest` command group is still documented as preview, so future revisions may need to revisit manifest-inspection examples if Azure CLI changes that surface again.
