# Validation Summary: How to Create Azure Custom Roles in Terraform

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Terraform
- HashiCorp AzureRM provider
- Azure RBAC custom roles
- Azure role definitions and role assignments
- Azure VM, Storage Blob, AKS, Key Vault, Network Watcher, and Cost Management permissions

## Sources Consulted
- HashiCorp Terraform Registry: `azurerm_role_definition` resource - https://registry.terraform.io/providers/hashicorp/azurerm/latest/docs/resources/role_definition
- Microsoft Learn: Azure custom roles - https://learn.microsoft.com/en-us/azure/role-based-access-control/custom-roles
- Microsoft Learn: Understand Azure role definitions - https://learn.microsoft.com/en-us/azure/role-based-access-control/role-definitions
- Microsoft Learn: Azure permissions for Compute - https://learn.microsoft.com/en-us/azure/role-based-access-control/permissions/compute
- Microsoft Learn: Azure permissions for Storage - https://learn.microsoft.com/en-us/azure/role-based-access-control/permissions/storage
- Microsoft Learn: Azure permissions for Containers - https://learn.microsoft.com/en-us/azure/role-based-access-control/permissions/containers
- Microsoft Learn: Azure permissions for Security - https://learn.microsoft.com/en-us/azure/role-based-access-control/permissions/security
- Microsoft Learn: Azure permissions for Networking - https://learn.microsoft.com/en-us/azure/role-based-access-control/permissions/networking
- Microsoft Learn: Azure permissions for Management and governance - https://learn.microsoft.com/en-us/azure/role-based-access-control/permissions/management-and-governance
- HashiCorp Terraform Registry: AzureRM 4.0 upgrade guide - https://registry.terraform.io/providers/hashicorp/azurerm/latest/docs/guides/4.0-upgrade-guide

## Issues Found
- The AKS section implied that the Azure role alone is enough to deploy to Kubernetes. Updated the wording to clarify that the role grants Azure access to fetch credentials, while Kubernetes permissions inside the cluster must be granted separately.
- The AKS example used `not_actions` as an "explicit deny" for admin credentials. Azure `NotActions` are exclusions from the role's allowed actions, not deny rules, and the role did not grant the admin credential action in the first place. Replaced the block with an empty `not_actions` list.
- The Key Vault example used `not_data_actions` as explicit denies for keys and certificates. Azure `NotDataActions` are not deny rules, and the role only grants secret data actions. Replaced the block with an empty `not_data_actions` list.
- The Network Troubleshooter example described `queryConnectionMonitors/action` as viewing NSG flow logs. Updated the comment to describe querying connection monitors and adjusted the role description to "check flow log status."
- The best-practices section described `not_actions` only as carving out exceptions. Expanded it to clarify that `not_actions` and `not_data_actions` subtract permissions from the current role definition and do not override permissions granted by other role assignments.

## Review Notes
- The post pins AzureRM to `~> 3.80`, which is valid for the shown configuration. AzureRM 4.x is current and requires an explicit subscription ID in the provider block or `ARM_SUBSCRIPTION_ID`; a future refresh could update the examples to 4.x.
- Terraform was not installed in the local environment, so I could not run `terraform validate`. The HCL was reviewed against the AzureRM provider schema and Azure RBAC operation documentation.
