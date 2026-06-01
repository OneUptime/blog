# Validation Summary: How to Build a Graph Database Using Azure Cosmos DB Gremlin API

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Azure Cosmos DB for Apache Gremlin
- Azure CLI
- Apache TinkerPop Gremlin
- Gremlin.Net
- gremlinpython
- Gremlin JavaScript driver
- Python
- C#
- Node.js

## Sources Consulted
- Azure Cosmos DB for Apache Gremlin Python quickstart: https://learn.microsoft.com/en-us/azure/cosmos-db/gremlin/quickstart-python
- Azure Cosmos DB for Apache Gremlin .NET quickstart: https://learn.microsoft.com/en-us/azure/cosmos-db/gremlin/quickstart-dotnet
- Azure Cosmos DB for Apache Gremlin Node.js quickstart: https://learn.microsoft.com/en-us/azure/cosmos-db/gremlin/quickstart-nodejs
- Azure CLI reference for `az cosmosdb gremlin graph create`: https://learn.microsoft.com/en-us/cli/azure/cosmosdb/gremlin/graph?view=azure-cli-latest
- Azure Cosmos DB for Gremlin partitioning guidance: https://learn.microsoft.com/en-us/azure/cosmos-db/gremlin/partitioning
- Azure Cosmos DB for Gremlin graph data modeling guidance: https://learn.microsoft.com/en-us/azure/cosmos-db/gremlin/modeling
- Azure Cosmos DB for Gremlin support and TinkerPop compatibility: https://learn.microsoft.com/en-us/azure/cosmos-db/gremlin/support
- Azure Cosmos DB account name validation REST API: https://learn.microsoft.com/en-us/rest/api/cosmos-db-resource-provider/database-accounts/check-name-exists

## Issues Found
- The sample Cosmos DB account name used mixed case (`myGraphAccount`), but Cosmos DB account names must use lowercase letters, numbers, and hyphens. Changed it to `mygraphaccount` in CLI commands and client connection strings.
- The sample graph created an edge from Alice to `portland` without first creating a Portland vertex. Added the missing Portland city vertex.
- The same-city query used `.has('id', neq('alice'))`. Updated it to `.hasId(neq('alice'))` so it filters by vertex ID rather than a user property.
- The path query was described as a shortest-path query even though the traversal only returns one simple path. Changed the wording to "one simple path."
- The partitioning guidance suggested using the vertex label as the partition key. Azure Cosmos DB for Gremlin does not support `/label` as the container partition key, so the wording now describes storing entity type in a separate partition key property and notes the hot-partition risk.
- The synthetic partition key example used Python's built-in `hash()`, which is randomized between processes and is not stable enough for persisted partition keys. Replaced it with a deterministic SHA-256 based hash.
- The recommendation example showed an incomplete query that referenced `already_purchased` before defining the side effect and used `.where(neq('alice'))` to exclude Alice. Reworked the example into one complete query and changed the exclusion to `.hasId(neq('alice'))`.

## Review Notes
- The official Azure Cosmos DB for Gremlin docs recommend GraphSON v2 serializers and text-based Gremlin submissions because GraphSON v3 and Gremlin bytecode are not supported; the post's connection examples align with that guidance.
- The query examples are intentionally compact. For production-scale partitioned graphs, Microsoft recommends including the partition key when selecting known vertices to reduce cross-partition fan-out.
