# Validation Summary: How to Deploy Azure Virtual Desktop Host Pools with Session Hosts in Terraform

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Azure Virtual Desktop
- Terraform
- HashiCorp AzureRM provider
- HashiCorp AzureAD provider
- Azure virtual machines
- Microsoft Entra ID
- Azure RBAC
- Azure networking

## Sources Consulted
- HashiCorp Terraform Registry: azurerm_virtual_desktop_host_pool - https://registry.terraform.io/providers/hashicorp/azurerm/latest/docs/resources/virtual_desktop_host_pool
- HashiCorp Terraform Registry: azurerm_virtual_desktop_application - https://registry.terraform.io/providers/hashicorp/azurerm/latest/docs/resources/virtual_desktop_application
- HashiCorp Terraform Registry: azurerm_virtual_desktop_scaling_plan - https://registry.terraform.io/providers/hashicorp/azurerm/3.77.0/docs/resources/virtual_desktop_scaling_plan
- HashiCorp Terraform Registry: azuread_service_principal data source - https://registry.terraform.io/providers/hashicorp/azuread/2.0.0/docs/data-sources/service_principal
- Microsoft Learn: Configure Azure Virtual Desktop session hosts using Terraform - https://learn.microsoft.com/en-us/azure/developer/terraform/azurerm/create-avd-session-host
- Microsoft Learn: Prerequisites for Azure Virtual Desktop - https://learn.microsoft.com/en-us/azure/virtual-desktop/prerequisites
- Microsoft Learn: Required FQDNs and endpoints for Azure Virtual Desktop - https://learn.microsoft.com/en-us/azure/virtual-desktop/required-fqdn-endpoint
- Microsoft Learn: Preferred application group type behavior for pooled host pools - https://learn.microsoft.com/en-us/azure/virtual-desktop/preferred-application-group-type
- Microsoft Learn: Publish applications with RemoteApp in Azure Virtual Desktop - https://learn.microsoft.com/en-us/azure/virtual-desktop/manage-app-groups
- Microsoft Learn: Built-in Azure RBAC roles for Azure Virtual Desktop - https://learn.microsoft.com/en-us/azure/virtual-desktop/rbac
- Microsoft Learn: Assign Azure RBAC roles or Microsoft Entra roles to Azure Virtual Desktop service principals - https://learn.microsoft.com/en-us/azure/virtual-desktop/service-principal-assign-roles
- Microsoft Learn: Create and assign an autoscale scaling plan for Azure Virtual Desktop - https://learn.microsoft.com/en-us/azure/virtual-desktop/autoscale-new-existing-host-pool
- Microsoft Learn: Configure Start VM on Connect - https://learn.microsoft.com/en-us/azure/virtual-desktop/start-virtual-machine-connect

## Issues Found
- The DSC extension placed the AVD registration token in public `settings`. Moved `registrationInfoToken` to `protected_settings`, matching Microsoft Terraform guidance for host pool registration and avoiding exposure of the token in plain extension settings.
- The DSC extension publisher was written as `Microsoft.PowerShell`. Changed it to `Microsoft.Powershell`, matching the publisher value used in Microsoft Learn's Terraform example.
- The Windows 11 Enterprise multi-session VM did not set `license_type`. Added `license_type = "Windows_Client"` so the session host VM has the Windows client license type expected for Azure Virtual Desktop Windows client images.
- The access snippet referenced `var.desktop_users_group_id` and `var.app_users_group_id` without declaring them. Added variable declarations for both Microsoft Entra ID group object IDs.
- The scaling plan omitted the required `ramp_down_stop_hosts_when` argument. Added `ramp_down_stop_hosts_when = "ZeroSessions"` to make the scaling plan resource valid for the AzureRM provider schema.
- The post enabled Start VM on Connect and configured autoscale but omitted the required Azure Virtual Desktop service principal RBAC assignment. Added a lookup for the Azure Virtual Desktop service principal application ID and assigned `Desktop Virtualization Power On Off Contributor` at subscription scope before creating the scaling plan.

## Review Notes
The post still uses AzureRM `~> 3.80` and AzureAD `~> 2.47`. Those versions are internally consistent with the snippets reviewed, but a future refresh should consider testing the examples against the latest major provider versions and updating any changed provider arguments.
