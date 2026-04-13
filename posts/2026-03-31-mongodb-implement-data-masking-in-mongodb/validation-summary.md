# Validation Summary: How to Implement Data Masking in MongoDB

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- MongoDB (aggregation pipeline, views, roles)
- Node.js / Express.js (application-level masking middleware)
- @faker-js/faker (test data generation)

## Sources Consulted
- MongoDB $substr / $substrBytes documentation: https://www.mongodb.com/docs/manual/reference/operator/aggregation/substr/
- MongoDB $substrCP documentation: https://www.mongodb.com/docs/manual/reference/operator/aggregation/substrCP/
- MongoDB $strLenCP documentation: https://www.mongodb.com/docs/manual/reference/operator/aggregation/strLenCP/
- MongoDB $out documentation: https://www.mongodb.com/docs/manual/reference/operator/aggregation/out/
- MongoDB $addFields documentation: https://www.mongodb.com/docs/manual/reference/operator/aggregation/addFields/
- MongoDB $rand documentation: https://www.mongodb.com/docs/manual/reference/operator/aggregation/rand/
- MongoDB createView documentation: https://www.mongodb.com/docs/manual/reference/method/db.createView/
- MongoDB createRole documentation: https://www.mongodb.com/docs/manual/reference/method/db.createRole/
- @faker-js/faker API reference: https://fakerjs.dev/api/

## Issues Found
- **`$substr` with negative index**: The static masking example used `{ $substr: ["$creditCard", -4, 4] }` to extract the last 4 digits of a credit card number. MongoDB's `$substr` (alias for `$substrBytes`) does not support negative start indices — a negative value causes it to return an empty string `""`. Fixed by replacing with `{ $substrCP: ["$creditCard", { $subtract: [{ $strLenCP: "$creditCard" }, 4] }, 4] }`, which correctly calculates the start position from the string length.

## Review Notes
- The `$substr` operator is technically an alias for `$substrBytes` and MongoDB documentation recommends using `$substrBytes` or `$substrCP` instead, but `$substr` still functions correctly with non-negative indices. The other `$substr` usages in the post (zip code truncation, email masking) all use non-negative start indices and are correct.
- The `$out` cross-database syntax (`{ db: "test_db", coll: "users" }`) requires MongoDB 4.4+. This is not called out in the post but is unlikely to be an issue given current MongoDB versions.
- The `$rand` operator also requires MongoDB 4.4.2+.
