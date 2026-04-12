# Validation Summary: How to Refine a Shard Key in MongoDB 4.4+

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- MongoDB 4.4+ (sharding, shard key refinement)
- MongoDB `refineCollectionShardKey` command
- MongoDB `reshardCollection` command (mentioned for comparison, MongoDB 5.0+)
- MongoDB `mongos` router

## Sources Consulted
- MongoDB official documentation: `refineCollectionShardKey` command reference — https://www.mongodb.com/docs/manual/reference/command/refineCollectionShardKey/
- MongoDB official documentation: Refine a Shard Key guide — https://www.mongodb.com/docs/manual/tutorial/refine-shard-key/
- MongoDB official documentation: `reshardCollection` command reference — https://www.mongodb.com/docs/manual/reference/command/reshardCollection/
- MongoDB official documentation: `config.collections` — https://www.mongodb.com/docs/manual/reference/config-database/#mongodb-data-config.collections
- MongoDB GitHub docs source for `refineCollectionShardKey.txt`

## Issues Found

### Issue 1: Incorrect index requirement description (Line 78)
- **What was wrong:** The post stated "The appended fields must form a valid index prefix." This is misleading — the actual requirement is that a supporting index must exist whose *prefix* matches the complete new (refined) shard key, not that the appended fields themselves form a prefix.
- **What was changed:** Replaced with "A supporting index must exist whose prefix matches the complete new (refined) shard key."
- **Why:** The original phrasing reversed the relationship between the index and the shard key. Per MongoDB docs, the supporting index must "start with the new shard key specification; i.e. the index prefix matches the new shard key specification."

### Issue 2: Incorrect claim about hashed shard keys (Line 80)
- **What was wrong:** The post stated "Hashed shard keys cannot be refined." This is incorrect — hashed shard keys CAN be refined by appending suffix fields. The restriction is that you cannot change the hashed/range type of existing shard key fields.
- **What was changed:** Replaced with "Hashed shard keys can be refined by appending suffix fields, but you cannot change the hashed or range type of existing shard key fields."
- **Why:** The MongoDB documentation explicitly allows `"hashed"` as a suffix field value in the refined key specification. The restriction is only on modifying the type of existing fields, which would cause data inconsistencies.

## Review Notes
- The claim that the index "must exist on all shards" is technically imprecise — creating an index via `mongos` automatically propagates to all shards, so users don't need to create it on each shard individually. However, this is not incorrect per se, just potentially confusing.
- Querying `config.collections` to verify the shard key works but MongoDB docs warn that the config database schema is internal and may change between releases. The post does also mention `sh.status()` as a verification method, which is the recommended approach.
- The post's additional index restrictions (no partial indexes, no sparse indexes, simple collation requirement) are not mentioned but are edge cases that don't affect the correctness of the tutorial for the common case.
