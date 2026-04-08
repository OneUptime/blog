# Validation Summary: How to Perform Case-Insensitive Queries Using Collation in MongoDB

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- MongoDB (collation feature)
- MongoDB Shell (mongosh)
- MongoDB Aggregation Framework

## Sources Consulted
- MongoDB Manual: Collation — https://www.mongodb.com/docs/manual/reference/collation/
- MongoDB Manual: db.collection.find() — https://www.mongodb.com/docs/manual/reference/method/db.collection.find/
- MongoDB Manual: db.collection.createIndex() — https://www.mongodb.com/docs/manual/reference/method/db.collection.createIndex/
- MongoDB Manual: Case Insensitive Indexes — https://www.mongodb.com/docs/manual/core/index-case-insensitive/
- ICU Collation Strength Levels — https://unicode-org.github.io/icu/userguide/collation/concepts.html

## Issues Found
1. **Collation strength table had case and accents swapped for strengths 2-4.** Strength 2 was described as "Base + case (ignores accents only)" but it actually compares base characters and accents while ignoring case. The correct description is "Base + accents (ignores case)." Strengths 3 and 4 were similarly reordered to list accents before case, matching the ICU collation specification. The explanatory text below the table was already correct — only the table itself was wrong.

2. **Removed confusing wrong-then-correct code pattern.** The post originally showed an incorrect `db.users.find()` call with collation passed as the second argument (which is the projection parameter), then immediately said "Wait" and corrected it. This anti-pattern is confusing for readers who might copy the wrong version. Replaced with a single correct example using the `.collation()` cursor method.

## Review Notes
- The post's claim that case-insensitive regex "cannot use a standard index efficiently" is a simplification. MongoDB can use an index for case-insensitive regex in some cases, but not with full prefix optimization. The phrasing is acceptable for a tutorial.
- All other code examples (createIndex with collation, explain(), unique index, aggregation collation option) are syntactically correct and match current MongoDB documentation.
