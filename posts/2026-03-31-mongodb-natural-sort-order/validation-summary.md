# Validation Summary: How to Use the $natural Sort Order in MongoDB

## Status
validated

## Post Type
Tutorial / Reference Guide

## Technologies Covered
- MongoDB (query language, shell commands)
- MongoDB `$natural` sort and hint
- Capped collections
- WiredTiger storage engine
- Tailable cursors
- mongosh (MongoDB Shell)

## Sources Consulted
- MongoDB official documentation: `cursor.sort()` and `$natural` — https://www.mongodb.com/docs/manual/reference/operator/meta/natural/
- MongoDB official documentation: Capped Collections — https://www.mongodb.com/docs/manual/core/capped-collections/
- MongoDB official documentation: `cursor.hint()` — https://www.mongodb.com/docs/manual/reference/method/cursor.hint/
- MongoDB official documentation: Tailable Cursors — https://www.mongodb.com/docs/manual/core/tailable-cursors/
- MongoDB official documentation: WiredTiger Storage Engine — https://www.mongodb.com/docs/manual/core/wiredtiger/
- MongoDB official documentation: `cursor.tailable()` in mongosh — https://www.mongodb.com/docs/manual/reference/method/cursor.tailable/

## Issues Found

1. **Incorrect WiredTiger "padding" claim (line 78)**: The post stated "With WiredTiger (the default storage engine), documents are stored with padding and `$natural` order is generally stable but not guaranteed." WiredTiger does not use document-level padding like MMAPv1 did. WiredTiger uses a B-tree storage model where updated documents may be written to different internal locations. Changed to accurately describe WiredTiger behavior without the incorrect padding reference.

2. **Incorrect selectivity terminology (line 91)**: The post listed "very high selectivity" as a situation where a full collection scan is faster than an index scan. In standard database terminology, high selectivity means few documents match the query — exactly when an index is most beneficial. A collection scan is faster when most documents match (low selectivity). Changed to the unambiguous phrasing "when the query matches most documents."

3. **Deprecated tailable cursor API (lines 116-122)**: The code example used `db.eventLog.find({}).addOption(DBQuery.Option.tailable)`, which is a legacy `mongo` shell API. Since MongoDB 5.0+, the default shell is `mongosh`, where `DBQuery` does not exist. Updated to use the modern `cursor.tailable()` method available in `mongosh`.

## Review Notes
- The post correctly notes that `$natural` order is not guaranteed for regular (non-capped) collections, which is an important caveat.
- The comparison table between `$natural` and field-based sorting is accurate and helpful.
- The tailable cursor example is necessarily simplified for a blog post; in production, tailable cursors are typically used with `awaitData: true` and proper error handling, but this level of detail is reasonable for the tutorial scope.
- MongoDB has deprecated capped collections for general use starting in MongoDB 6.0 (they are still supported but discouraged for non-oplog use cases). The post doesn't mention this, but since the post focuses on `$natural` rather than capped collections specifically, this is acceptable.
