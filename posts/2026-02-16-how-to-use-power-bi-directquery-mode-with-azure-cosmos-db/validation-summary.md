# Validation Summary: How to Use Power BI DirectQuery Mode with Azure Cosmos DB

## Status
validated

## Post Type
Tutorial / technical guide

## Technologies Covered
- Microsoft Power BI
- Power BI DirectQuery
- Azure Cosmos DB for NoSQL
- Azure Cosmos DB analytical store
- Azure Synapse Link for Azure Cosmos DB
- Azure Synapse Analytics serverless SQL pool
- Microsoft Fabric mirroring and Direct Lake
- T-SQL, OPENROWSET, OPENJSON, DAX

## Sources Consulted
- Microsoft Learn: Visualize Azure Cosmos DB for NoSQL data using Power BI - https://learn.microsoft.com/en-us/azure/cosmos-db/powerbi-visualize
- Microsoft Learn: What is Azure Cosmos DB analytical store? - https://learn.microsoft.com/en-us/azure/cosmos-db/analytical-store-introduction
- Microsoft Learn: Query Azure Cosmos DB data using a serverless SQL pool - https://learn.microsoft.com/en-us/azure/synapse-analytics/sql/query-cosmos-db-analytical-store
- Microsoft Learn: Use Power BI and serverless Synapse SQL pool to analyze Azure Cosmos DB data with Synapse Link - https://learn.microsoft.com/en-us/azure/cosmos-db/synapse-link-power-bi
- Microsoft Learn: Mirroring Azure Cosmos DB - https://learn.microsoft.com/en-us/fabric/mirroring/azure-cosmos-db
- Microsoft Learn: Use DirectQuery in Power BI Desktop - https://learn.microsoft.com/en-us/power-bi/connect-data/desktop-use-directquery
- Microsoft Learn: DirectQuery model guidance in Power BI Desktop - https://learn.microsoft.com/en-us/power-bi/guidance/directquery-model-guidance

## Issues Found
- The post incorrectly implied that the native Azure Cosmos DB Power BI connector supports both Import and DirectQuery. Microsoft documentation states the native connector is import-only, while DirectQuery is available through Synapse Link/serverless SQL views for existing projects. I updated the connection section to distinguish native import from DirectQuery through an analytical layer.
- The post presented Azure Synapse Link as the preferred alternative for new projects. Microsoft documentation now says Synapse Link for Cosmos DB is no longer supported for new projects and recommends Azure Cosmos DB mirroring in Microsoft Fabric. I added that caveat and a concise Fabric mirroring alternative.
- The post said existing containers require creating a new analytical-store-enabled container and migrating data. Official documentation says analytical store can be enabled on existing API for NoSQL containers through the portal, CLI, PowerShell, or SDKs. I corrected that statement.
- The Synapse SQL example selected `doc.shippingAddress.city` after declaring `shippingAddress` as JSON text, which would not work as written. I changed the example to project nested values using JSON paths in the `WITH` clause.
- The `OPENROWSET` examples omitted the region and used inconsistent placeholder account names. I updated the examples to use documented `Account`, `Database`, `Region`, and `Key` connection string properties with a consistent placeholder.
- The array-flattening example used `AS JSON` in a way that did not match the documented Synapse serverless SQL pattern for Cosmos DB analytical store. I changed it to project the array as `VARCHAR(MAX)` with a JSON path and then use `CROSS APPLY OPENJSON`.
- The cost section said every Cosmos DB query consumes RUs. That is true for transactional-store reads, but Synapse serverless SQL over analytical store does not consume transactional RUs; it is billed through analytical reads and Synapse serverless SQL processing. I corrected the monitoring guidance.
- The DirectQuery/DAX language overstated unsupported functions. I softened it to reflect documented DirectQuery restrictions and performance considerations around complex DAX, calculated columns, row-level security rules, and query folding.

## Review Notes
- The post is now technically accurate for the current Microsoft documentation as of 2026-05-30.
- Future updates should consider expanding the Fabric mirroring path if this guide is intended primarily for new Azure Cosmos DB analytics implementations.
