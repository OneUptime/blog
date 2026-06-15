# Validation Summary: How to Design Multi-Tenant Schemas in MongoDB

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- MongoDB schema design
- MongoDB Node.js driver
- MongoDB indexes and aggregation
- MongoDB sharding and zone sharding
- Express.js middleware patterns

## Sources Consulted
- MongoDB Node.js Driver documentation: https://www.mongodb.com/docs/drivers/node/current/
- MongoDB Node.js Driver CRUD query documentation: https://www.mongodb.com/docs/drivers/node/current/crud/query/retrieve/
- MongoDB Node.js Driver update documentation: https://www.mongodb.com/docs/drivers/node/current/crud/update/modify/
- MongoDB database and collection documentation: https://www.mongodb.com/docs/drivers/node/current/databases-collections/
- MongoDB BSON data documentation: https://www.mongodb.com/docs/drivers/node/current/data-formats/bson/
- MongoDB listDatabases command documentation: https://www.mongodb.com/docs/manual/reference/command/listdatabases/
- MongoDB shard key documentation: https://www.mongodb.com/docs/manual/core/sharding-shard-key/
- MongoDB choose a shard key documentation: https://www.mongodb.com/docs/manual/core/sharding-choose-a-shard-key/
- MongoDB hashed sharding documentation: https://www.mongodb.com/docs/manual/core/hashed-sharding/
- MongoDB zone sharding documentation: https://www.mongodb.com/docs/manual/core/zone-sharding/
- MongoDB sh.addShardToZone() documentation: https://www.mongodb.com/docs/manual/reference/method/sh.addshardtozone/
- MongoDB sh.updateZoneKeyRange() documentation: https://www.mongodb.com/docs/manual/reference/method/sh.updatezonekeyrange/
- MongoDB sh.addShardTag() documentation: https://www.mongodb.com/docs/manual/reference/method/sh.addshardtag/
- MongoDB sh.addTagRange() documentation: https://www.mongodb.com/docs/manual/reference/method/sh.addtagrange/
- MongoDB aggregation stage reference: https://www.mongodb.com/docs/manual/reference/mql/aggregation-stages/
- MongoDB $geoNear documentation: https://www.mongodb.com/docs/manual/reference/operator/aggregation/geonear/
- MongoDB Atlas Search query reference: https://www.mongodb.com/docs/atlas/atlas-search/query-ref/
- MongoDB Vector Search aggregation stage documentation: https://www.mongodb.com/docs/vector-search/query/aggregation-stages/vector-search-stage/

## Issues Found
- The sample document used `ObjectId("...")`, which is not a valid ObjectId literal if copied into runnable Node.js driver code. I replaced it with `new ObjectId(...)` and a valid 24-character hexadecimal ObjectId.
- The database-per-tenant example sanitized tenant IDs when retrieving a database, but deleted the cache entry using the unsanitized tenant ID during deprovisioning. I added a `getDatabaseName()` helper and reused it for both lookup and cache deletion so tenants with characters such as hyphens are handled consistently.
- The zone-sharding example used legacy tag helper names and defined tenant string ranges on `tenantId` after showing `tenantId` as a single-field hashed shard key. I changed the example to current zone helper names, `sh.addShardToZone()` and `sh.updateZoneKeyRange()`, and used a compatible compound shard key with a non-hashed `tenantTier` prefix and a hashed `tenantId` suffix.
- The aggregation guard examples prepended `$match` unconditionally. That works for ordinary pipelines, but it breaks stages that MongoDB requires to be first, such as `$geoNear`, `$search`, `$searchMeta`, and `$vectorSearch`. I added explicit checks that reject those pipelines and direct callers to put tenant filtering inside the first stage instead.

## Review Notes
The remaining examples use current MongoDB Node.js driver CRUD methods and mongosh sharding helpers. In a production system, tenant IDs should come from authenticated authorization context rather than a raw request header, and database-per-tenant naming should use a stable internal tenant identifier to avoid sanitized-name collisions.
