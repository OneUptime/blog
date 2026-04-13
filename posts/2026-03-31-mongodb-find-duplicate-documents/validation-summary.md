# Validation Summary: How to Find Duplicate Documents in MongoDB

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- MongoDB aggregation pipeline (`$group`, `$match`, `$sort`, `$project`)
- MongoDB `$push` and `$$ROOT` accumulators
- MongoDB `$sum` accumulator
- MongoDB unique indexes
- MongoDB collation (case-insensitive uniqueness)
- mongosh (MongoDB Shell) JavaScript

## Sources Consulted
- MongoDB $group aggregation stage documentation: https://www.mongodb.com/docs/manual/reference/operator/aggregation/group/
- MongoDB $push accumulator documentation: https://www.mongodb.com/docs/manual/reference/operator/aggregation/push/
- MongoDB $match aggregation stage documentation: https://www.mongodb.com/docs/manual/reference/operator/aggregation/match/
- MongoDB $sort aggregation stage documentation: https://www.mongodb.com/docs/manual/reference/operator/aggregation/sort/
- MongoDB createIndex / unique index documentation: https://www.mongodb.com/docs/manual/core/index-unique/
- MongoDB collation documentation: https://www.mongodb.com/docs/manual/reference/collation/
- MongoDB deleteMany documentation: https://www.mongodb.com/docs/manual/reference/method/db.collection.deleteMany/

## Issues Found
1. **Missing `$sort` before `$group` in "Deleting Duplicates" section.** The post claimed the code would "remove all but the first (lowest ObjectId)" but `$push` within `$group` does not guarantee array element order without a preceding `$sort` stage. Without sorting by `_id: 1` before grouping, the first element in the `ids` array is not necessarily the lowest ObjectId. Added `{ $sort: { _id: 1 } }` as the first pipeline stage to ensure deterministic ordering.

## Review Notes
- The `$$ROOT` usage in the "Duplicates Across Multiple Fields" section could consume significant memory for large collections with many duplicates, since it pushes entire documents into arrays. The summary's mention of `allowDiskUse: true` partially addresses this, but it could be noted earlier for the `$$ROOT` examples as well.
- The `totalDuplicateRecords` field in the "Count Total Duplicate Records" section counts all documents in duplicate groups (including the one that would be kept), not just the extra copies. This is not incorrect but could be misleading depending on interpretation. Left as-is since the code is technically accurate.
