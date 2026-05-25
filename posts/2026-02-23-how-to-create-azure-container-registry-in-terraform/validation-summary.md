# Validation Summary: How to Create Azure Container Registry in Terraform

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Terraform
- HashiCorp AzureRM provider
- Azure Container Registry
- Azure Private Link and Private DNS
- Azure role-based access control
- ACR Tasks
- ACR webhooks
- Microsoft Defender for Containers

## Sources Consulted
- HashiCorp AzureRM `azurerm_container_registry` resource documentation: https://registry.terraform.io/providers/hashicorp/azurerm/latest/docs/resources/container_registry
- HashiCorp AzureRM `azurerm_container_registry_task` resource documentation: https://registry.terraform.io/providers/hashicorp/azurerm/latest/docs/resources/container_registry_task
- HashiCorp AzureRM `azurerm_container_registry_webhook` resource documentation: https://registry.terraform.io/providers/hashicorp/azurerm/latest/docs/resources/container_registry_webhook
- HashiCorp AzureRM `azurerm_container_registry_scope_map` resource documentation: https://registry.terraform.io/providers/hashicorp/azurerm/latest/docs/resources/container_registry_scope_map
- HashiCorp AzureRM `azurerm_container_registry_token` resource documentation: https://registry.terraform.io/providers/hashicorp/azurerm/latest/docs/resources/container_registry_token
- HashiCorp AzureRM `azurerm_subnet` resource documentation: https://registry.terraform.io/providers/hashicorp/azurerm/latest/docs/resources/subnet
- Microsoft Learn, Azure Container Registry service tiers: https://learn.microsoft.com/en-us/azure/container-registry/container-registry-skus
- Microsoft Learn, Azure Container Registry Private Link: https://learn.microsoft.com/en-us/azure/container-registry/container-registry-private-link
- Microsoft Learn, Docker Content Trust in Azure Container Registry: https://learn.microsoft.com/en-us/azure/container-registry/container-registry-content-trust
- Microsoft Learn, Microsoft Defender for Containers vulnerability assessment: https://learn.microsoft.com/en-us/azure/defender-for-cloud/defender-for-containers-vulnerability-assessment-azure
- Microsoft Learn, ACR token-based repository permissions: https://learn.microsoft.com/en-us/azure/container-registry/container-registry-token-based-repository-permissions

## Issues Found
- The provider was pinned to AzureRM `~> 3.0` while the examples used AzureRM 4.x-style ACR policy arguments such as `retention_policy_in_days`. Updated the provider constraint to `~> 4.0`.
- The subnet example used the older private endpoint network policy argument. Updated it to `private_endpoint_network_policies = "Disabled"` for the current AzureRM provider.
- The ACR Task `source_trigger` block omitted the required `source_type` field. Added `source_type = "Github"`.
- Multiple `georeplications` blocks were not in the provider-documented alphabetical order by `location`. Reordered them to avoid Terraform diffs or validation errors.
- The post described ACR as handling vulnerability scanning directly. Updated the wording to say ACR integrates with Microsoft Defender for Containers for vulnerability assessment.
- The post recommended Docker Content Trust without noting Microsoft's retirement timeline. Updated the SKU, production example, best-practices, and summary wording to avoid recommending DCT for new signing workflows.
- The private endpoint section implied that creating a private endpoint alone restricts all registry access to the VNet. Clarified that disabling public network access or restrictive network rules are also needed when the private endpoint should be the only path.

## Review Notes
Terraform was not installed in the review environment, so `terraform validate` could not be run locally. The snippets were reviewed against the current official AzureRM provider documentation and Microsoft Learn documentation. Docker Content Trust is still documented for Premium ACR but Microsoft states it cannot be enabled on new registries or registries that did not previously enable it starting May 31, 2026, and will be removed on March 31, 2028.
