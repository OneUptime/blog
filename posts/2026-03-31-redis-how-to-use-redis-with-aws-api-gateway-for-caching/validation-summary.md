# Validation Summary: How to Use Redis with AWS API Gateway for Caching

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Redis (via ElastiCache)
- AWS API Gateway
- AWS Lambda (Node.js and Python)
- AWS DynamoDB
- ioredis (Node.js Redis client)
- redis-py (Python Redis client)
- AWS CloudFormation / Serverless Framework
- DynamoDB Streams

## Sources Consulted
- AWS SDK for JavaScript v3 documentation: https://docs.aws.amazon.com/sdk-for-javascript/v3/developer-guide/
- AWS SDK v2 end-of-support announcement: https://aws.amazon.com/blogs/developer/announcing-end-of-support-for-aws-sdk-for-javascript-v2/
- AWS Lambda runtimes documentation (Node.js 18.x ships SDK v3 only): https://docs.aws.amazon.com/lambda/latest/dg/lambda-runtimes.html
- ioredis API documentation: https://github.com/redis/ioredis/blob/main/API.md
- Python `hash()` randomization (PEP 456 / PYTHONHASHSEED): https://docs.python.org/3/reference/datamodel.html#object.__hash__
- redis-py documentation: https://redis-py.readthedocs.io/
- AWS ElastiCache CloudFormation reference: https://docs.aws.amazon.com/AWSCloudFormation/latest/UserGuide/aws-resource-elasticache-cachecluster.html
- DynamoDB Streams record format: https://docs.aws.amazon.com/amazondynamodb/latest/developerguide/Streams.html

## Issues Found

### 1. AWS SDK v2 used with Node.js 18.x Lambda runtime (critical)
- **What was wrong:** The JavaScript Lambda handler used `const AWS = require('aws-sdk')` (AWS SDK v2), but the `nodejs18.x` runtime only bundles SDK v3. The code would fail with `MODULE_NOT_FOUND` at runtime.
- **What was changed:** Replaced `aws-sdk` v2 imports with `@aws-sdk/client-dynamodb` and `@aws-sdk/lib-dynamodb` (SDK v3). Updated `DynamoDB.DocumentClient` usage to `DynamoDBDocumentClient` with `GetCommand`, and removed the `.promise()` call pattern.
- **Why:** SDK v3 is the only SDK included in Node.js 18.x Lambda runtime. SDK v2 entered maintenance mode and is no longer bundled.

### 2. Invalid `commandTimeout` option in ioredis (minor)
- **What was wrong:** The ioredis client configuration included `commandTimeout: 1000`, which is not a recognized ioredis option. It would be silently ignored, giving false confidence that commands would timeout after 1 second.
- **What was changed:** Removed the `commandTimeout` line from the ioredis configuration.
- **Why:** ioredis does not support a `commandTimeout` option. Per-command timeouts require custom wrapper logic or alternative approaches.

### 3. Non-deterministic `hash()` used for cache keys in Python (critical)
- **What was wrong:** The Python caching decorator used `hash(params)` to generate cache keys. Python's built-in `hash()` is randomized across processes (PYTHONHASHSEED, enabled by default since Python 3.3). Each Lambda cold start would produce different hash values for the same input, causing cache misses on every cold start and potentially unbounded cache key growth.
- **What was changed:** Replaced `hash(params)` with `hashlib.md5(params.encode()).hexdigest()` and added `import hashlib` to the imports.
- **Why:** `hashlib.md5` produces deterministic, consistent hashes across all Python processes and invocations, which is essential for cache key stability.

## Review Notes
- The cache invalidation Lambda uses the `KEYS` command (`redis.keys('catalog:/products*')`), which scans the entire keyspace and blocks Redis. For production systems with large keyspaces, `SCAN` with a cursor would be more appropriate. Acceptable for a tutorial with small datasets.
- The Python handler's `event.get('queryStringParameters', {})` pattern does not protect against `queryStringParameters` being explicitly `null` (as API Gateway sends when there are no query params). The more robust pattern is `event.get('queryStringParameters') or {}`. This affects both the decorator and the handler function.
- The module-level Redis connection in the cache invalidation Lambda does not handle reconnection (unlike the main handler's `getRedisClient()` function that checks `redis.status === 'end'`). For a production deployment, the same reconnection pattern should be applied.
- `nodejs18.x` is a valid but aging Lambda runtime. Node.js 20.x and 22.x are available. Not changed since 18.x is still supported.
