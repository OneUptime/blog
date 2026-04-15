# Validation Summary: How to Use Dapr Azure Cosmos DB SQL Output Binding

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Dapr (output bindings)
- Azure Cosmos DB (SQL / Core API)
- Azure CLI (`az cosmosdb`)
- Dapr JavaScript SDK (`@dapr/dapr`)
- Node.js

## Sources Consulted
- Dapr Cosmos DB binding reference: https://docs.dapr.io/reference/components-reference/supported-bindings/cosmosdb/
- Dapr JavaScript SDK documentation: https://docs.dapr.io/developing-applications/sdks/js/
- Dapr components-contrib source code (cosmosdb binding implementation)
- Azure CLI `az cosmosdb` command reference: https://learn.microsoft.com/en-us/cli/azure/cosmosdb

## Issues Found

### 1. Incorrect claim that `create` operation performs an upsert
- **What was wrong:** Lines 66 and 179 stated the `create` operation "upserts" documents. The Dapr Cosmos DB binding implementation uses Azure Cosmos DB's `CreateItem` method, not `UpsertItem`. A `create` call will return a 409 Conflict error if a document with the same `id` and partition key already exists.
- **What was changed:** Updated line 66 to clarify that `create` inserts a new document and returns a 409 Conflict on duplicates. Updated the summary (line 179) to say "inserting" instead of "upserting."
- **Why:** The distinction matters because users relying on upsert behavior would encounter unexpected 409 errors. The post's own error-handling section already checked for 409 codes, which contradicted the upsert claim.

### 2. Unnecessary `_partitionKey` field in document payload
- **What was wrong:** Line 82 included `_partitionKey: order.customerId` in the document data. The Dapr Cosmos DB binding extracts the partition key value from the document field named in the component metadata's `partitionKey` setting (which is `customerId` in this post). The `_partitionKey` field is not recognized by the binding and would simply be stored as extraneous data in the Cosmos DB document.
- **What was changed:** Removed the `_partitionKey` line from the document payload.
- **Why:** Including it is misleading — readers might think it is required for the binding to route the document to the correct partition, when in fact the binding uses the `customerId` field directly.

## Review Notes
- The error-handling section checking for 409 and 429 status codes is reasonable. However, the 409 check is now more clearly aligned with the corrected explanation that `create` is not an upsert.
- The TTL example is correct — Cosmos DB uses a `ttl` field (in seconds) on the document, but the container must have TTL enabled (default TTL set) for it to take effect. The post does not mention this prerequisite, which could be a useful addition in the future.
- The `masterKey` authentication approach works but Microsoft Entra ID (formerly Azure AD) authentication is now the recommended approach for production. The post could note this in a future update.
- Azure has rebranded the "SQL API" to "NoSQL API" (Azure Cosmos DB for NoSQL). The post uses the older "SQL API" terminology, which still works but may cause confusion with newer documentation.
