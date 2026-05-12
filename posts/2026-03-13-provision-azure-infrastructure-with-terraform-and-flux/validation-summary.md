# Validation Summary: How to Provision Azure Infrastructure with Terraform and Flux

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Flux CD (Kustomize toolkit)
- Tofu Controller (flux-iac / formerly Weaveworks tf-controller)
- Terraform
- HashiCorp AzureRM provider
- Azure Resource Manager (Resource Groups, Virtual Networks, Subnets)
- Azure Kubernetes Service (AKS)
- Azure SQL Database
- Azure Storage (azurerm Terraform backend)
- Kubernetes Secrets
- kubectl / flux CLIs

## Sources Consulted
- Tofu Controller documentation and CRD reference: https://flux-iac.github.io/tofu-controller/
- Tofu Controller `Terraform` v1alpha2 API: https://github.com/flux-iac/tofu-controller/blob/main/docs/References/terraform.md
- HashiCorp AzureRM provider authentication (env vars `ARM_CLIENT_ID`, `ARM_CLIENT_SECRET`, `ARM_SUBSCRIPTION_ID`, `ARM_TENANT_ID`): https://registry.terraform.io/providers/hashicorp/azurerm/latest/docs/guides/service_principal_client_secret
- Terraform `azurerm` backend reference: https://developer.hashicorp.com/terraform/language/settings/backends/azurerm
- AKS `azurerm_kubernetes_cluster` resource: https://registry.terraform.io/providers/hashicorp/azurerm/latest/docs/resources/kubernetes_cluster
- Azure SQL `azurerm_mssql_database` (vCore SKU names like `GP_Gen5_4`): https://registry.terraform.io/providers/hashicorp/azurerm/latest/docs/resources/mssql_database
- Azure VM size catalog (Dsv5-series): https://learn.microsoft.com/azure/virtual-machines/dv5-dsv5-series
- Flux Kustomize toolkit `kustomization.kustomize.toolkit.fluxcd.io/v1`: https://fluxcd.io/flux/components/kustomize/kustomizations/
- AKS Workload Identity / OIDC issuer: https://learn.microsoft.com/azure/aks/workload-identity-overview

## Issues Found
No technical issues found.

## Review Notes
- Kubernetes `1.29.2` is shown for AKS. By the post's publication date (March 2026), 1.29 has reached the end of community support on AKS (around mid-2025) and is in long-term/extended support only. The example still works, but readers should consider 1.30+ for new clusters. Not changed because the value is illustrative and remains a valid string the AKS API will accept under LTS.
- `approvePlan: "manual"` is a placeholder-style value. The Tofu Controller treats any value other than `auto`, `disable`, or a specific plan revision as "manual approval required", so this is functionally correct, just not the canonical empty/unset form. Left as-is to keep the author's documentation intent clear.
- `value: '["10.0.0.0/16"]'` for `vnet_address_space` passes a JSON-encoded string. The Tofu Controller's `vars.value` accepts `apiextensionsv1.JSON`, so a native YAML list (e.g. `value: ["10.0.0.0/16"]`) would also be valid. Both forms can work depending on how the consuming Terraform module declares the variable; left untouched as a stylistic choice.
- `dependsOn: - name: tofu-controller` assumes a sibling Flux Kustomization named `tofu-controller` exists in the same `flux-system` namespace; that is implied but worth flagging for readers replicating the setup.
