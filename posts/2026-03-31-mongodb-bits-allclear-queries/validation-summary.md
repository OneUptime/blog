# Validation Summary: How to Use $bitsAllClear in MongoDB Queries

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- MongoDB (query operators)
- MongoDB `$bitsAllClear` bitwise operator
- MongoDB `$bitsAllSet` bitwise operator
- MongoDB Aggregation Framework (`$match`, `$group`)
- MongoDB indexing
- BinData type

## Sources Consulted
- MongoDB official documentation for `$bitsAllClear`: https://www.mongodb.com/docs/manual/reference/operator/query/bitsAllClear/
- MongoDB official documentation for `$bitsAllSet`: https://www.mongodb.com/docs/manual/reference/operator/query/bitsAllSet/
- MongoDB official documentation on bitwise query operators: https://www.mongodb.com/docs/manual/reference/operator/query-bitwise/
- MongoDB official documentation on query plan and index usage: https://www.mongodb.com/docs/manual/reference/method/cursor.explain/

## Issues Found
- **Floating-point limitation was incorrect**: The post stated "Floating-point numbers are not matched even if their integer part satisfies the condition." This is wrong — MongoDB DOES match floating-point field values if they can be exactly represented as a 64-bit signed integer (e.g., `3.0` is treated as `3` for bitwise operations). Only non-integer floats (e.g., `3.5`) and special values (e.g., `NaN`) will not match. Fixed the limitation to accurately describe this behavior.

## Review Notes
- The post describes `$bitsAllClear` as "the complement of `$bitsAllSet`." Strictly speaking, the logical complement of `$bitsAllSet` (all specified bits are 1) is `$bitsAnyClear` (at least one specified bit is 0), not `$bitsAllClear` (all specified bits are 0). `$bitsAllClear` is more accurately the "counterpart" or "dual" of `$bitsAllSet`. This is a minor terminological imprecision rather than a technical error.
- The indexing section states that an index on the bitmask field "allows MongoDB to reduce the candidate document set before applying the bitwise filter." In practice, bitwise query operators (`$bitsAllClear`, `$bitsAllSet`, etc.) generally cannot leverage standard B-tree indexes to narrow the candidate set and typically result in a collection scan (COLLSCAN). An index on the field alone won't help a pure bitwise query; it would only be beneficial when combined with other query predicates that can use the index. The section is not entirely wrong (creating an index doesn't hurt), but it overstates the benefit for bitwise-only queries.
- All code examples, query results, binary representations, and operator behavior descriptions are correct.
- The BinData section's comment about `BinData(0, "AA==")` being a zero byte is accurate, though the actual query uses `BinData(0, "Zg==")` (0x66) — the comment is an aside rather than describing the queried value.
