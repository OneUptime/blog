# Validation Summary: How to Use $ifNull and $coalesce in MongoDB Aggregation

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- MongoDB aggregation framework
- `$ifNull` aggregation expression operator
- `$cond` aggregation expression operator
- `$size`, `$add`, `$concatArrays` aggregation operators

## Sources Consulted
- MongoDB Manual: `$ifNull` aggregation operator — https://www.mongodb.com/docs/manual/reference/operator/aggregation/ifNull/
- MongoDB Manual: Aggregation Pipeline Operators (Conditional) — https://www.mongodb.com/docs/manual/reference/operator/aggregation/#conditional-expression-operators
- MongoDB Manual: `$cond` aggregation operator — https://www.mongodb.com/docs/manual/reference/operator/aggregation/cond/
- MongoDB 5.0 Release Notes (multi-argument `$ifNull` introduction)

## Issues Found

### Issue 1: `$coalesce` is not a MongoDB operator (Critical)
- **What was wrong:** The post presented `$coalesce` as a real MongoDB aggregation operator introduced in MongoDB 5.0, including syntax documentation and a working code example (Example 4). MongoDB does **not** have a `$coalesce` operator. The conditional expression operators are `$cond`, `$ifNull`, and `$switch` only. Code using `{ $coalesce: [...] }` would produce an "Unrecognized expression" error.
- **What was changed:** Replaced all references to `$coalesce` as a separate operator with explanations that the multi-argument form of `$ifNull` (MongoDB 5.0+) provides COALESCE-like functionality equivalent to SQL's `COALESCE`. Rewrote the syntax section and Example 4 to clarify this. Updated the intro and summary accordingly.

### Issue 2: Multi-argument `$ifNull` version was incorrect
- **What was wrong:** The post claimed multi-argument `$ifNull` was available in MongoDB 4.4+. It was actually introduced in MongoDB 5.0. Prior to 5.0, `$ifNull` accepted exactly two expressions.
- **What was changed:** Changed "MongoDB 4.4+" to "MongoDB 5.0+" in the syntax section (line 33) and in the summary section.

### Issue 3: Inaccurate `$ifNull` vs `$cond` comparison note
- **What was wrong:** The post stated: "`$ifNull` also handles missing fields, while `$cond` with `$eq: null` only matches explicitly `null` values." This is incorrect — in MongoDB aggregation, missing fields compare equal to `null`, so `{ $eq: ["$missingField", null] }` returns `true`. Both approaches handle missing fields equivalently.
- **What was changed:** Replaced the note with an accurate explanation that both approaches handle missing fields (since missing fields compare equal to null), and the real difference is conciseness — `$ifNull` is purpose-built for null/missing checks while `$cond` supports arbitrary conditions.

## Review Notes
- The post title and directory name reference `$coalesce`, which doesn't exist as a MongoDB operator. The title was kept as-is since renaming would break URLs, but the content now clearly explains that `$coalesce` is not a real MongoDB operator.
- All other code examples (1-3, 5-7) are syntactically correct and produce the expected output.
- The mermaid diagram is accurate for `$ifNull` behavior.
- The use cases section is accurate and practical.
