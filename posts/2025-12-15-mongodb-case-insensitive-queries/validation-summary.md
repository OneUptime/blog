# Validation Summary: How to Do Case-Insensitive Queries in MongoDB

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- MongoDB queries
- MongoDB regex predicates
- MongoDB collations and indexes
- MongoDB text indexes and `$text`
- MongoDB aggregation with `$toLower`
- Mongoose schema middleware
- JavaScript string normalization

## Sources Consulted
- MongoDB Manual: Case-Insensitive Indexes - https://www.mongodb.com/docs/manual/core/index-case-insensitive/
- MongoDB Manual: `$regex` query predicate operator - https://www.mongodb.com/docs/manual/reference/operator/query/regex/
- MongoDB Manual: Collation - https://www.mongodb.com/docs/manual/reference/collation/
- MongoDB Manual: Text Index Properties - https://www.mongodb.com/docs/manual/core/indexes/index-types/index-text/text-index-properties/
- MongoDB Manual: `$text` query predicate operator - https://www.mongodb.com/docs/manual/reference/operator/query/text/
- MongoDB Manual: `$toLower` aggregation expression - https://www.mongodb.com/docs/manual/reference/operator/aggregation/tolower/
- MongoDB Manual: `db.createCollection()` collation behavior - https://www.mongodb.com/docs/manual/reference/method/db.createcollection/
- Mongoose Docs: Middleware - https://mongoosejs.com/docs/middleware.html

## Issues Found
- The post implied that anchored case-insensitive regex queries can use an index prefix scan efficiently. MongoDB documents prefix index optimization for case-sensitive regex queries, while case-insensitive regex queries are not collation-aware and cannot use case-insensitive collation indexes. Updated the diagram, performance warning, and comparison table to reflect that distinction.
- The aggregation `$toLower` section did not mention MongoDB's documented ASCII-only guarantee. Added a short caveat that `$toLower` is best for ASCII strings.
- The Turkish casing pitfall used an inaccurate simplified comment. Reworded it to state that `"i"` and `"I"` are not a simple lowercase/uppercase pair in Turkish and kept the guidance to use the appropriate locale.

## Review Notes
The remaining examples are technically valid for current MongoDB and Mongoose usage. For future improvement, the text index section could mention MongoDB's current recommendation to use MongoDB Search indexes for richer full-text search where Atlas Search is available, but the existing `$text` examples are still valid.
