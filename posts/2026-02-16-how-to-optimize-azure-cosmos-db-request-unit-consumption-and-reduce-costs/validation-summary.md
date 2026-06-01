# Validation Summary: How to Optimize Azure Cosmos DB Request Unit Consumption and Reduce Costs

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- Azure Cosmos DB for NoSQL
- Azure Cosmos DB Request Units (RUs)
- Azure Cosmos DB partitioning and indexing policies
- Azure Cosmos DB consistency levels
- Azure Cosmos DB autoscale and serverless capacity modes
- Azure Cosmos DB JavaScript SDK (`@azure/cosmos`)
- Azure CLI / Azure Monitor metrics

## Sources Consulted
- Microsoft Learn: Request Units in Azure Cosmos DB - https://learn.microsoft.com/en-us/azure/cosmos-db/request-units
- Microsoft Learn: Understand request units consumption in Azure Cosmos DB - https://learn.microsoft.com/en-us/azure/cosmos-db/understand-request-unit-consumption
- Microsoft Learn: Azure Cosmos DB indexing policies - https://learn.microsoft.com/en-us/azure/cosmos-db/index-policy
- Microsoft Learn: Manage indexing policies in Azure Cosmos DB - https://learn.microsoft.com/en-us/azure/cosmos-db/how-to-manage-indexing-policy
- Microsoft Learn: Consistency levels in Azure Cosmos DB - https://learn.microsoft.com/en-us/azure/cosmos-db/consistency-levels
- Microsoft Learn: Azure Cosmos DB serverless - https://learn.microsoft.com/en-us/azure/cosmos-db/serverless
- Microsoft Learn: Compare provisioned throughput and serverless - https://learn.microsoft.com/en-us/azure/cosmos-db/throughput-serverless
- Microsoft Learn: Azure Cosmos DB service quotas and default limits - https://learn.microsoft.com/en-us/azure/cosmos-db/concepts-limits
- Microsoft Learn: Time to live in Azure Cosmos DB - https://learn.microsoft.com/en-us/azure/cosmos-db/time-to-live
- Microsoft Learn: Perform bulk operations in Azure Cosmos DB for NoSQL using the Azure SDK for JavaScript - https://learn.microsoft.com/en-us/azure/cosmos-db/bulk-executor-nodejs
- Microsoft Learn: Azure Cosmos DB monitoring data reference - https://learn.microsoft.com/en-us/azure/cosmos-db/monitor-reference
- Microsoft Learn: Azure CLI `az monitor metrics list` reference - https://learn.microsoft.com/en-us/cli/azure/monitor/metrics

## Issues Found
- Fixed the first JavaScript query example to destructure `resources` from `fetchAll()` and log `resources.length`; the original used `resource.length`, which would not match the SDK response shape.
- Clarified the opening pricing statement so it applies specifically to provisioned throughput mode. Cosmos DB also supports serverless billing by consumed RUs.
- Made the partition key examples consistent by using `customerId` as the partition key property instead of a generic `partitionKey` field in one snippet and `customerId` elsewhere.
- Updated the query example that compares against a point read to include the partition key predicate, so it represents a single-partition lookup for the same item.
- Corrected consistency-level cost guidance. Strong and bounded staleness reads cost about twice as many RUs as relaxed levels, but switching from the default Session consistency to Eventual does not halve RU cost.
- Updated the Azure CLI metric flag from `--metric` to the documented `--metrics` form and included both `TotalRequestUnits` and `ProvisionedThroughput` so the command matches the surrounding "actual vs provisioned" explanation.
- Corrected serverless limitations from "5 GB per partition" to the current 20 GB logical partition limit and clarified that serverless is single-region and does not use provisioned throughput.
- Updated the bulk operation example to use the current JavaScript SDK `executeBulkOperations` API and `BulkOperationType.Create`, and changed the response handling to sum per-operation `requestCharge` values.
- Corrected the TTL explanation. TTL deletes do not require explicit client delete operations, but in provisioned throughput accounts they use leftover RUs; in serverless accounts, TTL deletions are charged as delete operations.

## Review Notes
Several numeric RU and cost-saving examples in the post are illustrative and workload-dependent. The revised post keeps that style, but readers should still validate expected costs with Azure Monitor metrics and the Azure Cosmos DB capacity calculator for their own data model, indexing policy, consistency level, and region configuration.
