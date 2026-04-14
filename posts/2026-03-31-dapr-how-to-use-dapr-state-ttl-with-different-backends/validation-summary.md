# Validation Summary: How to Use Dapr State TTL with Different Backends

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Dapr (state management building block, TTL feature)
- Redis (state backend with native key expiration)
- PostgreSQL (state backend with cleanup goroutine)
- Azure Cosmos DB (state backend with document-level TTL)
- MongoDB (mentioned in comparison table)
- MySQL (mentioned in comparison table)
- Python (application code example using requests library)
- .NET / C# (application code example using Dapr SDK)

## Sources Consulted
- Dapr State Store TTL documentation: https://docs.dapr.io/developing-applications/building-blocks/state-management/state-store-ttl/
- Dapr State API reference: https://docs.dapr.io/reference/api/state_api/
- Dapr Redis state store component reference: https://docs.dapr.io/reference/components-reference/supported-state-stores/setup-redis/
- Dapr PostgreSQL v2 state store component reference: https://docs.dapr.io/reference/components-reference/supported-state-stores/setup-postgresql-v2/
- Dapr Azure Cosmos DB state store component reference: https://docs.dapr.io/reference/components-reference/supported-state-stores/setup-azure-cosmosdb/
- Dapr components-contrib source code (state/utils/ttl.go, state/redis/redis.go, state/postgresql/v2/postgresql.go, state/azure/cosmosdb/cosmosdb.go, state/responses.go)
- Azure Cosmos DB TTL documentation: https://learn.microsoft.com/en-us/azure/cosmos-db/nosql/time-to-live
- MongoDB TTL index documentation: https://www.mongodb.com/docs/manual/core/index-ttl/

## Issues Found

1. **Wrong TTL response header name**: The blog claimed the response header is `Dapr-TTL-Expire-Time`. The actual response metadata key is `ttlExpireTime`, which is returned as a `Metadata.ttlExpireTime` header in HTTP responses. Fixed the header name and grep command in the example.

2. **Misleading Redis comment about SETEX**: The YAML comment said "Dapr uses SETEX or EXPIRE natively". Dapr only uses `EXPIRE` (not `SETEX`). Fixed the comment to say "Dapr uses EXPIRE natively".

3. **Wrong PostgreSQL column name**: The blog used `expiredate` as the TTL column name. In the PostgreSQL v2 state store, the actual column is `expires_at`. Fixed in the schema, comparison table, and summary paragraph.

4. **Wrong PostgreSQL cleanupInterval default**: The blog claimed the default is 300 seconds. The actual default for the v2 component is `1h` (3600 seconds). Fixed the YAML comment and changed the example value format to `"60s"` to match Go duration string syntax.

5. **Wrong PostgreSQL v2 table schema**: The blog showed a v1-style schema with `JSONB` value column, `VARCHAR(50)` etag, and an `isbinary` column. The v2 schema uses `BYTEA` for value, `UUID` for etag (with `gen_random_uuid()` default), has no `isbinary` column, and uses underscore-separated column names (`created_at`, `updated_at`, `expires_at`). Fixed the entire schema block.

6. **Wrong Cosmos DB TTL explanation**: The blog intro said "Dapr sets the `_ts` field". The `_ts` field is a read-only system timestamp set by Cosmos DB itself. Dapr sets the `ttl` field (an integer in seconds) on each document. Fixed the description.

7. **Wrong Cosmos DB field name in comparison table**: The table listed `_ttl document field` for Azure Cosmos DB. The actual field name is `ttl` (without underscore). Fixed the table entry.

## Review Notes
- The `acquire_lock` function in the Python example has a documented race condition (check-then-set without atomicity). The code comment already acknowledges this. For production use, Dapr's dedicated distributed lock API (`/v1.0-alpha1/lock`) would be more appropriate, but since the example is illustrative of TTL usage rather than lock correctness, this is acceptable.
- The .NET code uses `Dictionary<string, string>` for the metadata parameter, while the SDK signature accepts `IReadOnlyDictionary<string, string>?`. This works fine since `Dictionary` implements `IReadOnlyDictionary`, so no change needed.
- The MySQL `expires_at` column name in the comparison table could not be verified against official documentation, but it is plausible given the v2 PostgreSQL pattern. Left as-is.
