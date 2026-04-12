# Validation Summary: How to Use Collation for Locale-Specific Queries in MongoDB

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- MongoDB (collation feature, available since MongoDB 3.4)
- ICU Collation (International Components for Unicode)
- MongoDB Shell (mongosh)

## Sources Consulted
- MongoDB Collation documentation: https://www.mongodb.com/docs/manual/reference/collation/
- MongoDB `createIndex` with collation: https://www.mongodb.com/docs/manual/reference/method/db.collection.createIndex/#std-label-createIndex-collation-option
- MongoDB `createCollection` with collation: https://www.mongodb.com/docs/manual/reference/method/db.createCollection/
- MongoDB Aggregation with collation: https://www.mongodb.com/docs/manual/reference/method/db.collection.aggregate/
- ICU Collation strength levels: https://unicode-org.github.io/icu/userguide/collation/concepts.html

## Issues Found
- **Accent-insensitive search comment missing accented characters**: The comment on the accent-insensitive search example listed `"resume", "resume", "Resume"` — the first two strings were identical and none contained accents. Changed the first to `"résumé"` to properly demonstrate that strength 1 matches across accented and unaccented variants.

## Review Notes
- The collation document example shows `strength: 2` while the text correctly notes that `3` is the default. This is fine as an example but readers should note the example is not showing all defaults.
- The post does not mention the `maxVariable` or `normalization` collation fields, which is acceptable for an introductory tutorial.
- All MongoDB shell syntax is correct for both the legacy `mongo` shell and modern `mongosh`.
- The claim that queries without a matching collation index require a collection scan is accurate — a regular index on the same field cannot be used if the query specifies a different collation.
