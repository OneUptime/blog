# Validation Summary: How to Use $indexOfArray in MongoDB Aggregation

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- MongoDB aggregation framework
- `$indexOfArray` aggregation expression
- Related operators: `$arrayElemAt`, `$slice`, `$let`, `$cond`, `$indexOfCP`, `$indexOfBytes`

## Sources Consulted
- MongoDB official documentation for `$indexOfArray`: https://www.mongodb.com/docs/manual/reference/operator/aggregation/indexOfArray/
- MongoDB official documentation for `$project`: https://www.mongodb.com/docs/manual/reference/operator/aggregation/project/
- MongoDB official documentation for `$slice` (aggregation): https://www.mongodb.com/docs/manual/reference/operator/aggregation/slice/
- MongoDB official documentation for `$arrayElemAt`: https://www.mongodb.com/docs/manual/reference/operator/aggregation/arrayElemAt/

## Issues Found

1. **Incorrect default end index in syntax section** (line 29): The comment stated `default array length - 1`, but since the end bound is exclusive (as correctly noted in the bullet points below the syntax), the effective default is `array length`, not `array length - 1`. If the default were `array length - 1` with an exclusive end, the last element would never be searched. Fixed the comment to `default array length`.

2. **Inconsistent description in Example 3** (line 89): The prose said "Start searching from index 2, skipping earlier elements" but the code uses a start index of `1` (`$indexOfArray: ["$vals", 10, 1]`). The code is correct — starting from index 1, it finds `10` at index 2. Fixed the description to "Start searching from index 1, skipping the first element".

3. **Missing field in Example 6 pipeline** (lines 162-181): The first `$project` stage only output `failPos`, which caused the `steps` field to be dropped from the document. The second `$project` stage then referenced `$steps` (via `$arrayElemAt: ["$steps", "$failPos"]`), which would resolve to a missing field, making `$arrayElemAt` return `null` regardless of `failPos`. Fixed by adding `steps: 1` to the first `$project` stage to preserve the field.

## Review Notes
- Example 6 uses `$arrayElemAt: ["$steps", "$failPos"]` where `$failPos` is a field reference (string), not a numeric literal. This works correctly in MongoDB — `$arrayElemAt` accepts expressions that resolve to integers for the index argument.
- The comparison table with `$indexOfCP` and `$indexOfBytes` is accurate and helpful.
- Example 7's use of `$slice` with two arguments (`$slice: ["$events", "$$stopIdx"]`) correctly returns the first N elements, which is the intended behavior of slicing everything before the sentinel.
