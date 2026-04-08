# Validation Summary: How to Use the createIndexes Command in MongoDB

## Status
validated

## Post Type
Tutorial / Reference Guide

## Technologies Covered
- MongoDB (createIndexes command, shell helpers)
- mongosh (createIndex, createIndexes, getIndexes, listIndexes, dropIndex, hideIndex, unhideIndex)
- MongoDB index types: single-field, compound, unique, sparse, TTL, partial, text, wildcard, collation

## Sources Consulted
- MongoDB official documentation: db.collection.createIndex() — https://www.mongodb.com/docs/manual/reference/method/db.collection.createIndex/
- MongoDB official documentation: createIndexes command — https://www.mongodb.com/docs/manual/reference/command/createIndexes/
- MongoDB official documentation: Index Types — https://www.mongodb.com/docs/manual/indexes/
- MongoDB official documentation: Wildcard Indexes — https://www.mongodb.com/docs/manual/core/index-wildcard/
- MongoDB official documentation: TTL Indexes — https://www.mongodb.com/docs/manual/core/index-ttl/
- MongoDB official documentation: Text Indexes — https://www.mongodb.com/docs/manual/core/index-text/
- MongoDB official documentation: Hidden Indexes — https://www.mongodb.com/docs/manual/core/index-hidden/
- MongoDB official documentation: Partial Indexes — https://www.mongodb.com/docs/manual/core/index-partial/
- MongoDB official documentation: Index Build on Populated Collections — https://www.mongodb.com/docs/manual/core/index-creation/

## Issues Found
No technical issues found.

## Review Notes
- The phrase "index builds run in the background in MongoDB 4.2+" is slightly imprecise. In MongoDB 4.2+, the old `background` index build option was deprecated and ignored. All index builds now use an optimized hybrid build process that holds an exclusive lock only at the start and end, yielding to reads and writes during the bulk of the build. This is not the same as the old "background" mode, but the practical effect (non-blocking builds that can be monitored via `currentOp`) is correctly conveyed. This is a minor nuance and does not constitute an error.
- Hidden indexes (hideIndex/unhideIndex) require MongoDB 4.4+. The post does not mention this version requirement, which could be worth noting in a future update.
- The `$in` operator used in the `partialFilterExpression` example is valid for partial indexes starting in MongoDB 3.6+.
