# Validation Summary: How to Use TTL Indexes for Automatic Document Expiration in MongoDB

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- MongoDB (TTL indexes, `createIndex`, `collMod`, `getIndexes`, `serverStatus`)
- JavaScript (MongoDB shell syntax)

## Sources Consulted
- MongoDB official documentation: TTL Indexes — https://www.mongodb.com/docs/manual/core/index-ttl/
- MongoDB official documentation: `collMod` command — https://www.mongodb.com/docs/manual/reference/command/collMod/
- MongoDB official documentation: `db.collection.createIndex()` — https://www.mongodb.com/docs/manual/reference/method/db.collection.createIndex/
- MongoDB official documentation: `serverStatus` metrics — https://www.mongodb.com/docs/manual/reference/command/serverStatus/

## Issues Found
No technical issues found.

## Review Notes
- Starting in MongoDB 6.0, it is possible to convert an existing non-TTL single-field index to a TTL index using `collMod` by adding `expireAfterSeconds`. The post states "You cannot convert a regular index to a TTL index," which was true prior to 6.0 and remains a reasonable general caution, but readers on MongoDB 6.0+ should be aware of this capability.
- The OTP example comment says "expired docs are already gone," but as the post correctly notes in the "Understanding the Deletion Frequency" section, there can be a delay of 60+ seconds. The OTP pattern is still valid since application-level TTL checks should supplement the TTL index for time-sensitive verification, which the post appropriately advises.
- The post's claim about "downtime" when dropping and recreating indexes on large collections is slightly imprecise — the real concern is that documents won't be auto-expired during the rebuild period, not necessarily server downtime. The recommendation to use `collMod` instead is correct regardless.
