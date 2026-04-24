# Validation Summary: How to Configure Azure Container Registry with Rancher

## Status
validated

## Post Type
Guide

## Technologies Covered
- Azure Container Registry (ACR)
- Azure Kubernetes Service (AKS)
- Azure CLI
- Microsoft Entra service principals
- Azure managed identities
- Kubernetes and `kubectl`
- Rancher Fleet

## Sources Consulted
- Microsoft Learn: Authenticate with Azure Container Registry (ACR) from Azure Kubernetes Service (AKS) - https://learn.microsoft.com/en-us/azure/aks/cluster-container-registry-integration
- Microsoft Learn: Scenarios to authenticate with Azure Container Registry from Kubernetes - https://learn.microsoft.com/en-us/azure/container-registry/authenticate-kubernetes-options
- Microsoft Learn: Pull images from an Azure container registry to a Kubernetes cluster using a pull secret - https://learn.microsoft.com/en-us/azure/container-registry/container-registry-auth-kubernetes
- Microsoft Learn: Authenticate with Azure Container Registry - https://learn.microsoft.com/en-us/azure/container-registry/container-registry-authentication
- Microsoft Learn: Geo-replication in Azure Container Registry - https://learn.microsoft.com/en-us/azure/container-registry/container-registry-geo-replication
- Microsoft Learn: `az acr` CLI reference - https://learn.microsoft.com/en-us/cli/azure/acr?view=azure-cli-latest
- Microsoft Learn: `az acr credential` CLI reference - https://learn.microsoft.com/en-us/cli/azure/acr/credential?view=azure-cli-latest
- Microsoft Learn: `az acr task` CLI reference - https://learn.microsoft.com/en-us/cli/azure/acr/task?view=azure-cli-lts
- Microsoft Learn: `az ad sp` CLI reference - https://learn.microsoft.com/en-us/cli/azure/ad/sp?view=azure-cli-latest
- Microsoft Learn: `az monitor metrics` CLI reference - https://learn.microsoft.com/en-us/cli/azure/monitor/metrics?view=azure-cli-lts
- Kubernetes docs: `kubectl create secret docker-registry` - https://kubernetes.io/docs/reference/kubectl/generated/kubectl_create/kubectl_create_secret_docker-registry/
- Fleet docs: `fleet.yaml` reference - https://fleet.rancher.io/reference/ref-fleet-yaml

## Issues Found
- The ACR name was written as `myContainerRegistry` in Azure CLI examples. Azure Container Registry names must be lowercase, so I updated the commands to use `mycontainerregistry`.
- The post created the registry with `--sku Standard` but later used geo-replication. Geo-replication requires the Premium SKU, so I changed the registry creation example to `--sku Premium` and clarified the requirement in the geo-replication step.
- The ACR Tasks example used `--branch main`, which is not part of the current `az acr task create` syntax. I changed the GitHub context to `https://github.com/myorg/my-app.git#main`, which is the supported way to target a branch.
- The Fleet section labeled a plain values file as Fleet configuration. I rewrote that step to describe the YAML as example Helm chart values passed through Fleet, which matches Fleet's documented `helm.values` and `valuesFiles` model.
- The AKS attachment comment said the command "automatically configures managed identity." I corrected that wording to reflect what the command actually does: it grants `AcrPull` to the kubelet managed identity.

## Review Notes
- `az aks update --attach-acr` is valid for the post's default RBAC registry flow, but Microsoft documents that it is not supported for ABAC-enabled ACR registries.
- The Fleet `image.repository`, `image.tag`, and `pullSecrets` keys are example Helm chart values. Exact key names can vary by chart.
- The troubleshooting command `az acr login` is valid, but it assumes Docker is installed and running on the machine where the command is executed.
