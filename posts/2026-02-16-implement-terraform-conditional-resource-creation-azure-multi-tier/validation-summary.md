# Validation Summary: Use Terraform Conditional Resource Creation for Azure Multi-Tier Architectures

## Status
validated

## Post Type
Tutorial / implementation guide

## Technologies Covered
- Terraform configuration language
- Terraform `count`, `for_each`, `dynamic` blocks, locals, tfvars, and lifecycle meta-arguments
- AzureRM Terraform provider
- Azure Firewall
- Azure SQL Database
- Azure Virtual Network subnets and Network Security Groups
- Azure Application Gateway and Web Application Firewall
- Azure Cache for Redis

## Sources Consulted
- Terraform `count` meta-argument documentation: https://developer.hashicorp.com/terraform/language/meta-arguments/count
- Terraform `for_each` meta-argument documentation: https://developer.hashicorp.com/terraform/language/meta-arguments/for_each
- Terraform `lifecycle` meta-argument documentation: https://developer.hashicorp.com/terraform/language/meta-arguments/lifecycle
- AzureRM `azurerm_firewall_network_rule_collection` documentation: https://registry.terraform.io/providers/hashicorp/azurerm/latest/docs/resources/firewall_network_rule_collection
- AzureRM `azurerm_mssql_database` documentation: https://registry.terraform.io/providers/hashicorp/azurerm/latest/docs/resources/mssql_database
- AzureRM `azurerm_application_gateway` documentation: https://registry.terraform.io/providers/hashicorp/azurerm/latest/docs/resources/application_gateway
- AzureRM `azurerm_redis_cache` documentation: https://registry.terraform.io/providers/hashicorp/azurerm/latest/docs/resources/redis_cache
- Azure Application Gateway infrastructure documentation: https://learn.microsoft.com/azure/application-gateway/configuration-infrastructure
- Azure Application Gateway public IP documentation: https://learn.microsoft.com/azure/virtual-network/ip-services/configure-public-ip-application-gateway

## Issues Found
- The firewall subnet comment said the subnet was required even when the firewall was not deployed, but the example creates it only when `local.deploy_firewall` is true. Updated the comment to match the code.
- The SQL database environment map used a `geo_redundant_backup` field that was not consumed by the resource. Replaced it with `backup_storage_type` and wired it to the current AzureRM `storage_account_type` argument.
- The Application Gateway example referenced `azurerm_public_ip.app_gateway[0]` without defining that public IP. Added a conditional Standard, Static public IP resource for the gateway.
- The Application Gateway was placed in the `web` tier subnet. Azure requires a dedicated subnet for Application Gateway, so the networking example now creates an `app_gateway` subnet for staging and production and the gateway uses that subnet.
- The NSG loop attached an empty NSG to every subnet, which would be problematic for the dedicated Application Gateway subnet unless listener and platform traffic rules were added. Updated the loop to create NSGs only for application tier subnets.
- The Redis example used the older `enable_non_ssl_port` argument. Updated it to the current AzureRM `non_ssl_port_enabled` argument.
- The Redis public network access expression used `local.is_development`, but Redis is only created for staging and production in the post. Changed it to `local.is_staging` so staging remains reachable without an omitted private endpoint while production disables public access.

## Review Notes
- Terraform was not installed in this workspace, so I could not run `terraform fmt` or `terraform validate`. The snippets were reviewed manually against current Terraform language documentation and AzureRM provider documentation.
- The examples are still partial snippets and reference surrounding resources and variables that are not fully defined in the post, such as resource groups, VNets, SQL servers, and certificate variables. That is acceptable for a focused conditional-resource tutorial, but readers need those base resources in a complete configuration.
