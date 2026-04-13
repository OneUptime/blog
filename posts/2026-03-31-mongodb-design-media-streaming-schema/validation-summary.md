# Validation Summary: How to Design a Media Streaming Schema in MongoDB

## Status
validated

## Post Type
Guide

## Technologies Covered
- MongoDB (document model, indexes, compound `_id`, text indexes, multikey indexes)
- HLS video streaming (manifest URL references)
- WebVTT subtitles

## Sources Consulted
- MongoDB Manual: Document `_id` field and custom `_id` values — https://www.mongodb.com/docs/manual/core/document/#the-_id-field
- MongoDB Manual: Indexes on sub-fields of `_id` — https://www.mongodb.com/docs/manual/core/index-compound/
- MongoDB Manual: `createIndex()` method — https://www.mongodb.com/docs/manual/reference/method/db.collection.createIndex/
- MongoDB Manual: Text Indexes — https://www.mongodb.com/docs/manual/core/indexes/index-types/index-text/
- MongoDB Manual: Multikey Indexes — https://www.mongodb.com/docs/manual/core/indexes/index-types/index-multikey/

## Issues Found
1. **Incorrect index field path for playback state "continue watching" query.** The `playbackState` collection uses a compound `_id` of `{ profileId, contentId }`, meaning `profileId` is nested inside `_id`, not a top-level field. The original index `{ profileId: 1, lastWatchedAt: -1 }` would index a non-existent top-level field (all values would be `null`), making the index useless for "continue watching" queries. Fixed to `{ "_id.profileId": 1, lastWatchedAt: -1 }` so it correctly references the nested field within the compound `_id`.

## Review Notes
- The introduction mentions a `reviews` collection as one of the core collections but the post does not include a schema example for it. This is a content gap, not a technical error.
- The `ObjectId()` in the Watchlist JSON block is not valid JSON (it's a JavaScript/BSON constructor), but this is a widespread convention in MongoDB tutorials and documentation, so it was left as-is.
- The claim of "O(1) point reads" for `_id` lookups is a practical simplification; technically B-tree lookups are O(log n), but this is a common and acceptable way to describe near-constant-time indexed lookups in MongoDB.
- All `createIndex()` calls use correct MongoDB syntax. The multikey indexes on array fields (`genres`, `availableRegions`) are valid since each compound index contains at most one array field.
