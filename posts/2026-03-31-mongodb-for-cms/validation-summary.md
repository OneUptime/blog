# Validation Summary: How to Use MongoDB for Content Management Systems

## Status
validated

## Post Type
Tutorial / Schema Design Guide

## Technologies Covered
- MongoDB (shell commands and Node.js driver)
- MongoDB Aggregation Framework
- MongoDB Text Indexes
- Mermaid diagrams

## Sources Consulted
- MongoDB documentation on `insertOne()`: https://www.mongodb.com/docs/manual/reference/method/db.collection.insertOne/
- MongoDB documentation on `createIndex()`: https://www.mongodb.com/docs/manual/reference/method/db.collection.createIndex/
- MongoDB documentation on text indexes: https://www.mongodb.com/docs/manual/core/indexes/index-types/index-text/
- MongoDB documentation on `$text` query operator: https://www.mongodb.com/docs/manual/reference/operator/query/text/
- MongoDB documentation on `$meta` (textScore): https://www.mongodb.com/docs/manual/reference/operator/aggregation/meta/
- MongoDB documentation on `$inc` update operator: https://www.mongodb.com/docs/manual/reference/operator/update/inc/
- MongoDB documentation on aggregation pipeline stages (`$match`, `$sort`, `$limit`, `$project`, `$group`): https://www.mongodb.com/docs/manual/reference/operator/aggregation-pipeline/
- MongoDB documentation on multikey indexes (for array fields like `tags`): https://www.mongodb.com/docs/manual/core/indexes/index-types/index-multikey/

## Issues Found
- **Mermaid diagram inconsistent with code**: The original diagram showed separate `articles collection` and `pages collection` nodes, but all code examples use a single `content` collection with a `type` field to distinguish content types. The diagram also showed `Tags[Embedded in content]` as a top-level node (misleadingly similar to a collection) and omitted the `content_versions` collection used in the versioning section. Fixed the diagram to show `content collection`, `media collection`, `authors collection`, and `content_versions collection`, accurately reflecting the schema design in the code.

## Review Notes
- The `ObjectId("...")` placeholder syntax used throughout is standard blog convention, though `"..."` is not a valid ObjectId hex string. This is acceptable for illustrative purposes.
- The versioning function uses `ObjectId(contentId)` without the `new` keyword. In MongoDB Node.js driver v6+ (BSON 6.x), calling `ObjectId()` without `new` throws a TypeError. Since the post doesn't target a specific driver version and the code is illustrative, this was left as-is, but readers using driver v6+ should use `new ObjectId()`.
- The "Top 10 most viewed articles this month" aggregation filters by `publishedAt >= startOfMonth`, so it actually returns the most viewed articles *published* this month, not articles with the most views *during* this month (which would require a separate analytics collection with timestamped view events). This is a reasonable design choice but worth noting.
- A collection can only have one text index. The text index `{ title: "text", "blocks.text": "text" }` is defined in both the "Full-text search" section and the "Indexes" section. Creating it twice is harmless (MongoDB recognizes it as the same index), but readers should be aware of the one-text-index-per-collection limitation.
