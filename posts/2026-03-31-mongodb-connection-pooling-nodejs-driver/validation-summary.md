# Validation Summary: How to Use Connection Pooling in the MongoDB Node.js Driver

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- MongoDB Node.js Driver (mongodb npm package)
- Node.js
- Express.js
- Connection Pooling (CMAP specification)

## Sources Consulted
- MongoDB Node.js Driver documentation: https://www.mongodb.com/docs/drivers/node/current/fundamentals/connection/connection-options/
- MongoDB Node.js Driver Connection Pool Monitoring: https://www.mongodb.com/docs/drivers/node/current/fundamentals/monitoring/connection-monitoring/
- MongoDB Node.js Driver API reference for MongoClient options
- MongoDB currentOp command documentation: https://www.mongodb.com/docs/manual/reference/command/currentOp/

## Issues Found

1. **Top-level `await` in CommonJS module**: The first code example used `await client.connect()` at module scope while using `require()` (CommonJS). Top-level `await` is only supported in ES modules. Wrapped the connect call in an async function and exported both the client and the connect function.

2. **Misleading `serverApi` reference**: The "Verifying Pool Usage" section stated "Enable the `serverApi` and check the `currentOp`", implying `serverApi` is needed to use `currentOp`. The `serverApi` option (Stable API) is unrelated to the `currentOp` command. Changed the text to simply describe using the `currentOp` admin command.

## Review Notes
- The default `maxPoolSize` of 100 is correct for the current MongoDB Node.js driver (v6.x).
- The CMAP event names (`connectionPoolCreated`, `connectionCheckedOut`, `connectionCheckedIn`, `connectionPoolClosed`) are correct and match the driver's monitoring specification.
- The `waitQueueTimeoutMS` option was removed in driver v6.0 (it now defaults to 0, meaning no timeout). However, for users on driver v5.x or using connection string parameters, it remains valid. This may need updating if the post targets only v6+.
- The `maxIdleTimeMS` option is correct and supported across current driver versions.
