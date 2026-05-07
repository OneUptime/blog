# Validation Summary: How to Set Up AKS Private Clusters with OpenTofu

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- OpenTofu
- Azure Kubernetes Service (AKS)
- Azure Private DNS
- Azure CLI
- kubectl
- Azure virtual networking

## Sources Consulted
- Microsoft Learn: Create a private Azure Kubernetes Service (AKS) cluster - https://learn.microsoft.com/en-us/azure/aks/private-clusters
- Microsoft Learn: Supported Kubernetes versions in Azure Kubernetes Service (AKS) - https://learn.microsoft.com/en-us/azure/aks/supported-kubernetes-versions
- Microsoft Learn: Access a private Azure Kubernetes Service (AKS) cluster using the command invoke or Run command feature - https://learn.microsoft.com/en-us/azure/aks/access-private-cluster
- Microsoft Learn: `az aks command` - https://learn.microsoft.com/en-us/cli/azure/aks/command?view=azure-cli-latest
- Microsoft Learn: Install the Azure CLI on Linux - https://learn.microsoft.com/en-us/cli/azure/install-azure-cli-linux?view=azure-cli-lts
- Microsoft Learn: Deploy an Azure Kubernetes Service (AKS) cluster using Azure CLI - https://learn.microsoft.com/en-us/azure/aks/learn/quick-kubernetes-deploy-cli
- Kubernetes documentation: Install and Set Up kubectl on Linux - https://kubernetes.io/docs/tasks/tools/install-kubectl-linux/
- HashiCorp AzureRM provider docs: `azurerm_kubernetes_cluster` - https://registry.terraform.io/providers/hashicorp/azurerm/latest/docs/resources/kubernetes_cluster

## Issues Found
- The post pinned `kubernetes_version = "1.28"`, which is no longer a current supported GA AKS version as of May 7, 2026. I updated it to `1.35`.
- The node pool used `enable_auto_scaling`, which is not the current AzureRM argument name. I changed it to `auto_scaling_enabled`.
- The custom private DNS example used a system-assigned identity and granted DNS permissions only after the AKS cluster resource was created. Current AKS guidance requires a user-assigned identity with `Private DNS Zone Contributor` and `Network Contributor` permissions in place before cluster creation, so I rewrote that example accordingly and added `depends_on`.
- The custom private DNS zone name was built directly from `var.location`, which can produce invalid values such as `West Europe`. I normalized the region string in the DNS zone name expression so it matches the required `privatelink.<region>.azmk8s.io` format.
- The jump-box cloud-init installed `kubectl` from the retired `apt.kubernetes.io` repository. I replaced that with a supported flow: install Azure CLI, then use `az aks install-cli` to install `kubectl` and `kubelogin`.
- The CI/CD section showed an Azure Container Instance runner example that was not sufficiently correct as written for a supported self-hosted runner setup. I removed the inaccurate runner resource and kept the dedicated subnet guidance.
- The deploy section incorrectly implied that `az aks get-credentials` must be run from inside the VNet. The kubeconfig retrieval call goes through Azure control-plane APIs; the machine running `kubectl` is what needs network access to the private endpoint. I corrected that wording.
- The conclusion overstated `az aks command invoke` as a fit for CI/CD pipelines. Microsoft documents it as unsuitable for ongoing programmatic access, so I changed the guidance to position it for one-off troubleshooting or emergency access only.

## Review Notes
- `network_policy = "calico"` with Azure CNI is still valid, but Azure CNI powered by Cilium is the more forward-looking default for many new AKS deployments.
- Hardcoding an AKS minor version in tutorial content will age quickly. Parameterizing `kubernetes_version` would reduce future drift.
