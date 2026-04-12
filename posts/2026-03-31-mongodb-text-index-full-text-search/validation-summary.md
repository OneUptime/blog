# Validation Summary: How to Create a Text Index in MongoDB for Full-Text Search

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- MongoDB (text indexes, `$text` operator, `$meta` projection)
- MongoDB Node.js Driver
- JavaScript / Node.js

## Sources Consulted
- MongoDB Manual: Text Indexes — https://www.mongodb.com/docs/manual/core/index-text/
- MongoDB Manual: $text operator — https://www.mongodb.com/docs/manual/reference/operator/query/text/
- MongoDB Manual: $meta (textScore) — https://www.mongodb.com/docs/manual/reference/operator/aggregation/meta/
- MongoDB Node.js Driver API: Collection.find() — https://mongodb.github.io/node-mongodb-native/6.0/classes/Collection.html#find

## Issues Found
1. **Node.js `find()` projection argument** (line ~145-148): The second argument to `collection.find()` in the Node.js driver is a `FindOptions` object, not a raw projection document. The code passed `{ score: { $meta: "textScore" } }` directly, which would be interpreted as options (not projection) and silently ignored, causing `doc.score` to be `undefined` and `doc.score.toFixed(2)` to throw a TypeError. Fixed by wrapping in `{ projection: { score: { $meta: "textScore" } } }`. Note: the MongoDB shell examples earlier in the post correctly use the shell's `find(filter, projection)` signature — this issue only affected the Node.js driver code.

## Review Notes
- The best practices bullet "case-insensitive searches are handled automatically by stemming" is a minor simplification — case insensitivity in text indexes is actually handled by case folding during tokenization, which is a separate step from stemming (which reduces words to root forms). The practical claim is correct (text search is case-insensitive), but the mechanism attribution is slightly imprecise.
- The post correctly notes the one-text-index-per-collection limitation and the recommendation to use Atlas Search for advanced features.
- All MongoDB shell syntax is correct and follows current documentation.
