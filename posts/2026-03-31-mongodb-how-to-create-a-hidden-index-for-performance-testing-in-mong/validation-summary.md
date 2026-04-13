# Validation Summary: How to Create a Hidden Index for Performance Testing in MongoDB

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- MongoDB (4.4+ hidden indexes feature)
- MongoDB Shell (mongosh) methods: `createIndex()`, `hideIndex()`, `unhideIndex()`, `getIndexes()`, `dropIndex()`
- MongoDB `collMod` command
- MongoDB `$indexStats` aggregation stage
- MongoDB `explain()` for query plan analysis

## Sources Consulted
- MongoDB Hidden Indexes documentation: https://www.mongodb.com/docs/manual/core/index-hidden/
- MongoDB `hideIndex()` method reference: https://www.mongodb.com/docs/manual/reference/method/db.collection.hideIndex/
- MongoDB `unhideIndex()` method reference: https://www.mongodb.com/docs/manual/reference/method/db.collection.unhideIndex/
- MongoDB `collMod` command reference: https://www.mongodb.com/docs/manual/reference/command/collMod/
- MongoDB `$indexStats` aggregation reference: https://www.mongodb.com/docs/manual/reference/operator/aggregation/indexStats/

## Issues Found
No technical issues found.

## Review Notes
- The claim "Index stats (accesses.ops) are not updated while the index is hidden" is not explicitly stated in the MongoDB docs but is a sound logical inference — since the query planner cannot use a hidden index and `cursor.hint()` on a hidden index is disallowed, there is no code path to increment `accesses.ops`.
- The docs note that hiding/unhiding an index **resets** its `$indexStats`. This is not mentioned in the post and could be a useful addition to the "Practical Workflow" section in a future update, since unhiding an index to restore it will clear accumulated usage stats.
- Hidden unique indexes still enforce uniqueness constraints, and hidden TTL indexes still expire documents. These behaviors are not mentioned but are not errors — just additional details that could enhance the post.
- The `cursor.hint()` restriction (cannot hint a hidden index) is another restriction not listed in the "Hidden Index Restrictions" section but is a minor omission rather than an error.
- While hidden indexes were introduced in MongoDB 4.4, current MongoDB documentation (v8.x) references a `featureCompatibilityVersion` of 6.0 or greater for the feature. The post's "Available in MongoDB 4.4+" is accurate about when the feature was introduced but readers on older MongoDB versions should check fCV requirements.
