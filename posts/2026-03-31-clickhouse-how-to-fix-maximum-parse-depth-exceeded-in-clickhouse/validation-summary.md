# Validation Summary: How to Fix 'Maximum parse depth exceeded' in ClickHouse

## Status
validated

## Post Type
Tutorial / Troubleshooting guide

## Technologies Covered
- ClickHouse (SQL parser, settings, dictionaries, EXPLAIN)
- SQL (CTEs, CASE expressions, subqueries)
- XML configuration (`users.xml` profiles)

## Sources Consulted
- ClickHouse source: `src/Core/Defines.h` — `DBMS_DEFAULT_MAX_PARSER_DEPTH = 1000` (https://github.com/ClickHouse/ClickHouse/blob/master/src/Core/Defines.h)
- ClickHouse source: `src/Core/Settings.cpp` — `max_parser_depth` declaration (https://github.com/ClickHouse/ClickHouse/blob/master/src/Core/Settings.cpp)
- ClickHouse source: `src/Parsers/IParser.h` — actual error message wording ("Maximum parse depth ({}) exceeded. Consider rising max_parser_depth parameter.") (https://github.com/ClickHouse/ClickHouse/blob/master/src/Parsers/IParser.h)
- ClickHouse source: `src/Common/ErrorCodes.cpp` — confirms `TOO_DEEP_RECURSION` (code 306)
- ClickHouse docs: Array functions, EXPLAIN, Dictionaries (https://clickhouse.com/docs/sql-reference/functions/array-functions, https://clickhouse.com/docs/sql-reference/statements/explain)
- GitHub issue #27230 — example of the error in practice (https://github.com/ClickHouse/ClickHouse/issues/27230)

## Issues Found
1. **Incorrect default value for `max_parser_depth`.** The post originally stated the default was 2000 (both in the example error message and in the "Fix 1" narrative). The actual ClickHouse default — verified against `DBMS_DEFAULT_MAX_PARSER_DEPTH` in `src/Core/Defines.h` — is **1000**. Updated both occurrences to 1000.
2. **Error message wording did not match ClickHouse's actual output.** The post showed "Consider refactoring the query." but the real message from `src/Parsers/IParser.h` is "Consider rising max_parser_depth parameter." Corrected to match the actual string thrown by ClickHouse.

## Review Notes
- The error code `TOO_DEEP_RECURSION` and `EXPLAIN AST` usage are correct.
- `indexOf(array, value)` is valid and returns 0 when the value is not present — the example uses it correctly as a status-code lookup.
- `CREATE DICTIONARY ... LAYOUT(HASHED()) LIFETIME(300)` and `dictGet('dict', 'attr', key)` syntax are accurate.
- `users.xml` profile structure (`<profiles><default><max_parser_depth>...</max_parser_depth></default></profiles>`) is the correct location for a persistent server-level change.
- Minor caveat the post already flags: since v24.2, ClickHouse performs an additional stack-overflow check even if `max_parser_depth` is set very high, so raising it without bound is not a safe long-term fix. The post's emphasis on refactoring over raising the limit is aligned with this.
