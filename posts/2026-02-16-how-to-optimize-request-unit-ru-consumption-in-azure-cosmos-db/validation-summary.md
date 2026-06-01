# Validation Summary: How to Optimize Request Unit (RU) Consumption in Azure Cosmos DB

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- Azure Cosmos DB for NoSQL
- Request Units (RUs)
- Azure Cosmos DB .NET SDK
- Cosmos DB SQL queries
- Cosmos DB indexing policies
- Cosmos DB consistency levels
- Cosmos DB integrated cache

## Sources Consulted
- Azure Cosmos DB request units: https://learn.microsoft.com/en-us/azure/cosmos-db/request-units
- Understand request units consumption in Azure Cosmos DB: https://learn.microsoft.com/en-us/azure/cosmos-db/understand-request-unit-consumption
- Azure Cosmos DB consistency levels: https://learn.microsoft.com/en-us/azure/cosmos-db/consistency-levels
- Azure Cosmos DB indexing policies: https://learn.microsoft.com/en-us/azure/cosmos-db/index-policy
- Manage indexing policies in Azure Cosmos DB: https://learn.microsoft.com/en-us/azure/cosmos-db/how-to-manage-indexing-policy
- Tuning query performance with Azure Cosmos DB: https://learn.microsoft.com/en-us/azure/cosmos-db/nosql/query-metrics
- Pagination in Azure Cosmos DB queries: https://learn.microsoft.com/en-us/azure/cosmos-db/nosql/query/pagination
- Query performance tips for Azure Cosmos DB SDKs: https://learn.microsoft.com/en-us/azure/cosmos-db/nosql/performance-tips-query-sdk
- Azure Cosmos DB integrated cache: https://learn.microsoft.com/en-us/azure/cosmos-db/integrated-cache
- Find request unit charge for operations in Azure Cosmos DB for NoSQL: https://learn.microsoft.com/en-us/azure/cosmos-db/find-request-unit-charge
- Azure Cosmos DB .NET SDK API reference: https://learn.microsoft.com/en-us/dotnet/api/microsoft.azure.cosmos
- Azure Cosmos DB pricing: https://azure.microsoft.com/en-us/pricing/details/cosmos-db/

## Issues Found
- The consistency-level example incorrectly implied that Eventual consistency would reduce a 1 KB point read from about 1 RU to 0.5 RU. Azure documentation states Strong and Bounded Staleness reads cost approximately twice as many RUs as weaker consistency levels, so the example was corrected to about 2 RUs versus about 1 RU when the account default is Strong or Bounded Staleness.
- The query-pattern section described a single-property `ORDER BY` as requiring a composite index and forcing an in-memory sort. Azure Cosmos DB supports single-property `ORDER BY` with the default range index; composite indexes are required for `ORDER BY` queries over multiple properties. The example was changed to a multi-property `ORDER BY`.
- The projection example claimed projected queries typically cost 30-50% less. Projection can reduce response payload and RU usage, but the exact savings are workload-dependent. The claim was softened to advise measuring the workload.
- The document-size example used comments inside a `json` fenced block, which is not valid JSON. The fence was changed to `jsonc` because the snippet is illustrative and intentionally contains comments.
- The pagination section implied smaller pages reduce RU usage generally. Documentation notes `MaxItemCount` limits items per page, but reading every page can still consume the total work across pages and very small pages can hurt performance. The wording was corrected to distinguish per-request RU from total RU.
- The RU-tracking helper pattern matched only `ItemResponse<dynamic>` and `FeedResponse<dynamic>`, so typed SDK responses such as `ItemResponse<MyDoc>` would not be counted. It was replaced with typed item and query tracking helpers that read `RequestCharge` from `ItemResponse<T>` and `FeedResponse<T>`.
- The final paragraph gave a fixed dollar savings estimate for 10 million RUs. Cosmos DB pricing varies by region, account model, availability zones, and current pricing. The text was changed to describe the billable RU reduction for serverless and the possible provisioned-throughput impact without hard-coding a price.

## Review Notes
Approximate RU values in the operation table and examples are acceptable as illustrative estimates, but actual charges should still be measured with `RequestCharge` for the specific item size, indexing policy, consistency level, query shape, and partitioning model.
