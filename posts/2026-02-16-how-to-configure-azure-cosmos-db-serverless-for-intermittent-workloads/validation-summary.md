# Validation Summary: How to Configure Azure Cosmos DB Serverless for Intermittent Workloads

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Azure Cosmos DB
- Azure Cosmos DB serverless
- Azure CLI
- ARM templates
- Azure Monitor metrics
- Azure Functions
- C# / .NET SDK for Azure Cosmos DB

## Sources Consulted
- Microsoft Learn: Azure Cosmos DB serverless account type - https://learn.microsoft.com/en-us/azure/cosmos-db/serverless
- Microsoft Learn: How to choose between provisioned throughput and serverless - https://learn.microsoft.com/en-us/azure/cosmos-db/throughput-serverless
- Microsoft Learn: Azure Cosmos DB serverless account performance - https://learn.microsoft.com/en-us/azure/cosmos-db/serverless-performance
- Microsoft Learn: Azure Cosmos DB service quotas and default limits - https://learn.microsoft.com/en-us/azure/cosmos-db/concepts-limits
- Microsoft Learn: Manage Azure Cosmos DB resources using Azure CLI - https://learn.microsoft.com/en-us/azure/cosmos-db/manage-with-cli
- Microsoft Learn: Azure CLI `az cosmosdb` reference - https://learn.microsoft.com/en-us/cli/azure/cosmosdb
- Microsoft Learn: Azure CLI `az monitor metrics` reference - https://learn.microsoft.com/en-us/cli/azure/monitor/metrics
- Microsoft Learn: Azure Cosmos DB .NET SDK quickstart - https://learn.microsoft.com/en-us/azure/cosmos-db/quickstart-dotnet
- Microsoft Learn: `QueryDefinition.WithParameter` API reference - https://learn.microsoft.com/en-us/dotnet/api/microsoft.azure.cosmos.querydefinition.withparameter
- Microsoft Learn: Azure Cosmos DB output binding for Azure Functions - https://learn.microsoft.com/en-us/azure/azure-functions/functions-bindings-cosmosdb-v2-output
- Microsoft Learn: Plan and manage costs for Azure Cosmos DB - https://learn.microsoft.com/en-us/azure/cosmos-db/plan-manage-costs
- Microsoft Learn: Migrate an Azure Cosmos DB account from periodic to continuous backup mode - https://learn.microsoft.com/en-us/azure/cosmos-db/migrate-continuous-backup

## Issues Found
- The post stated that serverless containers have a 1 TB storage limit. Microsoft currently documents unlimited maximum storage per serverless container, with a 20 GB limit per logical partition. Updated the comparison table and limitations section.
- The post described serverless throughput as a flat 5,000 RU/s burst ceiling. Microsoft documents 5,000 RU/s as the starting container throughput and the maximum per physical partition, with total container throughput depending on physical partition count. Updated throughput descriptions and throttling guidance.
- The post listed the serverless SLA as 99.9%. Current Microsoft documentation describes serverless high availability as aligned with single-region writes with availability zones in designated regions, while provisioned multi-region accounts can provide the 99.999% multi-region SLA. Updated the comparison and guidance to avoid the inaccurate fixed SLA value.
- Azure Cosmos DB account names in CLI and ARM examples used uppercase letters, but Azure Cosmos DB account names must be lowercase. Updated example account names to lowercase.
- The Azure CLI account creation examples omitted the failover priority and zone redundancy fields shown in current Microsoft CLI samples. Added `failoverPriority=0 isZoneRedundant=False` to the `--locations` values.
- The C# query example used `@customerId` in a SQL string without binding the parameter. Replaced the raw query string with a `QueryDefinition` and `.WithParameter(...)`.
- The Azure Monitor command used the older/singular metric option. Updated it to the current `--metricnames` option from the Azure CLI reference.
- The limitations section said continuous backup is unsupported for serverless. Current Microsoft documentation supports point-in-time restore scenarios and documents migration to continuous backup for supported APIs. Replaced that limitation with the accurate point that serverless containers do not support provisioned throughput controls.
- The Azure Functions section said both the Function and database scale to zero and only cost money while processing requests. Updated it to clarify that Azure Cosmos DB serverless has no provisioned RU/s charge when idle, but stored data is still billed.

## Review Notes
The Azure CLI was not installed in the local workspace, so command validation was performed against Microsoft Learn CLI references instead of local `az --help`. Pricing examples remain approximate and region-dependent; Microsoft recommends checking the Azure pricing page for current regional prices.
