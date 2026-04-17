# Validation Summary: How to Use char() and ascii() Functions in ClickHouse

## Status
validated

## Post Type
Tutorial / Reference

## Technologies Covered
- ClickHouse
- SQL string and encoding functions (`char`, `ascii`, `concat`, `substring`, `splitByChar`, `repeat`, `numbers`)
- ASCII character encoding

## Sources Consulted
- ClickHouse string functions documentation: https://clickhouse.com/docs/en/sql-reference/functions/string-functions
- ClickHouse encoding functions documentation: https://clickhouse.com/docs/en/sql-reference/functions/encoding-functions
- ClickHouse splitting/merging functions documentation: https://clickhouse.com/docs/en/sql-reference/functions/splitting-merging-functions

## Issues Found
- The post stated that `ascii()` returns a `UInt32`. According to ClickHouse documentation, the function returns `Int32`. Updated the description in the `ascii()` section to reflect the correct return type.

## Review Notes
- `char()` accepts numeric arguments of types `(U)Int8/16/32/64` or `Float*` per ClickHouse docs; the post's description as "integer arguments" is a reasonable simplification for the use cases shown.
- The `splitByChar` example uses `char(31)` as the separator. `splitByChar` requires a single-byte separator; since `char(31)` with a constant integer argument folds to a constant single-byte string, this works in practice.
- ASCII code point claims (`A`=65, `a`=97, `0`=48, space=32, `z`=122, `9`=57, `@`=64, `=`=61, tab=9, LF=10, CR=13, NUL=0, DEL=127, US=31) are all correct.
- The control-character range (0–31) and printable ASCII boundaries used in the validation queries match the ASCII standard.
