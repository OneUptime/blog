# Validation Summary: How to Use Custom Key Schemes in Dapr State Management

## Status
validated

## Post Type
Guide

## Technologies Covered
- Dapr State Management API (v1.0)
- Dapr Python SDK (`dapr-client`)
- Go (key builder utility)
- Redis (as state store backend)
- Azure Cosmos DB (as state store backend)
- Amazon DynamoDB (as state store backend)
- PostgreSQL (as state store backend)

## Sources Consulted
- Dapr State Management How-To Guide: https://docs.dapr.io/developing-applications/building-blocks/state-management/howto-get-save-state/
- Dapr State Management Overview: https://docs.dapr.io/developing-applications/building-blocks/state-management/state-management-overview/
- Dapr State API Reference: https://docs.dapr.io/reference/api/state_api/
- Dapr Python SDK Documentation: https://docs.dapr.io/developing-applications/sdks/python/python-client/
- Dapr Share State Between Applications: https://docs.dapr.io/developing-applications/building-blocks/state-management/howto-share-state/
- Azure Cosmos DB Service Limits: https://learn.microsoft.com/en-us/azure/cosmos-db/concepts-limits
- AWS DynamoDB Service Limits: https://docs.aws.amazon.com/amazondynamodb/latest/developerguide/ServiceQuotas.html
- Redis Documentation on Strings/Keys: https://redis.io/docs/latest/develop/data-types/strings/

## Issues Found

1. **Cosmos DB max key length was incorrect.** The post claimed 255 characters, but the actual limit is 1,023 bytes for the document ID value. The 255-character limit applies to database and container names, not key/ID values. Fixed the table to show "1,023 bytes".

2. **DynamoDB max key length was incorrect.** The post claimed 1,024 bytes, but the partition key limit is actually 2,048 bytes. The 1,024-byte limit applies to sort keys, not partition keys. Fixed the table to show "2,048 bytes".

3. **Missing Content-Type headers in curl commands.** The curl commands in Patterns 3 (Hierarchical Keys), 4 (Version-Stamped Keys), and 5 (Time-Bucketed Keys) were missing the `-H "Content-Type: application/json"` header. Without this header, curl defaults to `application/x-www-form-urlencoded`, which would cause the Dapr API to reject or misinterpret the request body. Added the missing headers to all three commands.

## Review Notes
- The Python `StateKey` class uses `@dataclass` decorator but only contains `@staticmethod` methods and no instance fields. This works but is unconventional -- a plain class or module-level functions would be more idiomatic. Left as-is since it is not technically incorrect.
- The `||` delimiter used by Dapr for key prefixing cannot be used within state keys themselves. The blog does not mention this restriction. Users choosing custom key schemes should be aware of this constraint.
- The Redis 512 MB key length claim is technically correct (Redis keys are strings, and strings have a 512 MB limit), though the official Redis docs state this limit explicitly for values rather than keys. The characterization as "practically unlimited" is appropriate.
- PostgreSQL "unlimited" is a minor simplification -- the `text` type has a practical limit of approximately 1 GB -- but this is effectively unlimited for state management key purposes and is an acceptable characterization.
