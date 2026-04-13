# Validation Summary: How to Use MongoDB with Azure Cosmos DB (MongoDB API)

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Azure Cosmos DB for MongoDB (RU-based model)
- MongoDB wire protocol
- Node.js MongoDB driver
- PyMongo (Python MongoDB driver)
- mongodump / mongorestore CLI tools
- Azure Database Migration Service

## Sources Consulted
- Microsoft Azure Cosmos DB for MongoDB feature support docs: https://learn.microsoft.com/en-us/azure/cosmos-db/mongodb/feature-support-42
- Microsoft Azure Cosmos DB for MongoDB 5.0 feature support: https://learn.microsoft.com/en-us/azure/cosmos-db/mongodb/feature-support-50
- Microsoft Azure Cosmos DB for MongoDB 6.0 feature support: https://learn.microsoft.com/en-us/azure/cosmos-db/mongodb/feature-support-60
- Microsoft Azure Cosmos DB custom commands (extension commands): https://learn.microsoft.com/en-us/azure/cosmos-db/mongodb/custom-commands
- Microsoft Azure Cosmos DB connect account docs: https://learn.microsoft.com/en-us/azure/cosmos-db/mongodb/connect-account
- Microsoft Azure Cosmos DB billing/pricing docs: https://learn.microsoft.com/en-us/azure/cosmos-db/understand-your-bill
- MongoDB Node.js driver connection options documentation (ssl vs tls): https://www.mongodb.com/docs/drivers/node/current/fundamentals/connection/connection-options/

## Issues Found
1. **Outdated API compatibility claim**: The post stated "MongoDB 4.2 (with 5.0 preview available in some regions)." Cosmos DB for MongoDB (RU-based) now supports versions 3.2, 3.6, 4.0, 4.2, 5.0, and 6.0 — all generally available. Fixed to list all supported versions.

2. **Deprecated `ssl` option in Node.js driver**: The Node.js code example used `ssl: true`, which is deprecated in MongoDB Node.js driver v4+. Changed to `tls: true`, which is the current recommended option.

3. **Incorrect collection creation syntax**: The second collection creation example used `db.createCollection("products", { shardKey: { _id: "hashed" } })`, which is not valid Cosmos DB syntax. The `shardKey` option is not accepted by standard `db.createCollection()`. Fixed to use the correct `db.runCommand({ customAction: "CreateCollection", ... })` extension command with `shardKey` as a string value.

4. **Incorrect billing claim**: The post stated "Cosmos DB charges in Request Units, not by storage size or compute time." This is incorrect — Cosmos DB bills for both provisioned throughput (RUs) and consumed storage (per GB). Fixed to accurately describe both billing components.

5. **Outdated retryable writes claim**: The post listed retryable writes as "not supported." Retryable writes are supported on API version 4.0+ when the `EnableMongoRetryableWrites` capability is enabled on the account. Updated the unsupported features list to clarify this is an opt-in feature on 4.0+.

## Review Notes
- The `retryWrites: false` in the Node.js and connection string examples is still a reasonable default since the feature requires explicit opt-in via an account-level capability flag. However, readers on API 4.0+ should know they can enable it.
- The post does not mention the Cosmos DB for MongoDB vCore-based model, which is a newer offering with different capabilities and pricing. This is not an error but could be noted in a future update.
- The `--ssl` flag in the `mongorestore` command is deprecated in newer MongoDB tools in favor of `--tls`, but both still work. Not changed since it remains functional.
- The comment "not supported in Cosmos DB" next to `retryWrites: false` was softened to "disabled by default in Cosmos DB" to match the corrected information.
