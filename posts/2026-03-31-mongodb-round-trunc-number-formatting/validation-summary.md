# Validation Summary: How to Use $round and $trunc for Number Formatting in MongoDB Aggregation

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- MongoDB Aggregation Framework
- `$round` aggregation operator
- `$trunc` aggregation operator
- `$ifNull` aggregation operator
- `$project` and `$group` pipeline stages

## Sources Consulted
- MongoDB official documentation for `$round`: https://www.mongodb.com/docs/manual/reference/operator/aggregation/round/
- MongoDB official documentation for `$trunc`: https://www.mongodb.com/docs/manual/reference/operator/aggregation/trunc/
- MongoDB official documentation for `$ifNull`: https://www.mongodb.com/docs/manual/reference/operator/aggregation/ifNull/

## Issues Found
1. **Incorrect rounding result in comparison table**: The table claimed `$round` on input `4.5` with place `0` produces `5`. MongoDB uses banker's rounding (round half to even), so 4.5 rounds to `4`, not `5`. Fixed the table value from `5` to `4` and added a clarifying note about banker's rounding behavior.
2. **Misleading description of rounding behavior**: The summary stated "$round applies standard mathematical rounding," which implies round-half-away-from-zero. Changed to "$round applies banker's rounding (round half to even)" to accurately reflect MongoDB's documented behavior.

## Review Notes
- All code examples use correct syntax and would work as described in a MongoDB aggregation pipeline.
- The negative place values for both `$round` and `$trunc` are correctly documented.
- The `$ifNull` usage pattern is correct and is a good practical tip.
- Users working with `Decimal128` types will get exact banker's rounding behavior; with `double` types, IEEE 754 floating-point representation can occasionally cause edge-case results that appear inconsistent with banker's rounding (see MongoDB Jira SERVER-71557).
