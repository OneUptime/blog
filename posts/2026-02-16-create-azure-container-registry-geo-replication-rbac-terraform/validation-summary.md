# Validation Summary: How to Create Azure Container Registry with Geo-Replication and RBAC

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Azure Container Registry
- AzureRM Terraform provider
- Terraform HCL
- Azure geo-replication
- Azure RBAC and Microsoft Entra ID
- ACR scope maps and tokens
- Azure Private Link and Private DNS

## Sources Consulted
- AzureRM Terraform provider documentation for `azurerm_container_registry`: https://github.com/hashicorp/terraform-provider-azurerm/blob/v4.74.0/website/docs/r/container_registry.html.markdown
- AzureRM Terraform provider documentation for `azurerm_container_registry_scope_map`: https://github.com/hashicorp/terraform-provider-azurerm/blob/v4.74.0/website/docs/r/container_registry_scope_map.html.markdown
- AzureRM Terraform provider documentation for `azurerm_container_registry_token`: https://github.com/hashicorp/terraform-provider-azurerm/blob/v4.74.0/website/docs/r/container_registry_token.html.markdown
- AzureRM Terraform provider documentation for `azurerm_container_registry_token_password`: https://github.com/hashicorp/terraform-provider-azurerm/blob/v4.74.0/website/docs/r/container_registry_token_password.html.markdown
- AzureRM Terraform provider documentation for `azurerm_role_assignment`: https://github.com/hashicorp/terraform-provider-azurerm/blob/v4.74.0/website/docs/r/role_assignment.html.markdown
- Azure Container Registry geo-replication documentation: https://learn.microsoft.com/en-us/azure/container-registry/container-registry-geo-replication
- Azure Container Registry Docker Content Trust documentation: https://learn.microsoft.com/en-us/azure/container-registry/container-registry-content-trust
- Azure Container Registry Microsoft Entra permissions and role assignments overview: https://learn.microsoft.com/en-us/azure/container-registry/container-registry-rbac-built-in-roles-overview
- Azure Container Registry token-based repository permissions documentation: https://learn.microsoft.com/en-us/azure/container-registry/container-registry-token-based-repository-permissions
- Azure Container Registry Private Link documentation: https://learn.microsoft.com/en-us/azure/container-registry/container-registry-private-link
- Azure Container Registry zone redundancy documentation: https://learn.microsoft.com/en-us/azure/container-registry/zone-redundancy-replica

## Issues Found
- The post used AzureRM provider `~> 3.80` with registry arguments that do not match that provider version. Updated the example to current AzureRM `~> 4.74` and changed the retention policy syntax to `retention_policy_in_days`.
- The post enabled Docker Content Trust for a new registry. Microsoft documentation states that Docker Content Trust cannot be enabled on new registries after May 31, 2026, so the example now leaves `trust_policy_enabled` disabled and uses `AcrPush` for OCI-referrer signing workflows instead of `AcrImageSigner`.
- The post used a non-existent `azurerm_container_registry_geo_replication` resource. Replaced it with the supported `georeplications` blocks and a Terraform `dynamic "georeplications"` example inside `azurerm_container_registry`.
- The output referenced the non-existent geo-replication resource. Updated it to return `keys(var.replication_locations)` for the dynamic example.
- The network example re-declared `azurerm_container_registry.main` and used an ellipsis inside HCL. Changed the snippet to show `network_rule_set` as a block to add inside the existing registry resource.
- The private endpoint DNS example created a private DNS zone but did not link it to a virtual network. Added `azurerm_private_dns_zone_virtual_network_link` and the required variable.
- The scope map section created a token but no token password, so the token would not be usable for authentication. Added `azurerm_container_registry_token_password`.
- The post described quarantine as image scanning. Adjusted the wording to describe quarantine as a validation workflow, since scanning is handled by separate tooling/services.
- Updated "Azure AD" wording to "Microsoft Entra ID" to match current Microsoft terminology.

## Review Notes
- Terraform was not installed in the local environment, so I could not run `terraform validate`. The snippets were checked against the official AzureRM provider documentation and Microsoft Learn documentation instead.
- Scope maps and tokens provide non-Microsoft Entra token-based repository permissions. For Microsoft Entra identities, Azure now documents ABAC-based repository permissions as the repository-scoped access model.
