# Validation Summary: How to Use bitmaskToList() and bitmaskToArray() in ClickHouse

## Status
validated

## Post Type
Tutorial / Reference guide

## Technologies Covered
- ClickHouse SQL
- `bitmaskToList()` encoding function
- `bitmaskToArray()` encoding function
- Array functions (`has`, `length`, `arrayJoin`)
- Bitwise functions (`bitAnd`)

## Sources Consulted
- ClickHouse encoding functions docs: https://clickhouse.com/docs/en/sql-reference/functions/encoding-functions
- ClickHouse bit functions docs: https://clickhouse.com/docs/en/sql-reference/functions/bit-functions
- ClickHouse source code `src/Functions/FunctionsBitToArray.cpp` (verified `bitmaskToList`/`bitmaskToArray` implementation and output format)
- ClickHouse source code `src/Parsers/Lexer.cpp` and `src/Parsers/ExpressionListParsers.cpp` (verified the `&` token is not tokenized as a bitwise-AND operator — bitwise AND must use `bitAnd()`)

## Issues Found
1. **Invalid `&` operator.** The post used `WHERE permissions & 64 > 0` as a "bitwise AND" equivalent. ClickHouse's lexer does not tokenize `&` as a bitwise operator, so this would fail to parse. Fixed to use the `bitAnd(permissions, 64) > 0` function, which is the documented ClickHouse syntax.
2. **Incorrect bit position for value 64.** The post described the admin flag as "bit position 7, value 64". Using the 0-indexed convention (consistent with ClickHouse's own `bitTest(num, pos)`), value 64 = 2^6 = bit position 6, not 7. Corrected to "bit position 6, value 64".

## Review Notes
- Verified return types: `bitmaskToArray` returns `Array(UInt64)`, `bitmaskToList` returns `String` — both match official docs.
- Verified example output: `bitmaskToList(11)` → `"1,2,8"` (comma separator with no spaces, per the source in `FunctionsBitToArray.cpp` using `writeChar(',', out)`).
- Verified that `bitmaskToArray(11)` → `[1, 2, 8]` matches the documented behavior of decomposing an integer into ascending powers of two.
- `arrayJoin`, `has`, `length` are all valid ClickHouse array functions used correctly in the examples.
- Both functions were introduced in ClickHouse v1.1.0 and are stable/current; no deprecation concerns.
