# Validation Summary: How to Use xxHash32() and xxHash64() in ClickHouse

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- ClickHouse (SQL dialect and built-in hash functions)
- xxHash (xxHash32, xxHash64 non-cryptographic hash algorithms)

## Sources Consulted
- ClickHouse official documentation on hash functions: https://clickhouse.com/docs/en/sql-reference/functions/hash-functions (confirms xxHash32/xxHash64 accept variable number of arguments of any data type)
- ClickHouse official documentation on materialized columns: https://clickhouse.com/docs/en/sql-reference/statements/create/table
- xxHash algorithm reference: https://github.com/Cyan4973/xxHash

## Issues Found

### 1. Incorrect claim that xxHash functions accept only a single string argument
- **What was wrong:** The post repeatedly stated that `xxHash32()` and `xxHash64()` "accept a single string argument" (intro paragraph, note after the row hashing example, and summary). This is incorrect — ClickHouse's xxHash functions accept one or more arguments of any data type (`xxHash64(par1, par2, ...)`).
- **What was changed:**
  - Intro paragraph: Changed "Both accept a single string argument" to "Both accept one or more arguments of any data type."
  - Row hashing example: Simplified `xxHash64(concat(toString(user_id), '_', session_id, '_', toString(event_time)))` to the idiomatic `xxHash64(user_id, session_id, event_time)`.
  - Note after the example: Changed from "accept a single string argument. To hash multiple columns, concatenate them first" to "accept multiple arguments of any data type, so you can pass columns directly without concatenation."
  - Summary: Changed "They accept a string argument, so multi-column hashing requires concatenation first" to "They accept one or more arguments of any data type, so multi-column hashing can be done by passing columns directly."
- **Why:** Teaching users to concatenate columns before hashing is unnecessarily complex and misrepresents the API. The native multi-argument syntax is simpler, more efficient, and produces better hash distribution (no risk of separator collisions like `("a_b", "c")` vs `("a", "b_c")`).

## Review Notes
- The `WHERE changed = 1` in the Change Detection example works because ClickHouse supports referencing column aliases in WHERE clauses (a non-standard SQL extension). This is technically correct but may confuse readers coming from other databases. No change was made since it is valid ClickHouse SQL.
- The performance comparison query using `count()` around hash functions is a reasonable way to force computation while discarding the output, though it does not measure wall-clock time per function. The surrounding text correctly notes the comparison is illustrative.
- The `toString()` wrapping of `user_id` in the sampling examples is unnecessary since xxHash accepts any type, but it does not cause errors and the sampling pattern itself is correct. No change was made to avoid excessive edits to working code.
