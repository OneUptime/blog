# Validation Summary: How to Move Azure Resources Between Resource Groups and Subscriptions

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Azure Resource Manager
- Azure CLI
- Azure resource groups
- Azure subscriptions
- Azure resource provider registration
- Azure RBAC
- App Service
- Azure SQL Database
- Azure Virtual Machines

## Sources Consulted
- Microsoft Learn: Azure CLI `az resource` command reference - https://learn.microsoft.com/en-us/cli/azure/resource
- Microsoft Learn: Move Azure resources to a new resource group or subscription - https://learn.microsoft.com/en-us/azure/azure-resource-manager/management/move-resource-group-and-subscription
- Microsoft Learn: Resources - Validate Move Resources REST API - https://learn.microsoft.com/en-us/rest/api/resources/resources/validate-move-resources
- Microsoft Learn: Azure resource types for move operations - https://learn.microsoft.com/en-us/azure/azure-resource-manager/management/move-support-resources
- Microsoft Learn: Move App Service resources to a new resource group or subscription - https://learn.microsoft.com/en-us/azure/azure-resource-manager/management/move-limitations/app-service-move-limitations
- Microsoft Learn: Move a Recovery Services vault across Azure subscriptions and resource groups - https://learn.microsoft.com/en-us/azure/backup/backup-azure-move-recovery-services-vault
- Microsoft Learn: Azure resource move fails because hidden resources are not included in the move - https://learn.microsoft.com/en-us/troubleshoot/azure/virtual-machines/windows/move-resources-incomplete-request-hidden-resources

## Issues Found
- The post claimed `az resource move` had a `--validate` flag, but the official Azure CLI reference only lists `--destination-group`, `--ids`, and optional `--destination-subscription-id`. Removed the incorrect validate-only example and clarified that `az resource move` validates as part of the actual move.
- The full Bash script was described as validating the move but did not call the validation API. Added a `validateMoveResources` step before the move command and removed the `eval` command construction.
- The post said resources stay running throughout the move without qualification. Updated this to note that resources generally keep running while the source and destination resource groups are locked for write and delete operations during the move.
- The "Resources That Cannot Be Moved" list overstated Backup vault and classic deployment model limitations. Updated it to reflect that support depends on vault configuration, backup item types, and the specific classic resource type.
- The VM dependency list was incomplete. Updated it to mention that validation may require related public IP addresses, network security groups, virtual networks, and storage accounts.
- The App Service dependency section omitted documented cross-subscription requirements. Added the requirement that all App Service resources in the source resource group move together and that the destination resource group must not already contain App Service resources.
- The post-move RBAC checklist incorrectly said resource-level role assignments stay with the resource. Updated it to state that active role assignments on moved resources do not move and must be recreated.

## Review Notes
Azure CLI was not installed in the local environment, so command validation was performed against the official Azure CLI documentation rather than local `az --help` output.
