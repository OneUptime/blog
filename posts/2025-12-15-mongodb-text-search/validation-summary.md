# Validation Summary: How to Use MongoDB Text Search

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- MongoDB text indexes
- MongoDB `$text` queries
- MongoDB aggregation pipelines
- MongoDB Node.js driver query patterns
- MongoDB Atlas Search

## Sources Consulted
- MongoDB Manual: Text Indexes on Self-Managed Deployments - https://www.mongodb.com/docs/manual/core/indexes/index-types/index-text/
- MongoDB Manual: Text Index Restrictions on Self-Managed Deployments - https://www.mongodb.com/docs/manual/core/indexes/index-types/index-text/text-index-restrictions/
- MongoDB Manual: `$text` query predicate operator - https://www.mongodb.com/docs/manual/reference/operator/query/text/
- MongoDB Manual: `$text` in the Aggregation Pipeline - https://www.mongodb.com/docs/manual/tutorial/text-search-in-aggregation/
- MongoDB Manual: `$meta` expression operator - https://www.mongodb.com/docs/manual/reference/operator/aggregation/meta/
- MongoDB Manual: `$text` Query Languages - https://www.mongodb.com/docs/manual/reference/text-search-languages/
- MongoDB Manual: `$listSearchIndexes` aggregation stage - https://www.mongodb.com/docs/manual/reference/operator/aggregation/listsearchindexes/
- MongoDB Node.js Driver: Specify Which Fields to Return - https://www.mongodb.com/docs/drivers/node/current/crud/query/project/
- MongoDB Manual: `db.collection.find()` projection behavior - https://www.mongodb.com/docs/manual/reference/method/db.collection.find/
- MongoDB Manual: `$literal` expression operator - https://www.mongodb.com/docs/manual/reference/operator/aggregation/literal/

## Issues Found
- The supported-languages section used `db.adminCommand({ listSearchIndexes: "articles" })` to check available languages. That command is not a valid way to list `$text` languages, and `$listSearchIndexes` is for MongoDB Search indexes. Replaced it with `db.articles.getIndexes()` so the example accurately lists collection index details.
- The aggregation pipeline comment said the `$text` `$match` stage must be "first or early". MongoDB requires a `$match` stage containing `$text` to be the first pipeline stage. Updated the comment to "must be first".
- The phrase-and-word search comment did not mention MongoDB's exact-string behavior. When a `$search` string includes an exact phrase plus individual terms, MongoDB only matches documents containing the phrase. Updated the comment to clarify that the phrase must match.
- The Node.js driver examples passed projection documents as the second argument to `find()`. In the current Node.js driver, the second argument is an options object, so projections should be nested under `projection`. Updated the autocomplete and multi-collection examples.
- The autocomplete example used `escapeRegex()` without defining it. Added a small helper so the example is runnable and safely escapes user input before building the prefix regex.
- The compound text index optimization comment implied the compound index was generally better. MongoDB requires equality predicates on prefix fields before the text key when using a compound text index. Updated the comment to include that condition.

## Review Notes
MongoDB documentation now recommends MongoDB Search / Atlas Search for richer full-text search features, but MongoDB `$text` indexes remain supported in Atlas, Enterprise, and Community deployments. The post's comparison with Atlas Search is appropriate, and the remaining examples are accurate for standard MongoDB text search usage.
