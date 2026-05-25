# Validation Summary: How to Create Azure Management Groups in Terraform

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Terraform
- HashiCorp AzureRM provider
- Azure Management Groups
- Azure Policy
- Azure RBAC
- Azure Cost Management budgets
- Azure Landing Zone governance patterns

## Sources Consulted
- HashiCorp Terraform Registry: `azurerm_management_group` resource, https://registry.terraform.io/providers/hashicorp/azurerm/latest/docs/resources/management_group
- HashiCorp Terraform Registry: `azurerm_management_group` data source, https://registry.terraform.io/providers/hashicorp/azurerm/latest/docs/data-sources/management_group
- HashiCorp Terraform Registry: `azurerm_management_group_subscription_association` resource, https://registry.terraform.io/providers/hashicorp/azurerm/latest/docs/resources/management_group_subscription_association
- Microsoft Learn: Organize your resources with Azure management groups, https://learn.microsoft.com/en-us/azure/governance/management-groups/overview
- Microsoft Learn: Quickstart - New policy assignment with Terraform, https://learn.microsoft.com/en-ie/azure/governance/policy/assign-policy-terraform
- Microsoft Learn: Tutorial - Create and manage budgets, https://learn.microsoft.com/en-us/azure/cost-management-billing/costs/tutorial-acm-create-budgets
- Microsoft Learn: Request disallowed by policy error, https://learn.microsoft.com/en-us/azure/azure-resource-manager/troubleshooting/error-policy-requestdisallowedbypolicy
- Microsoft Learn: Tutorial - Build policies to enforce compliance, https://learn.microsoft.com/en-us/azure/governance/policy/tutorials/create-and-manage
- AzAdvertizer Azure Policy reference: Require a tag on resource groups, https://www.azadvertizer.net/azpolicyadvertizer/96670d01-0a4d-4649-9c89-2d3abc0a5025.html
- AzAdvertizer Azure Policy reference: Network interfaces should not have public IPs, https://www.azadvertizer.net/azpolicyadvertizer/83a86a26-fd1f-447c-b59d-e51f44264114.html

## Issues Found
- The provider example pinned AzureRM `~> 3.80`, while current AzureRM 4.x documentation requires an explicit subscription ID for plan/apply. Updated the provider constraint to `~> 4.0` and added `subscription_id = var.subscription_id`.
- The root management group lookup used `display_name = "Tenant Root Group"`. Microsoft documents the default display name as `Tenant root group`, and display names can be changed. Updated the example to read `azurerm_client_config.current.tenant_id` and look up the root management group by `name`, because the root management group ID is the Microsoft Entra tenant ID.
- The public IP policy assignment comment said it disabled public IP creation in the connectivity subscription, but the assignment was scoped to the Production management group. Updated the scope to `azurerm_management_group.connectivity.id`.
- The same policy ID is for "Network interfaces should not have public IPs", not a blanket deny on all public IP resources. Updated the comment to say it denies network interfaces with public IPs in Connectivity.
- Several placeholder subscription IDs in the dynamic hierarchy example contained non-hex characters such as `g`, `h`, and `k`, so they were not valid UUID-shaped examples. Replaced them with valid UUID-shaped placeholder values.

## Review Notes
- The examples still assume supporting variables such as `var.subscription_id`, subscription IDs, and principal IDs are defined elsewhere, which is normal for a focused blog snippet.
- AzureRM provider 4.x can also receive the subscription ID through `ARM_SUBSCRIPTION_ID`; the post now shows the explicit provider argument for clarity.
- Management group hierarchy depth, root group inheritance, RBAC inheritance, and management group budget support were checked against Microsoft documentation and are technically accurate.
