# Validation Summary: How to Build Log Buffers with MongoDB Capped Collections

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- MongoDB capped collections
- MongoDB TTL indexes
- MongoDB tailable cursors
- MongoDB Node.js driver
- JavaScript
- WebSocket streaming with `ws`

## Sources Consulted
- MongoDB Manual: Capped Collections - https://www.mongodb.com/docs/manual/core/capped-collections/
- MongoDB Manual: Create a Capped Collection - https://www.mongodb.com/docs/manual/core/capped-collections/create-capped-collection/
- MongoDB Manual: Tailable Cursors - https://www.mongodb.com/docs/manual/core/tailable-cursors/
- MongoDB Manual: `cursor.tailable()` - https://www.mongodb.com/docs/manual/reference/method/cursor.tailable/
- MongoDB Manual: TTL Indexes - https://www.mongodb.com/docs/manual/core/index-ttl/
- MongoDB Manual: Text Indexes - https://www.mongodb.com/docs/manual/core/indexes/index-types/index-text/
- MongoDB Node.js Driver API: `FindCursor` - https://mongodb.github.io/node-mongodb-native/7.0/classes/FindCursor.html

## Issues Found
- The post described capped collections as having generally high write throughput. Current MongoDB documentation says capped collections serialize write operations and may have worse concurrent write performance than normal collections, so the wording was changed to focus on circular-buffer behavior and efficient natural-order reads.
- The post claimed individual document deletion is not possible. Current MongoDB documentation no longer lists that as a capped collection restriction and discusses delete performance on capped collections, so the limitation was removed and the TTL comparison was reframed.
- The post used `collection.stats()` in a Node.js example. That helper is not part of the current MongoDB Node.js driver API, so the example now uses `db.listCollections()` to inspect capped collection options.
- The post described a "natural `_id` index." Capped collections have a default `_id` index, while natural order is a scan order, so the comment was corrected.
- The tailable cursor example mixed tailable cursor use with reverse `$natural` sorting and `limit`, which misrepresents how tailable cursors read new documents. The example now sends a small recent snapshot separately, then tails in natural order and filters older documents client-side.
- The tailable cursor example used `cursor.forEach()`, which the current Node.js driver API marks deprecated. It was replaced with `for await...of`.
- The event buffer section said capped collection documents cannot be updated. MongoDB documentation instead says to avoid updates because they can expand data beyond the allocated space and cause unexpected behavior, so the comment was corrected.
- The limitations section omitted documented restrictions on writes in transactions and `$out` writing to capped collections. Those restrictions were added.

## Review Notes
The examples were reviewed for API and conceptual correctness against current MongoDB documentation and the current MongoDB Node.js driver API. The code snippets were not executed against a live MongoDB instance.
