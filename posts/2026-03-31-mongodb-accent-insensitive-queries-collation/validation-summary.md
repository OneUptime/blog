# Validation Summary: How to Handle Accent-Insensitive Queries with Collation in MongoDB

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- MongoDB (collation feature)
- Unicode Collation Algorithm (UCA)
- MongoDB Shell (mongosh) commands
- MongoDB indexing with collation

## Sources Consulted
- MongoDB Collation Reference: https://www.mongodb.com/docs/manual/reference/collation/
- MongoDB db.createCollection() Reference: https://www.mongodb.com/docs/manual/reference/method/db.createCollection/
- MongoDB Case-Insensitive Indexes: https://www.mongodb.com/docs/manual/core/index-case-insensitive/
- MongoDB Explain Results (COLLSCAN/IXSCAN terminology): https://www.mongodb.com/docs/manual/reference/explain-results/
- ICU Collation Comparison Levels specification

## Issues Found
- **Strength 2 table row was inverted**: The comparison table incorrectly stated that strength 2 ignores accents (YES) but does not ignore case (NO). According to MongoDB's collation documentation, strength 2 performs comparisons up to secondary differences (diacritics/accents), meaning accents ARE considered at this level, while case (a tertiary difference) is still ignored. The correct values are: strength 2 ignores accents = NO, ignores case = YES. Fixed the table and the accompanying text from "Use strength 2 to ignore accents only (keeps case sensitivity)" to "Use strength 2 to ignore case only (keeps accent sensitivity)."

## Review Notes
- The explanation of the UCA levels (primary, secondary, tertiary) in the "How Accents Map to Collation Levels" section is correct and well-presented.
- The `caseLevel: true` with `strength: 1` section is accurate per MongoDB docs: it adds a case comparison check at strength level 1, making comparisons accent-insensitive but case-sensitive.
- The COLLSCAN/IXSCAN terminology is correct for MongoDB explain output.
- All code examples use valid MongoDB shell syntax.
- The note about needing matching collation on both queries and indexes for index utilization is correct and important.
- The `db.createCollection` syntax with a default collation option is valid.
