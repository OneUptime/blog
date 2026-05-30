# Validation Summary: How to Trace End-to-End Data Lineage in Microsoft Purview

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- Microsoft Purview
- Microsoft Purview Data Map REST API
- Apache Atlas API
- Azure Data Factory
- Azure Synapse Analytics
- Azure SQL Database
- Power BI
- Azure CLI
- Python requests

## Sources Consulted
- Microsoft Learn: Connect Azure Data Factory to Microsoft Purview: https://learn.microsoft.com/en-us/purview/data-map-lineage-azure-data-factory
- Microsoft Learn: Metadata and lineage from Azure Synapse Analytics into Microsoft Purview: https://learn.microsoft.com/en-us/azure/purview/how-to-lineage-azure-synapse-analytics
- Microsoft Learn: Discover and govern Azure SQL Database in Microsoft Purview: https://learn.microsoft.com/en-us/purview/register-scan-azure-sql-database
- Microsoft Learn: Metadata and lineage from Power BI into Microsoft Purview: https://learn.microsoft.com/purview/how-to-lineage-powerbi
- Microsoft Learn: Discovery - Query REST API: https://learn.microsoft.com/en-us/rest/api/purview/datamapdataplane/discovery/query?view=rest-purview-datamapdataplane-2023-09-01
- Microsoft Learn: Lineage - Get REST API: https://learn.microsoft.com/en-us/rest/api/purview/datamapdataplane/lineage/get?view=rest-purview-datamapdataplane-2023-09-01
- Microsoft Learn: Entity - Create Or Update REST API: https://learn.microsoft.com/en-us/rest/api/purview/datamapdataplane/entity/create-or-update?view=rest-purview-datamapdataplane-2023-09-01
- Microsoft Learn: Create and get lineage relationships using the REST API: https://learn.microsoft.com/en-us/purview/create-relationships
- Microsoft Learn: az resource command reference: https://learn.microsoft.com/en-us/cli/azure/resource?view=azure-cli-latest
- Microsoft Learn: Microsoft.DataFactory/factories ARM template reference: https://learn.microsoft.com/en-us/azure/templates/microsoft.datafactory/factories

## Issues Found
- The post overstated ADF and Synapse Data Flow lineage details, implying transformation-level lineage for joins, aggregations, filters, and derived columns. Updated the wording to source/sink lineage and column-level lineage only where supported by the connector and lineage pattern.
- The Azure SQL Database section claimed function lineage support. Updated it to state that views and stored procedures are supported when configured, while function and trigger lineage isn't supported by the Azure SQL Database lineage extraction scan.
- The Synapse section implied dedicated and serverless SQL pools push lineage when queries create new tables or views. Updated it to describe supported Synapse pipeline runtime lineage and registration/scanning of Synapse workspace SQL assets.
- The REST API examples used older preview API versions and the obsolete `/catalog/api` path. Updated them to `/datamap/api` with `api-version=2023-09-01`.
- The custom lineage example used a single-entity payload with `relationshipAttributes` and unique attributes for process inputs/outputs. Updated it to use a bulk entity payload with existing asset GUIDs for inputs and outputs, matching Microsoft Purview custom lineage guidance.
- The column-level custom lineage example attached `columnMapping` to a `Process` entity. Updated it to create a `direct_lineage_dataset_dataset` relationship with the `columnMapping` attribute.
- The post claimed lineage answers who last modified a pipeline. Updated this to ownership/contact discovery through catalog metadata, which is what Purview exposes for this workflow.
- The root cause analysis and best practices text was adjusted to avoid implying unsupported transformation-level lineage and to distinguish linking from registering/scanning.

## Review Notes
The Azure CLI command shape and ARM property path are consistent with the Azure CLI generic resource update documentation and the Data Factory ARM schema, but the local environment did not have the `az` CLI installed, so the command was verified against official documentation rather than executed.
