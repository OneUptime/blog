# Validation Summary: How to Implement Data Archival Strategies in MongoDB

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- MongoDB (TTL indexes, aggregation pipelines, `$out` stage, transactions)
- MongoDB Atlas Online Archive (Admin API)
- MongoDB Atlas Data Federation

## Sources Consulted
- MongoDB TTL Indexes documentation: https://www.mongodb.com/docs/manual/core/index-ttl/
- MongoDB `$out` aggregation stage documentation: https://www.mongodb.com/docs/manual/reference/operator/aggregation/out/
- MongoDB Transactions documentation: https://www.mongodb.com/docs/manual/core/transactions/
- MongoDB Atlas Online Archive API documentation: https://www.mongodb.com/docs/atlas/reference/api-resources-spec/v2/#tag/Online-Archive
- MongoDB Atlas Admin API Authentication documentation: https://www.mongodb.com/docs/atlas/configure-api-access/

## Issues Found
1. **Atlas API curl command used Basic auth instead of Digest auth**: The original command used `curl -u "user:apikey"` which sends HTTP Basic authentication. The MongoDB Atlas Admin API requires HTTP Digest authentication. Fixed by adding the `--digest` flag and updating the credential placeholders to `publicKey:privateKey` to match Atlas API key terminology.

## Review Notes
- The `$out` stage replaces the target collection entirely (atomically). The post describes it as "writes results to a collection" which is technically correct but could be clearer. If appending to an existing archive is needed, `$merge` would be the appropriate stage instead.
- The Atlas Admin API endpoint uses `v1.0` which still works but `v2` is the current recommended version. This is not incorrect but worth updating in a future revision.
- The transaction-based archive pattern does not pass the session to the `find()` call. The insert and delete are correctly wrapped in the transaction, and the pattern still works correctly since the delete uses the specific `_id` values from the find results. For stricter transactional reads, the session should also be used with find.
- Multi-document transactions require a replica set, which is not mentioned. Standalone MongoDB instances do not support multi-document transactions.
- The TTL expireAfterSeconds value of 7776000 correctly equals 90 days (90 x 86400).
