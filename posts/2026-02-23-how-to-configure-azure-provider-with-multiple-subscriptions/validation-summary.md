# Validation Summary: How to Configure Azure Provider with Multiple Subscriptions

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Terraform
- HashiCorp AzureRM provider
- Azure subscriptions
- Azure provider aliases
- Terraform modules and provider passing
- Azure virtual network peering
- Azure DNS
- Azure Key Vault
- Azure SQL
- Azure CLI and Azure RBAC

## Sources Consulted
- HashiCorp Terraform provider block reference: https://developer.hashicorp.com/terraform/language/block/provider
- HashiCorp Terraform provider meta-argument reference: https://developer.hashicorp.com/terraform/language/meta-arguments/provider
- HashiCorp Terraform providers meta-argument reference: https://developer.hashicorp.com/terraform/language/meta-arguments/providers
- HashiCorp Terraform providers within modules: https://developer.hashicorp.com/terraform/language/modules/develop/providers
- HashiCorp support note on count/for_each in provider configurations: https://support.hashicorp.com/hc/en-us/articles/6304194229267-Using-count-or-for-each-in-Provider-Configuration
- Terraform Registry AzureRM provider documentation: https://registry.terraform.io/providers/hashicorp/azurerm/latest/docs
- Terraform Registry azurerm_virtual_network_peering resource documentation: https://registry.terraform.io/providers/hashicorp/azurerm/latest/docs/resources/virtual_network_peering
- Terraform Registry azurerm_linux_web_app resource documentation: https://registry.terraform.io/providers/hashicorp/azurerm/latest/docs/resources/linux_web_app
- Terraform Registry azurerm_service_plan resource documentation: https://registry.terraform.io/providers/hashicorp/azurerm/latest/docs/resources/service_plan
- Terraform Registry azurerm_dns_cname_record resource documentation: https://registry.terraform.io/providers/hashicorp/azurerm/latest/docs/resources/dns_cname_record
- Terraform Registry azurerm_mssql_server resource documentation: https://registry.terraform.io/providers/hashicorp/azurerm/latest/docs/resources/mssql_server
- Microsoft Learn Azure CLI role assignment documentation: https://learn.microsoft.com/en-us/cli/azure/role/assignment?view=azure-cli-latest

## Issues Found
- The hub-and-spoke networking example referenced `azurerm_resource_group.app` but did not define it in that example. Added an `azurerm_resource_group` resource for the spoke subscription so the VNet and peering resources have a valid resource group dependency.
- The module example referenced `azurerm_service_plan.plan.id` but did not define the service plan. Added an `azurerm_service_plan` resource with Linux OS type and a valid SKU so the `azurerm_linux_web_app` example has the required `service_plan_id` dependency.

## Review Notes
Terraform was not installed in the local environment, so I could not run `terraform validate`. The HCL syntax and arguments were reviewed manually against the official Terraform language documentation, Terraform Registry AzureRM provider documentation, and Microsoft Azure CLI documentation. The Azure CLI role assignment examples are syntactically valid; for automation, Microsoft also documents `--assignee-object-id` with `--assignee-principal-type ServicePrincipal` as a more explicit service-principal assignment pattern.
