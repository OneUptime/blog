# Validation Summary: How to Enable Autoscale Throughput in Azure Cosmos DB

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Azure Cosmos DB for NoSQL
- Azure Cosmos DB autoscale throughput
- Azure CLI
- Azure Cosmos DB .NET SDK
- Azure Monitor metrics

## Sources Consulted
- Microsoft Learn: Create containers and databases with autoscale throughput - https://learn.microsoft.com/en-us/azure/cosmos-db/provision-throughput-autoscale
- Microsoft Learn: Frequently asked questions about autoscale throughput - https://learn.microsoft.com/en-us/azure/cosmos-db/autoscale-faq
- Microsoft Learn: Provision autoscale throughput - https://learn.microsoft.com/en-us/azure/cosmos-db/how-to-provision-autoscale-throughput
- Microsoft Learn: Service quotas and default limits for Azure Cosmos DB - https://learn.microsoft.com/en-us/azure/cosmos-db/concepts-limits
- Microsoft Learn: Manage Azure Cosmos DB resources using Azure CLI - https://learn.microsoft.com/en-us/azure/cosmos-db/manage-with-cli
- Microsoft Learn: az cosmosdb sql container throughput - https://learn.microsoft.com/en-us/cli/azure/cosmosdb/sql/container/throughput
- Microsoft Learn: az cosmosdb sql database - https://learn.microsoft.com/en-us/cli/azure/cosmosdb/sql/database
- Microsoft Learn: ThroughputProperties.CreateAutoscaleThroughput(Int32) - https://learn.microsoft.com/en-us/dotnet/api/microsoft.azure.cosmos.throughputproperties.createautoscalethroughput
- Microsoft Learn: Container.ReadThroughputAsync - https://learn.microsoft.com/en-us/dotnet/api/microsoft.azure.cosmos.container.readthroughputasync

## Issues Found
- Corrected the manual-to-autoscale migration explanation. The initial autoscale max RU/s is system-determined from current manual throughput, highest ever provisioned RU/s, and storage, not simply the current manual value in all cases.
- Corrected the minimum autoscale max RU/s formula for containers. The post incorrectly multiplied by number of regions and omitted the highest-ever-provisioned term.
- Scoped the 1.5x autoscale pricing claim to single-write region accounts and noted that multiple-write region accounts use the standard multiple-write throughput rate.
- Clarified that the CLI throughput show command displays autoscale throughput settings, not the current scaled RU/s level.
- Clarified the .NET monitoring snippet to read autoscale max throughput and point to Azure Monitor metrics for scaled RU/s over time.
- Corrected the shared throughput container limit wording. The first 25 shared-throughput containers are covered by the minimum autoscale max RU/s; more containers can increase the minimum required max RU/s.
- Softened the final recommendation and scoped the 1.5x price-premium statement to single-write region accounts.

## Review Notes
The Azure CLI was not installed in the local environment, so CLI syntax was verified against Microsoft Learn CLI reference pages rather than local `az --help` output.
