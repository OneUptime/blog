# Validation Summary: How to Design an Azure Tagging Strategy for Cost Allocation and Governance

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- Azure Resource Manager tags
- Azure Policy
- Azure Cost Management exports and Cost Analysis
- Azure CLI
- Azure Resource Graph
- Terraform AzureRM provider
- Bicep
- Azure SDK for Python

## Sources Consulted
- Microsoft Learn: Use tags to organize your Azure resources and management hierarchy - https://learn.microsoft.com/en-us/azure/azure-resource-manager/management/tag-resources
- Microsoft Learn: Assign policy definitions for tag compliance - https://learn.microsoft.com/en-us/azure/azure-resource-manager/management/tag-policies
- Microsoft Learn: Azure CLI `az policy assignment create` - https://learn.microsoft.com/en-us/cli/azure/policy/assignment
- Microsoft Learn: Azure CLI `az policy remediation create` - https://learn.microsoft.com/en-us/cli/azure/policy/remediation
- Microsoft Learn: Azure CLI `az costmanagement export create` - https://learn.microsoft.com/en-us/cli/azure/costmanagement/export
- Microsoft Learn: Common cost analysis uses in Cost Management - https://learn.microsoft.com/en-us/azure/cost-management-billing/costs/cost-analysis-common-uses
- Microsoft Learn: Customize views in Cost Analysis - https://learn.microsoft.com/en-us/azure/cost-management-billing/costs/customize-cost-analysis-views
- Microsoft Learn: Azure Resource Graph sample queries for Azure Resource Manager - https://learn.microsoft.com/en-us/azure/azure-resource-manager/management/resource-graph-samples
- Microsoft Learn: Storage account naming rules - https://learn.microsoft.com/en-us/azure/azure-resource-manager/management/resource-name-rules
- Microsoft Learn: Azure SDK for Python `ComputeManagementClient` - https://learn.microsoft.com/en-us/python/api/azure-mgmt-compute/azure.mgmt.compute.computemanagementclient
- Microsoft Learn: Azure SDK for Python `ResourceManagementClient` and tag operations - https://learn.microsoft.com/en-us/python/api/azure-mgmt-resource/azure.mgmt.resource.resourcemanagementclient
- Microsoft Learn: Azure SDK for Python `TagsPatchResource` - https://learn.microsoft.com/en-us/python/api/azure-mgmt-resource/azure.mgmt.resource.resources.models.tagspatchresource
- HashiCorp Terraform Registry: `azurerm_mssql_database` - https://registry.terraform.io/providers/hashicorp/azurerm/latest/docs/resources/mssql_database

## Issues Found
- The Terraform SQL Database example used the legacy `azurerm_sql_database`/`azurerm_sql_server` pattern. Updated it to `azurerm_mssql_database` with `server_id = azurerm_mssql_server.main.id`, matching the current AzureRM provider resource.
- The Bicep storage account name was derived from application and environment values, which could produce an invalid storage account name. Added a `storageAccountName` parameter with length constraints and used it directly.
- The Azure Policy examples used the built-in policy ID for requiring a tag on resource groups while the text described enforcing tags on resources. Updated the examples to use the built-in "Require a tag on resources" policy ID.
- The Cost Management export command used `--schedule-recurrence`, which is not a current `az costmanagement export create` option. Replaced it with `--recurrence Monthly`.
- The Cost Management export comment said the export was grouped by tag. Exports produce data for later analysis; grouping by tags is done in Cost Analysis or downstream tools. Updated the wording.
- The Python VM automation snippet referenced `subscription_id` without defining it. Added an explicit placeholder subscription ID.
- The Python expiration-date snippet referenced an undefined `resource_client` and used `begin_update_by_id` with a generic API version for arbitrary resource types. Added the credential/client setup and changed the tag update to `resource_client.tags.begin_update_at_scope(..., TagsPatchResource(operation="Merge", ...))`.
- The Azure Resource Graph query used `tags !has 'CostCenter'`, which is less precise for checking a missing tag key. Replaced it with `isnull(tags['CostCenter'])`.

## Review Notes
Azure tags are not applied retroactively to cost rollups, and Cost Management has caveats around tag support by resource type and purchase type. The post's high-level guidance remains accurate, but production implementations should also account for services that do not emit tags into cost reports and for cost-management tag inheritance where needed.
