# Validation Summary: RedisJSON vs MongoDB: Document Storage Comparison

## Status
validated

## Post Type
Comparison Guide

## Technologies Covered
- RedisJSON (Redis module for native JSON document storage)
- RediSearch (Redis module for secondary indexing and full-text search)
- MongoDB (BSON document database with MQL and aggregation pipeline)
- redis-py (Python Redis client library)
- pymongo (Python MongoDB driver)

## Sources Consulted
- RedisJSON command reference: https://redis.io/docs/latest/develop/data-types/json/
- RediSearch command reference: https://redis.io/docs/latest/develop/interact/search-and-query/
- MongoDB CRUD operations: https://www.mongodb.com/docs/manual/crud/
- MongoDB aggregation pipeline: https://www.mongodb.com/docs/manual/aggregation/
- Redis persistence documentation: https://redis.io/docs/latest/operate/oss_and_stack/management/persistence/
- MongoDB journaling: https://www.mongodb.com/docs/manual/core/journaling/
- redis-py JSON support: https://redis-py.readthedocs.io/en/stable/commands.html#json-commands
- pymongo documentation: https://pymongo.readthedocs.io/en/stable/

## Issues Found
- **Unused import in Python example**: The `import json` statement was included in the hybrid pattern code example but never used. Removed it to keep the example clean and accurate.

## Review Notes
- The `JSON.ARRAPPEND` example references `$.tags` on a document that was created without a `tags` field. The command syntax is correct, but in practice it would return an error since the path doesn't exist. This is acceptable as the example is demonstrating the command, not a complete workflow.
- The Python hybrid pattern does not handle MongoDB `ObjectId` serialization. If documents use auto-generated ObjectIds for `_id`, `r.json().set()` would fail because ObjectId is not JSON serializable. This depends on the application's schema design and may not be an issue if string or integer IDs are used.
- MongoDB latency figures in the performance table (1-10ms reads, 1-5ms writes) are reasonable ballpark numbers but will vary significantly based on hardware, indexes, working set size, and whether data is in the WiredTiger cache.
- The post correctly notes that Redis MULTI provides atomic command batching, which is distinct from MongoDB's full ACID multi-document transactions (available since MongoDB 4.0).
