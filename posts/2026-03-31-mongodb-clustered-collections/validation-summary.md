# Validation Summary: How to Use Clustered Collections in MongoDB

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- MongoDB (5.3+)
- Clustered Collections
- TTL (Time-To-Live) indexes
- WiredTiger storage engine (implicit)

## Sources Consulted
- MongoDB official documentation: Clustered Collections — https://www.mongodb.com/docs/manual/core/clustered-collections/
- MongoDB official documentation: `db.createCollection()` — https://www.mongodb.com/docs/manual/reference/method/db.createCollection/
- MongoDB official documentation: `create` command — https://www.mongodb.com/docs/manual/reference/command/create/

## Issues Found
1. **Incorrect TTL date type claim (line 61)**: The post stated that for TTL to work on a clustered collection, the `_id` field must be "a BSON date or a date embedded in a BSON ObjectId." The official MongoDB documentation states `_id` must be a "supported date type" for TTL to function. ObjectId is not a date type — it merely contains a 4-byte timestamp prefix. Changed to: "the `_id` field must be a supported date type such as a BSON `Date`."

## Review Notes
- The `name` field in the `clusteredIndex` option is optional per the docs, but the post uses it in examples without claiming it is required. This is fine.
- The claim about secondary indexes storing a reference to the cluster key rather than a physical RecordId is not explicitly stated in the docs in those terms, but is strongly implied by the documented behavior that secondary indexes on clustered collections with large cluster keys have larger storage. The explanation is accurate.
- The post correctly notes that clustered collections were introduced in MongoDB 5.3 and that capped collections cannot be clustered.
- All code examples use correct syntax and would work as described.
