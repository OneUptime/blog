# Validation Summary: MongoDB Atlas vs Azure Cosmos DB: Cloud Database Comparison

## Status
validated

## Post Type
Comparison Guide

## Technologies Covered
- MongoDB Atlas (managed cloud database)
- Azure Cosmos DB (globally distributed multi-model database)
- Cosmos DB for MongoDB API (wire protocol compatibility layer)
- Azure SDK for JavaScript (@azure/cosmos)
- MongoDB Node.js Driver

## Sources Consulted
- Azure Cosmos DB for MongoDB feature support docs: https://learn.microsoft.com/en-us/azure/cosmos-db/mongodb/feature-support-70
- Cosmos DB connection string documentation: https://learn.microsoft.com/en-us/azure/cosmos-db/mongodb/connect-account
- Cosmos DB consistency levels: https://learn.microsoft.com/en-us/azure/cosmos-db/consistency-levels
- Cosmos DB latency SLA: https://learn.microsoft.com/en-us/azure/cosmos-db/consistency-levels (read/write latency guarantees)
- Cosmos DB pricing (provisioned vs serverless): https://learn.microsoft.com/en-us/azure/cosmos-db/throughput-serverless
- Cosmos DB RU cost reference: https://learn.microsoft.com/en-us/azure/cosmos-db/key-value-store-cost
- Cosmos DB change feed pull model (JavaScript): https://learn.microsoft.com/en-us/azure/cosmos-db/nosql/change-feed-pull-model?tabs=javascript
- Microsoft Entra ID rename announcement: https://learn.microsoft.com/en-us/entra/fundamentals/new-name
- MongoDB consistency mapping for Cosmos DB: https://learn.microsoft.com/en-us/azure/cosmos-db/mongodb/consistency-mapping
- MongoDB read concern "linearizable": https://www.mongodb.com/docs/manual/reference/read-concern-linearizable/

## Issues Found

1. **MongoDB API version claim was inaccurate**: The post stated "Cosmos DB supports MongoDB API version 4.2 and 6.0 (in preview)." In reality, Cosmos DB supports versions 3.2 through 7.0, all GA (not preview). Updated to reflect the full range of supported versions and clarify that feature coverage varies per version.

2. **Write latency SLA was wrong**: The post claimed "<10ms read, <15ms write at p99 globally." The actual Cosmos DB SLA guarantees <10ms for both reads AND writes at the 99th percentile. Updated to "<10ms read and write at p99 globally."

3. **"Azure Active Directory" is now "Microsoft Entra ID"**: Azure Active Directory was renamed to Microsoft Entra ID in 2023. Updated the reference accordingly.

4. **Change feed code used incorrect API**: The `startFromBeginning: true` option does not exist in the @azure/cosmos SDK. The correct API uses `changeFeedStartFrom: ChangeFeedStartFrom.Beginning()`. Also, the `for await` iteration pattern should use `iterator.hasMoreResults` with `readNext()` per official docs. Updated the code snippet to use the correct API.

## Review Notes
- The connection string port (10255) is correct for the RU-based Cosmos DB for MongoDB API. Port 10260 is for the vCore-based model (now called Azure DocumentDB).
- The five consistency levels and their ordering are correct per official documentation.
- The MongoDB equivalents for consistency levels are reasonable approximations, though Cosmos DB's own docs note that Session consistency is "not natively supported by MongoDB" — the causal consistency session is the closest match.
- RU pricing figures ($0.008/hr per 100 RU/s, $0.25/M RUs serverless, $0.25/GB-month storage) and RU cost estimates (~1 RU read, ~5 RU write for 1KB docs) are all accurate per official documentation.
- The post could benefit from mentioning the Cosmos DB vCore model (now Azure DocumentDB) which offers higher MongoDB compatibility (up to 8.0), but this is not a technical error.
