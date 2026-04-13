# Validation Summary: How to Handle API Versioning with MongoDB Schema Changes

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- MongoDB (document schema versioning, indexes, cursors, `updateOne`, `createIndex`)
- Node.js / Express.js (routing, middleware, REST API patterns)
- Mongoose ODM (`find`, `findById`, `lean`, `cursor`, `toObject`, `updateOne`)
- HTTP headers (Deprecation, Sunset per RFC 8594 / RFC 8594-related drafts, Link with `successor-version` relation per RFC 5829)

## Sources Consulted
- MongoDB documentation on `updateOne` and the immutability of the `_id` field: https://www.mongodb.com/docs/manual/reference/method/db.collection.updateOne/
- MongoDB documentation on `createIndex`: https://www.mongodb.com/docs/manual/reference/method/db.collection.createIndex/
- Express.js documentation on routing and middleware: https://expressjs.com/en/guide/routing.html
- Mongoose documentation on cursors: https://mongoosejs.com/docs/api/query.html#Query.prototype.cursor()
- RFC 8594 (Sunset Header): https://datatracker.ietf.org/doc/html/rfc8594
- IETF draft-ietf-httpapi-deprecation-header (Deprecation Header)
- RFC 5829 (Link Relation Types for Simple Version Navigation): https://datatracker.ietf.org/doc/html/rfc5829
- Calendar verification for day-of-week calculation (December 31, 2026 is a Thursday)

## Issues Found

1. **Incorrect day-of-week in Sunset header** (line 168): The Sunset header value was `Sat, 31 Dec 2026 23:59:59 GMT`, but December 31, 2026 is a Thursday, not a Saturday. Fixed to `Thu, 31 Dec 2026 23:59:59 GMT`. An incorrect day-of-week in an HTTP-date is a violation of the IMF-fixdate format (RFC 7231 Section 7.1.1.1) and could cause strict parsers to reject the header.

2. **Lazy migration using `$set` with full document object** (lines 119-120): The lazy migration code used `$set: migrated` where `migrated` was the result of spreading the full document (including `_id`). On MongoDB 4.0+, attempting to `$set` the `_id` field — even to the same value — raises an error: "Performing an update on the path '_id' would modify the immutable field '_id'". Fixed to use specific fields (`address` and `schemaVersion`), consistent with the bulk migration example already shown in the post.

## Review Notes
- The `toV1` transform uses `typeof doc.address === 'object'`, which is true for `null` in JavaScript (`typeof null === 'object'`). In a production implementation, an additional null check would be prudent, but this is acceptable for a pattern demonstration.
- The Deprecation header value `true` is used. The evolving IETF draft (draft-ietf-httpapi-deprecation-header) specifies Structured Field Values where the boolean form is `?1`, but `true` is widely used in practice and acceptable for this tutorial context.
- The `toV1` transform returns the full document including `schemaVersion: 2` even when reshaping for the v1 API. This is a design choice (transform is read-only for API responses) and not a technical error, but readers building production APIs may want to omit or override `schemaVersion` in v1 responses.
- All Express.js patterns (router mounting, middleware chaining, `res.set` for headers) are correct and current.
- The cursor-based bulk migration pattern with `for await...of` is correct and recommended for large collections to avoid loading all documents into memory.
