# Validation Summary: How to Use TTL Indexes for Automatic Data Cleanup in MongoDB

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- MongoDB TTL (Time To Live) indexes
- MongoDB `createIndex` with `expireAfterSeconds`
- MongoDB `collMod` command for index modification
- MongoDB `serverStatus` metrics for TTL monitoring

## Sources Consulted
- MongoDB Manual — TTL Indexes: https://www.mongodb.com/docs/manual/core/index-ttl/
- MongoDB Manual — `collMod`: https://www.mongodb.com/docs/manual/reference/command/collMod/
- MongoDB Manual — `serverStatus`: https://www.mongodb.com/docs/manual/reference/command/serverStatus/
- MongoDB Manual — `createIndex`: https://www.mongodb.com/docs/manual/reference/method/db.collection.createIndex/

## Issues Found
1. **Incorrect claim about modifying TTL indexes** (line 86): The post stated "You cannot change a TTL index's `expireAfterSeconds` by dropping and recreating it. Use `collMod` instead." This is factually wrong — you can drop and recreate a TTL index with a different `expireAfterSeconds` value. The `collMod` approach is recommended because it avoids a full index rebuild, but saying "cannot" is incorrect. Changed to: "Instead of dropping and recreating the index, use `collMod` to modify `expireAfterSeconds` without rebuilding the index."

## Review Notes
- The limitation "Sharded collections: TTL deletion only runs on the primary" is technically correct but could be clearer — TTL deletion runs only on primary members in all replica sets, not just sharded collections. In a sharded cluster, it runs on the primary of each shard independently. This is accurate but the phrasing may imply it's specific to sharding.
- All `expireAfterSeconds` calculations were verified correct (30 days = 2592000, 24 hours = 86400, 1 hour = 3600, 90 days = 7776000, 15 minutes = 900, 7 days = 604800).
- The TTL monitor default interval of ~60 seconds is correct and well-documented.
