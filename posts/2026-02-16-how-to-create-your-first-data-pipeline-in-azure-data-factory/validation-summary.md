# Validation Summary: How to Create Your First Data Pipeline in Azure Data Factory

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Azure Data Factory
- Azure Blob Storage
- Azure SQL Database
- ADF linked services, datasets, pipelines, activities, triggers, and integration runtimes
- ADF Copy activity
- ARM templates
- Terraform

## Sources Consulted
- Microsoft Learn: Linked services in Azure Data Factory and Azure Synapse Analytics - https://learn.microsoft.com/en-us/azure/data-factory/concepts-linked-services
- Microsoft Learn: Pipelines and activities in Azure Data Factory and Azure Synapse Analytics - https://learn.microsoft.com/en-us/azure/data-factory/concepts-pipelines-activities
- Microsoft Learn: Copy activity in Azure Data Factory and Azure Synapse Analytics - https://learn.microsoft.com/en-us/azure/data-factory/copy-activity-overview
- Microsoft Learn: Copy and transform data in Azure SQL Database - https://learn.microsoft.com/en-us/azure/data-factory/connector-azure-sql-database
- Microsoft Learn: Create schedule triggers in Azure Data Factory and Azure Synapse Analytics - https://learn.microsoft.com/en-us/azure/data-factory/how-to-create-schedule-trigger
- Microsoft Learn: Microsoft.DataFactory factories/pipelines ARM template reference - https://learn.microsoft.com/en-us/azure/templates/microsoft.datafactory/factories/pipelines

## Issues Found
- The schedule trigger snippet was labeled as JSON but included a JavaScript-style comment, which made it invalid JSON. I moved the description outside the code block.
- The schedule trigger snippet did not show the `pipelines` binding needed to associate the trigger with the pipeline. I added a `pipelineReference` for `pl_copy_blob_to_sql`, matching Microsoft Learn's trigger JSON examples.
- The ARM template snippet was labeled as JSON but included a JavaScript-style comment, which made it invalid JSON. I moved the description outside the code block.
- The ARM template snippet showed only the pipeline resource body while calling it an ARM template. I changed it to a minimal valid ARM deployment template with `$schema`, `contentVersion`, a `factoryName` parameter, `resources`, `apiVersion`, and the correct child-resource name format for `Microsoft.DataFactory/factories/pipelines`.

## Review Notes
Microsoft Learn now presents Microsoft Fabric Data Factory as the next generation of Azure Data Factory for new data integration workloads. The ADF guidance in this post remains technically valid for Azure Data Factory, but a future update could mention Fabric as a related option.
