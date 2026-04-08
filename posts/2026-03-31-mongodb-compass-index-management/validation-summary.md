# Validation Summary: How to Use MongoDB Compass for Index Management

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- MongoDB (4.2+ and 4.4+ features referenced)
- MongoDB Compass (GUI)
- mongosh (shell commands shown as equivalents)

## Sources Consulted
- MongoDB Manual: Index Build Process on Replica Sets — https://www.mongodb.com/docs/manual/core/index-creation/#index-builds-in-replicated-environments
- MongoDB Manual: createIndex — https://www.mongodb.com/docs/manual/reference/method/db.collection.createIndex/
- MongoDB Manual: TTL Indexes — https://www.mongodb.com/docs/manual/core/index-ttl/
- MongoDB Manual: Hidden Indexes — https://www.mongodb.com/docs/manual/core/index-hidden/
- MongoDB Manual: Partial Indexes — https://www.mongodb.com/docs/manual/core/index-partial/
- MongoDB Manual: Text Indexes — https://www.mongodb.com/docs/manual/core/indexes/index-types/index-text/
- MongoDB Manual: Explain Results — https://www.mongodb.com/docs/manual/reference/explain-results/
- MongoDB Compass Documentation: Indexes Tab — https://www.mongodb.com/docs/compass/current/indexes/

## Issues Found
- **Replica set index build description was inaccurate.** The post stated indexes "build on the primary first, then replicate to secondaries in a rolling fashion." Starting in MongoDB 4.4, index builds are simultaneous across all data-bearing replica set members. The primary sends a `startIndexBuild` oplog entry, secondaries begin building at the same time, and each member votes to commit when done. The primary commits once a quorum of votes is reached. "Rolling index builds" is a separate, manual procedure. Updated the sentence to accurately describe the simultaneous build and quorum-based commit process.

## Review Notes
- All JavaScript/mongosh code examples are syntactically correct and use current, non-deprecated APIs.
- The ESR (Equality, Sort, Range) rule explanation is correct and concise.
- The Compass UI descriptions (Indexes tab columns, Create Index form options) accurately reflect current Compass versions.
- The `collMod` command for unhiding indexes uses the correct syntax.
- Explain plan metrics (nReturned, totalDocsExamined, totalKeysExamined) are correctly named and described.
- The note about MongoDB 4.2 unifying foreground/background index builds is accurate.
