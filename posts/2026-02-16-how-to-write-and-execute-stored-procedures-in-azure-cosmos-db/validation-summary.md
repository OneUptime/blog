# Validation Summary: How to Write and Execute Stored Procedures in Azure Cosmos DB

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Azure Cosmos DB for NoSQL
- Cosmos DB stored procedures
- Server-side JavaScript
- Azure Cosmos DB .NET SDK
- Azure CLI
- ACID transactions and transactional batch

## Sources Consulted
- Microsoft Learn: How to write stored procedures, triggers, and user-defined functions in Azure Cosmos DB: https://learn.microsoft.com/en-us/azure/cosmos-db/how-to-write-stored-procedures-triggers-udfs
- Microsoft Learn: Database transactions and optimistic concurrency control in Azure Cosmos DB: https://learn.microsoft.com/en-us/azure/cosmos-db/database-transactions-optimistic-concurrency
- Microsoft Learn: Transactional batch operations in Azure Cosmos DB: https://learn.microsoft.com/en-us/azure/cosmos-db/transactional-batch
- Microsoft Learn: Azure CLI `az cosmosdb sql stored-procedure`: https://learn.microsoft.com/en-us/cli/azure/cosmosdb/sql/stored-procedure
- Microsoft Learn: Azure Cosmos DB .NET SDK `Scripts` class: https://learn.microsoft.com/en-us/dotnet/api/microsoft.azure.cosmos.scripts.scripts
- Microsoft Learn: Azure Cosmos DB .NET SDK `CreateStoredProcedureAsync`: https://learn.microsoft.com/en-us/dotnet/api/microsoft.azure.cosmos.scripts.scripts.createstoredprocedureasync

## Issues Found
- The introduction incorrectly said stored procedures are the only way to get ACID transactions across multiple documents in Cosmos DB. Updated it to say stored procedures are one option within a logical partition and noted that transactional batch is another option for same-partition point operations.
- The balance transfer stored procedure built SQL query strings by concatenating document IDs. Updated both queries to use parameterized query objects, matching the official Cosmos DB stored procedure examples and avoiding malformed queries when IDs contain quotes or special characters.
- The bulk insert stored procedure returned `{ inserted: 0 }` for an empty input array, but the C# caller expects a `completed` value. Updated the empty input response to `{ inserted: 0, completed: true }`.
- The error-handling example caught exceptions and returned an error response, which can prevent Cosmos DB from rolling back writes already performed by the stored procedure. Updated the example to add context and rethrow so the transaction rolls back.

## Review Notes
The .NET SDK method names and signatures, Azure CLI command parameters, single-logical-partition scoping, JavaScript requirement, 5-second bounded execution behavior, and boolean `accepted` continuation pattern matched the official documentation. In future updates, the post could mention transactional batch tradeoffs more fully, but the existing stored procedure focus is technically valid.
