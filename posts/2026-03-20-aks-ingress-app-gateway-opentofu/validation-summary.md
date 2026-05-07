# Validation Summary: How to Configure AKS Ingress with Application Gateway Using OpenTofu

## Status
validated

## Post Type
Guide

## Technologies Covered
- OpenTofu
- Azure Kubernetes Service (AKS)
- Azure Application Gateway
- Application Gateway Ingress Controller (AGIC)
- Azure CLI
- Kubernetes Ingress
- TLS
- Azure RBAC

## Sources Consulted
- Microsoft Learn: What is Application Gateway Ingress Controller? https://learn.microsoft.com/en-us/azure/application-gateway/ingress-controller-overview
- Microsoft Learn: Tutorial: Enable ingress controller add-on for existing AKS cluster with existing Azure application gateway https://learn.microsoft.com/en-us/azure/application-gateway/tutorial-ingress-controller-add-on-existing
- Microsoft Learn: Tutorial: Enable the ingress controller add-on for a new AKS cluster with a new Azure application gateway https://learn.microsoft.com/en-us/azure/application-gateway/tutorial-ingress-controller-add-on-new
- Microsoft Learn: Application Gateway Ingress Controller annotations https://learn.microsoft.com/en-us/azure/application-gateway/ingress-controller-annotations
- Microsoft Learn: Supported Kubernetes versions in Azure Kubernetes Service (AKS) https://learn.microsoft.com/en-us/azure/aks/supported-kubernetes-versions
- Microsoft Learn: Azure CLI `az aks get-credentials` reference https://learn.microsoft.com/en-us/cli/azure/aks?view=azure-cli-latest#az-aks-get-credentials
- Microsoft Learn: Azure CLI `az network application-gateway show-backend-health` reference https://learn.microsoft.com/en-us/cli/azure/network/application-gateway?view=azure-cli-latest#az-network-application-gateway-show-backend-health
- Terraform Registry: `azurerm_kubernetes_cluster` https://registry.terraform.io/providers/hashicorp/azurerm/latest/docs/resources/kubernetes_cluster
- Terraform Registry: `azurerm_application_gateway` https://registry.terraform.io/providers/hashicorp/azurerm/latest/docs/resources/application_gateway

## Issues Found
- The introduction overstated AGIC capabilities by implying built-in certificate auto-renewal and Azure AD authentication integration. I changed this to documented AGIC behavior: L7 routing, TLS termination, and WAF through Kubernetes Ingress resources.
- The introduction implied the add-on always creates and manages the Application Gateway lifecycle automatically. I corrected this to reflect that `gateway_id` attaches AGIC to an existing Application Gateway, while AKS manages the add-on deployment itself.
- The post omitted a key AGIC behavior: by default, AGIC assumes full ownership of the linked Application Gateway and overwrites configuration not defined by Kubernetes resources. I added that warning to the introduction.
- The OpenTofu example hardcoded `kubernetes_version = "1.28"`, which is no longer a supported AKS version as of 2026-05-07. I removed the hardcoded version so the example does not instruct readers to deploy an out-of-support cluster version.
- The RBAC example granted only `Contributor` on the Application Gateway resource. I updated it to grant the AGIC managed identity `Reader` and `Network Contributor` on the Application Gateway resource group, which aligns with Microsoft’s add-on guidance for existing Application Gateway scenarios.
- The TLS comment suggested `spec.tls.secretName` and `appgw.ingress.kubernetes.io/appgw-ssl-certificate` could be used interchangeably in the same Ingress. I clarified that the annotation should be used instead of `spec.tls`, because Microsoft documents that the annotation is ignored when both are present.
- The conclusion claimed configuration changes propagate within 30-60 seconds. I replaced that with documented continuous reconciliation wording because the official docs do not guarantee that timing.
- The WAF policy annotation example was normalized to the documented resource ID format and quoted as a YAML string.

## Review Notes
- Microsoft Learn now recommends considering Application Gateway for Containers for new Kubernetes ingress deployments, but AGIC remains documented and the corrected post is still technically valid.
- The tutorial’s manual WAF_v2 Application Gateway creation is appropriate because Microsoft documents that add-on-created gateways default to Standard_v2 unless you create a WAF_v2 gateway first and attach the add-on to it.
- Local `az` and `tofu` binaries were not available in this workspace, so CLI verification was done against Microsoft Learn command reference pages rather than local `--help` output.
