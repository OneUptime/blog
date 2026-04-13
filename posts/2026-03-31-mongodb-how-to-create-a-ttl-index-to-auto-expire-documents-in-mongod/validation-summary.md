# Validation Summary: How to Create a TTL Index to Auto-Expire Documents in MongoDB

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- MongoDB (TTL indexes, `createIndex`, `collMod`, `serverStatus`)
- JavaScript (MongoDB Shell / `mongosh`)

## Sources Consulted
- MongoDB official documentation: TTL Indexes — https://www.mongodb.com/docs/manual/core/index-ttl/
- MongoDB official documentation: `collMod` command — https://www.mongodb.com/docs/manual/reference/command/collMod/
- MongoDB official documentation: `serverStatus` command — https://www.mongodb.com/docs/manual/reference/command/serverStatus/
- MongoDB official documentation: Index properties and limitations — https://www.mongodb.com/docs/manual/core/index-ttl/#restrictions

## Issues Found
No technical issues found.

## Review Notes
- All code examples use correct `mongosh` syntax and current (non-deprecated) APIs.
- The TTL index creation, `expireAfterSeconds: 0` pattern, `collMod` modification, and `serverStatus` monitoring are all accurately described.
- The limitations section is comprehensive and correct: single-field only, no `_id` field, no capped collections, primary-only TTL monitor, null/missing fields not expired.
- The 90-day audit log calculation (7,776,000 seconds) is arithmetically correct.
- Minor nuance: the limitation "TTL does not work on replica set secondaries" could be slightly more precise — the TTL monitor only runs on the primary, but deletions are replicated to secondaries via the oplog. The parenthetical "(only primary performs deletion)" adequately clarifies the intended meaning.
- The default 60-second TTLMonitor interval is configurable via `ttlMonitorSleepSecs` (MongoDB 4.2+), but omitting this detail is reasonable for a tutorial-level post.
