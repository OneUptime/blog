# Validation Summary: How to Create a Case-Insensitive Index Using Collation in MongoDB

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- MongoDB (collation feature, available since MongoDB 3.4)
- MongoDB Shell (mongosh) JavaScript syntax
- MongoDB indexing and query optimization

## Sources Consulted
- MongoDB official documentation on Collation: https://www.mongodb.com/docs/manual/reference/collation/
- MongoDB official documentation on createIndex: https://www.mongodb.com/docs/manual/reference/method/db.collection.createIndex/
- MongoDB official documentation on Case Insensitive Indexes: https://www.mongodb.com/docs/manual/core/index-case-insensitive/
- ICU Collation Strength Levels specification (used by MongoDB internally)

## Issues Found
- **Collation Strength Reference table had incorrect punctuation claims.** The original table stated that strength 1 ignores "Case, accents, punctuation" and strength 3 ignores "Punctuation." This is incorrect. Punctuation handling in MongoDB collation is controlled by the `alternate` option (default: `"non-ignorable"`), not by the `strength` level. At the default `alternate` setting, punctuation is considered at all strength levels. Fixed the table to remove the punctuation references: strength 1 now correctly says it ignores "Case, accents", and strength 3 is labeled as the default and shows "Minor variants only" for what it ignores.

## Review Notes
- All code examples use correct MongoDB shell syntax and would work as described.
- The explanation of `strength: 2` behavior (case-insensitive, accent-sensitive) is accurate.
- The note about needing to specify matching collation on queries for index usage is correct and important.
- The collection-level default collation section is accurate — indexes and queries inherit the collection's collation.
- The unique index with collation example correctly demonstrates case-insensitive uniqueness enforcement.
- The explain output guidance is a reasonable simplification; in newer MongoDB versions using the SBE query engine, the explain output structure may differ slightly, but the general approach is valid.
