# Validation Summary: How to Create a Clustered Collection in MongoDB

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- MongoDB (5.3+)
- Clustered Collections / Clustered Indexes
- MongoDB Shell (mongosh)
- TTL expiration with `expireAfterSeconds`

## Sources Consulted
- MongoDB Manual — Clustered Collections: https://www.mongodb.com/docs/manual/core/clustered-collections/
- MongoDB Manual — db.createCollection(): https://www.mongodb.com/docs/manual/reference/method/db.createCollection/
- MongoDB Manual — TTL Indexes and Clustered Collections: https://www.mongodb.com/docs/manual/core/clustered-collections/#ttl

## Issues Found
- **Secondary index size claim was incorrect (line 84):** The post stated that secondary indexes on clustered collections are "slightly more compact" than on regular collections. This is backwards. Secondary indexes on clustered collections store the full `_id` value as the record locator instead of a compact 8-byte internal RecordId, which can make them slightly *larger* (e.g., 12 bytes for an ObjectId). The overall storage benefit of clustered collections comes from eliminating the separate `_id` index entirely, not from smaller secondary indexes. Fixed the sentence to accurately reflect that secondary indexes may be larger, and clarified where the real storage savings come from.

## Review Notes
- The `name` field in the `clusteredIndex` option is optional. The post uses it in the first example but omits it in the TTL example, which is fine but could confuse readers into thinking it's sometimes required. Not a technical error.
- The table entry "Random `_id` lookups dominate — No (no benefit)" is a reasonable simplification. There is a marginal benefit (no separate index traversal), but the primary advantage of clustered collections is for range scans, so the guidance is sound.
- All code examples use correct syntax and would work as shown in mongosh.
