# Validation Summary: How to Avoid Using Regex Without Anchors for Queries in MongoDB

## Status
validated

## Post Type
Tutorial / Best Practices Guide

## Technologies Covered
- MongoDB (query engine, indexing, regex, text indexes, collation)
- JavaScript (MongoDB shell syntax)

## Sources Consulted
- MongoDB $regex operator documentation: https://www.mongodb.com/docs/manual/reference/operator/query/regex/
- MongoDB case-insensitive indexes documentation: https://www.mongodb.com/docs/manual/core/index-case-insensitive/
- MongoDB text indexes documentation: https://www.mongodb.com/docs/manual/core/index-text/
- MongoDB explain() documentation: https://www.mongodb.com/docs/manual/reference/method/cursor.explain/
- MongoDB JIRA SERVER-29865 (regex + collation): https://jira.mongodb.org/browse/SERVER-29865

## Issues Found
1. **Case-insensitive regex with collation index (lines 89-100)**: The original post claimed that using `.collation({ locale: "en", strength: 2 })` on a regex query with the `/i` flag would allow the query to use a collation index. This is incorrect. `$regex` does not support collation and cannot use collation indexes — this is a documented limitation confirmed by MongoDB (SERVER-29865, closed as "Works as Designed"). The example was changed to show the correct approach: avoid regex entirely and use string comparison with a collation index instead. The claim that this only affected "older MongoDB versions" was also removed, since it applies to all versions.

## Review Notes
- The suggestion to use text indexes for mid-string searches is reasonable for word-based searches but worth noting that text indexes perform word/term matching with stemming, not arbitrary substring matching. If a user needs true substring matching (e.g., finding "ABC" within "XYZABCDEF"), text indexes won't help — they would need Atlas Search with wildcard or regex capabilities instead.
- The `explain()` output structure (`winningPlan.stage`) varies between MongoDB versions. In MongoDB 5.0+ with the slot-based execution engine (SBE), the path may be `queryPlanner.winningPlan.queryPlan.stage`. The post's simplified reference is acceptable for a general guide.
- All code examples use correct MongoDB shell syntax and the index/query patterns are accurate.
