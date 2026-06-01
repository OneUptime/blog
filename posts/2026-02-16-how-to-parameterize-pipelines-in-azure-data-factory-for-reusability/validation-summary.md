# Validation Summary: How to Parameterize Pipelines in Azure Data Factory for Reusability

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Azure Data Factory
- ADF pipeline parameters
- ADF dataset parameters
- ADF linked service parameters
- ADF global parameters
- ADF expression language
- ADF Lookup, ForEach, Execute Pipeline, If Condition, and Fail activities
- SQL Server datasets
- Azure Data Lake Storage Gen2 Parquet datasets

## Sources Consulted
- Microsoft Learn: Use parameters, expressions, and functions in Azure Data Factory - https://learn.microsoft.com/en-us/azure/data-factory/how-to-expression-language-functions
- Microsoft Learn: Pipeline parameters and variables in Azure Data Factory and Azure Synapse Analytics - https://learn.microsoft.com/en-us/azure/data-factory/concepts-parameters-variables
- Microsoft Learn: Global parameters in Azure Data Factory - https://learn.microsoft.com/en-us/azure/data-factory/author-global-parameters
- Microsoft Learn: Parameterize linked services in Azure Data Factory and Azure Synapse Analytics - https://learn.microsoft.com/en-us/azure/data-factory/parameterize-linked-services
- Microsoft Learn: Parameterizing mapping data flows - https://learn.microsoft.com/en-us/azure/data-factory/parameters-data-flow
- Microsoft Learn: Copy and transform data to and from SQL Server - https://learn.microsoft.com/en-us/azure/data-factory/connector-sql-server
- Microsoft Learn: Parquet format in Azure Data Factory and Azure Synapse - https://learn.microsoft.com/en-us/azure/data-factory/format-parquet
- Microsoft Learn: Copy and transform data in Azure Data Lake Storage Gen2 - https://learn.microsoft.com/en-us/azure/data-factory/connector-azure-data-lake-storage
- Microsoft Learn: Lookup activity in Azure Data Factory and Azure Synapse Analytics - https://learn.microsoft.com/en-us/azure/data-factory/control-flow-lookup-activity
- Microsoft Learn: ForEach activity in Azure Data Factory and Azure Synapse Analytics - https://learn.microsoft.com/en-us/azure/data-factory/control-flow-for-each-activity
- Microsoft Learn: Execute Pipeline activity in Azure Data Factory and Azure Synapse Analytics - https://learn.microsoft.com/en-us/azure/data-factory/control-flow-execute-pipeline-activity
- Microsoft Learn: If Condition activity in Azure Data Factory and Azure Synapse Analytics - https://learn.microsoft.com/en-us/azure/data-factory/control-flow-if-condition-activity
- Microsoft Learn: Execute a Fail activity in Azure Data Factory and Synapse Analytics - https://learn.microsoft.com/en-us/azure/data-factory/control-flow-fail-activity

## Issues Found
- Several ADF JSON examples were labeled as JSON but included `//` comments, which are not valid JSON. Removed those inline comments so the snippets parse as JSON.
- The SQL Server dataset example used the `tableName` dataset type property. Microsoft documentation says `tableName` is supported for backward compatibility and recommends `schema` and `table` for new workloads. Updated the example to parameterize `schema` and `table` instead.
- The post listed system variables under "Types of Parameters in ADF." System variables are built-in runtime values, not parameters. Updated the wording to cover "parameterization and dynamic values" and added data flow parameters separately.
- The fail-fast best practice said If Condition activities can validate parameters and fail with a clear message. If Condition controls branching; the Fail activity is what intentionally stops a pipeline with an error message and code. Updated the recommendation to mention using a Fail activity.

## Review Notes
- The linked service example uses an inline password placeholder for readability. For production, Azure Key Vault or another secure secret pattern should be used.
- The dataset parameter example splits `sourceTableName` on `.` and assumes a two-part `schema.table` value such as `dbo.Customers`.
