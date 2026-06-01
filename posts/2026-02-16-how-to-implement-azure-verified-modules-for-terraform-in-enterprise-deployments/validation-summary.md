# Validation Summary: How to Implement Azure Verified Modules for Terraform in Enterprise Deployments

## Status
validated

## Post Type
Tutorial / implementation guide

## Technologies Covered
- Azure Verified Modules
- Terraform
- AzureRM and AzAPI Terraform providers
- Azure Virtual Network
- Azure Kubernetes Service
- Azure Container Registry
- Azure Log Analytics
- HashiCorp Sentinel
- Terraform state and import commands

## Sources Consulted
- Azure Verified Modules introduction: https://azure.github.io/Azure-Verified-Modules/overview/introduction/
- Azure Verified Modules Terraform resource module specifications: https://azure.github.io/Azure-Verified-Modules/specs/tf/res/
- Terraform Registry, AVM Virtual Network module: https://registry.terraform.io/modules/Azure/avm-res-network-virtualnetwork/azurerm
- Terraform Registry, AVM Container Registry module: https://registry.terraform.io/modules/Azure/avm-res-containerregistry-registry/azurerm
- Terraform Registry, AVM AKS managed cluster module: https://registry.terraform.io/modules/Azure/avm-res-containerservice-managedcluster/azurerm
- Terraform Registry, AVM Log Analytics workspace module: https://registry.terraform.io/modules/Azure/avm-res-operationalinsights-workspace/azurerm
- AVM module source repositories under https://github.com/Azure/
- AKS supported Kubernetes versions: https://learn.microsoft.com/en-us/azure/aks/supported-kubernetes-versions
- HashiCorp Sentinel tfconfig/v2 import: https://developer.hashicorp.com/terraform/cloud-docs/workspaces/policy-enforcement/import-reference/tfconfig-v2
- HashiCorp Sentinel strings import: https://developer.hashicorp.com/sentinel/docs/imports/strings
- Terraform state mv command: https://developer.hashicorp.com/terraform/cli/commands/state/mv

## Issues Found
- The post overstated AVM security defaults and uniform interfaces. Updated the wording to say AVM modules align with specifications and expose security/governance controls, and that common interface patterns apply where a module supports the capability.
- The generic AVM source placeholder was incomplete. Updated it from `Azure/avm-res-<type>/azurerm` to the registry naming pattern `Azure/avm-res-<provider>-<resource>/azurerm`.
- The wrapper module used `var.tags` without declaring a `tags` variable. Added a `tags` variable with a default empty map.
- The Azure Container Registry AVM `georeplications` input was shown as a map, but the module expects a list of objects. Updated the example to use list syntax.
- The AKS example used Kubernetes `1.28`, which is outside AKS support as of the review date. Updated the example to `1.35`, which is supported on June 1, 2026.
- The Sentinel policy used `tfplan/v2` for module source checks, but module calls and source strings are exposed through `tfconfig/v2`. Updated the policy to import `tfconfig/v2` and use `strings.has_prefix`.
- The local testing section referenced `examples/basic` and `go test`; the checked AVM VNet repository exposes `examples/default`, and the shown Go test workflow was not valid for that repository. Updated the commands to use `examples/default` with Terraform.
- The migration example used `terraform state mv` from `azurerm_virtual_network` and `azurerm_subnet` resources into AVM VNet resource addresses that do not exist. The AVM VNet module uses `azapi_resource` addresses, and Terraform state moves require the same resource type. Updated the migration guidance to remove old state bindings and import existing Azure resources into the correct AVM AzAPI resource addresses.

## Review Notes
- The AKS version example uses a supported minor alias. In production, teams should verify available patch versions in their target Azure region before deployment.
- The Sentinel example now enforces AVM sources for Terraform module calls. Organizations using approved private wrapper modules would need to add their private registry prefixes to the allowlist.
