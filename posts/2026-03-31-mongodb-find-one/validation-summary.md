# Validation Summary: How to Find a Single Document in MongoDB with findOne()

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- MongoDB (mongosh shell)
- `db.collection.findOne()` method
- MongoDB query filters and projections

## Sources Consulted
- MongoDB official documentation for `db.collection.findOne()`: https://www.mongodb.com/docs/manual/reference/method/db.collection.findOne/
- MongoDB official documentation for `db.collection.find()`: https://www.mongodb.com/docs/manual/reference/method/db.collection.find/
- MongoDB projection documentation: https://www.mongodb.com/docs/manual/tutorial/project-fields-from-query-results/

## Issues Found
1. **Description metadata mentioned "sort options"**: The post description stated "with filter expressions, projections, and sort options" but `findOne()` in mongosh does not accept sort options — its signature is `db.collection.findOne(filter, projection)`. The post itself correctly noted this limitation in the comparison table ("Cannot chain .sort() or .limit()") and in the summary. Fixed by removing "and sort options" from the description to make it consistent with the post's own content and the official MongoDB documentation.

## Review Notes
- The comparison table states that `find()` "Scans all matching documents" which is a simplification — `find()` returns a lazy cursor and doesn't eagerly scan all matches. This is acceptable as a pedagogical simplification in a comparison table for beginners.
- The login check example compares password hashes via direct string comparison, which is not a security best practice (bcrypt/scrypt comparison should be used in real applications). However, this is acceptable since the post is about `findOne()` usage, not authentication patterns.
- All code examples use valid mongosh syntax and would execute correctly.
