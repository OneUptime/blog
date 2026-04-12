# Validation Summary: How to Query Embedded Arrays of Objects in MongoDB

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- MongoDB (shell queries, aggregation framework)
- MongoDB Query Operators ($elemMatch, $gt, $gte, $filter)
- MongoDB Indexing (multikey indexes, compound multikey indexes)

## Sources Consulted
- MongoDB Manual: Query an Array of Embedded Documents — https://www.mongodb.com/docs/manual/tutorial/query-array-of-documents/
- MongoDB Manual: $elemMatch (query) — https://www.mongodb.com/docs/manual/reference/operator/query/elemMatch/
- MongoDB Manual: $elemMatch (projection) — https://www.mongodb.com/docs/manual/reference/operator/projection/elemMatch/
- MongoDB Manual: $filter (aggregation) — https://www.mongodb.com/docs/manual/reference/operator/aggregation/filter/
- MongoDB Manual: Multikey Indexes — https://www.mongodb.com/docs/manual/core/index-multikey/
- MongoDB Manual: Compound Multikey Indexes — https://www.mongodb.com/docs/manual/core/index-multikey/#compound-multikey-indexes

## Issues Found
- **Incorrect compound multikey index restriction note**: The original note stated "you cannot have two multikey index components that both refer to array fields within the same document's top-level array." This contradicted the valid index example directly above it (`{ "items.sku": 1, "items.price": 1 }`), which IS allowed because both fields are scalar sub-fields of the same array. The actual MongoDB restriction is that at most one indexed field path in a compound index can traverse through an array — you cannot have two separate/parallel array fields in a compound index. Fixed the note to accurately describe this restriction.

## Review Notes
- The "Nested Arrays (Arrays Within Arrays)" section title is slightly misleading — the examples show nested sub-documents within array elements, not truly doubly-nested arrays. However, the code examples are valid and work correctly regardless of whether `options` is a sub-document or an array.
- The $elemMatch projection returns only the **first** matching array element. The post says "Only includes the A100 item" which is accurate for the sample data (only one A100 per document), and the aggregation section correctly notes $filter is needed for "all matching elements (not just the first)."
