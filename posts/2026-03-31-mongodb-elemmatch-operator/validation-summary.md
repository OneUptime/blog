# Validation Summary: How to Use $elemMatch in MongoDB for Array Field Queries

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- MongoDB
- MongoDB `$elemMatch` query operator
- MongoDB `$elemMatch` projection operator
- MongoDB shell (mongosh)

## Sources Consulted
- MongoDB official documentation: `$elemMatch` (query) — https://www.mongodb.com/docs/manual/reference/operator/query/elemMatch/
- MongoDB official documentation: `$elemMatch` (projection) — https://www.mongodb.com/docs/manual/reference/operator/projection/elemMatch/
- MongoDB official documentation: Query an Array of Embedded Documents — https://www.mongodb.com/docs/manual/tutorial/query-array-of-documents/

## Issues Found

1. **Duplicate JavaScript object keys in "without $elemMatch" example (line 39-42):** The query used `"scores.score"` as a key twice in the same object literal. In JavaScript, duplicate keys cause the second to silently overwrite the first, so the query would only apply `{ $lt: 60 }` — not both conditions as the text claimed. Fixed by wrapping in `$and` to properly demonstrate independent cross-element matching.

2. **Duplicate key in `$elemMatch` example (line 49-51):** The `$elemMatch` object contained `score` as a key twice (`score: { $gt: 80 }, score: { $lt: 60 }`), which has the same duplicate-key problem. Fixed by combining into a single key: `score: { $gt: 80, $lt: 60 }`.

3. **Incorrect `$or` placement inside `$elemMatch` (lines 148-155):** `$or` was nested inside a field's value expression (`score: { $or: [...] }`), which is invalid — `$or` is a top-level query operator, not a comparison operator. Fixed by moving `$or` to the `$elemMatch` expression level, with each branch specifying the field: `$or: [{ score: { $lt: 50 } }, { score: { $gt: 95 } }]`.

## Review Notes
- The projection example correctly notes that `$elemMatch` returns only the **first** matching element, which is an important caveat.
- The "When $elemMatch is Not Needed" section is accurate — a single condition on an array field does not require `$elemMatch`.
- The mermaid diagram and overall explanation of why `$elemMatch` exists are clear and accurate.
