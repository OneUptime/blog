# Validation Summary: How to Implement MongoDB Graph Lookups

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- MongoDB aggregation pipeline
- MongoDB `$graphLookup`
- MongoDB `$lookup`, `$project`, `$filter`, `$setIntersection`, and `$sortArray`
- MongoDB document references and graph-like data modeling
- Mermaid diagrams

## Sources Consulted
- MongoDB `$graphLookup` aggregation stage documentation: https://www.mongodb.com/docs/manual/reference/operator/aggregation/graphLookup/
- MongoDB `$project` aggregation stage documentation: https://www.mongodb.com/docs/manual/reference/operator/aggregation/project/
- MongoDB `$sortArray` expression documentation: https://www.mongodb.com/docs/manual/reference/operator/aggregation/sortArray/
- MongoDB `ObjectId()` mongosh method documentation: https://www.mongodb.com/docs/manual/reference/method/ObjectId/
- MongoDB aggregation pipeline documentation: https://www.mongodb.com/docs/manual/core/aggregation-pipeline/
- MongoDB tree data modeling documentation: https://www.mongodb.com/docs/manual/applications/data-models-tree-structures/

## Issues Found
- The introductory `ObjectId()` example used non-hex strings (`"employee1"` and `"manager1"`), which are invalid `ObjectId` arguments. Updated them to valid 24-character hexadecimal strings.
- The `$graphLookup` syntax block described `maxDepth: 0` as unlimited. MongoDB documents `maxDepth: 0` as a non-recursive lookup; omitting `maxDepth` allows traversal until no more matches are found. Updated the comment.
- The expected output examples showed arrays in a fixed order. MongoDB does not guarantee `$graphLookup` output order. Added notes before the examples explaining that the shown order is grouped by depth for readability.
- The cycle example stored the cycle in `relatedTo`, but the `$graphLookup` query traversed only `_id` to `parent`, so the query did not actually traverse the cycle. Updated the sample data so the cycle exists on the traversed `parent` relationship.
- The performance section said projection reduced memory usage by projecting early, but the example projected after `$graphLookup`; that only shapes the returned output and does not reduce traversal memory. Updated the wording to describe reducing response size instead.
- The large-graph guidance recommended pagination with `$skip` and `$limit`, which can be misleading for recursive result arrays. Updated the guidance to recommend limiting the number of starting documents with `$match` and `$limit`.

## Review Notes
- `$sortArray` is used correctly in the advanced example, but it requires MongoDB 5.2 or later.
- `restrictSearchWithMatch` examples use valid query filter syntax. Future revisions could mention explicitly that aggregation expressions are not allowed inside `restrictSearchWithMatch`.
