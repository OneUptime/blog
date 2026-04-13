# Validation Summary: How to Use $elemMatch for Array Element Conditions in MongoDB

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- MongoDB (query operators, array queries, projections, indexing)
- `$elemMatch` query and projection operator
- Multikey indexes

## Sources Consulted
- MongoDB official documentation: `$elemMatch` (Query) — https://www.mongodb.com/docs/manual/reference/operator/query/elemMatch/
- MongoDB official documentation: `$elemMatch` (Projection) — https://www.mongodb.com/docs/manual/reference/operator/projection/elemMatch/
- MongoDB official documentation: Query an Array of Embedded Documents — https://www.mongodb.com/docs/manual/tutorial/query-array-of-documents/
- MongoDB official documentation: Multikey Indexes — https://www.mongodb.com/docs/manual/core/index-multikey/

## Issues Found
- **Misleading "(incorrectly)" label in example**: The "Problem Without $elemMatch" section stated the query "finds both documents (incorrectly)" for documents 1 and 2. However, both documents actually contain an array element that satisfies both conditions on the same element (Doc 1: `{ score: 92, grade: "A" }`, Doc 2: `{ score: 95, grade: "A" }`), so both matches are in fact correct. The parenthetical "(incorrectly)" was misleading. Fixed the wording to clarify that the matches happen to be correct for these documents, but the approach is fundamentally flawed because MongoDB evaluates conditions independently across array elements — as demonstrated by the subsequent Document 3 example.

## Review Notes
- The `$and` example in "Combining with Other Operators" uses an explicit `$and` where an implicit AND would suffice (since the query conditions use different field names). This is not incorrect — just slightly verbose. Left as-is since it serves as a clear example of combining `$elemMatch` with other operators.
- The note about compound multikey index limitations with `$elemMatch` is a fair simplification. The full details (e.g., at most one indexed field in a compound index can be from an array) are more nuanced but beyond the scope of this post.
- All code examples use correct MongoDB shell syntax and valid operator usage.
- The projection `$elemMatch` explanation correctly notes it returns only the **first** matching array element, which is accurate per MongoDB documentation.
