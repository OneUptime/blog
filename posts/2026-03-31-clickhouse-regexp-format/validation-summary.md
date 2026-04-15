# Validation Summary: How to Use Regexp Format in ClickHouse for Pattern-Based Parsing

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- ClickHouse (Regexp input format)
- ClickHouse SQL (CREATE TABLE, INSERT, SELECT, SET)
- clickhouse-client CLI
- ClickHouse `file()` table function
- ClickHouse `match()` function
- Regular expressions (RE2 syntax)

## Sources Consulted
- ClickHouse official documentation: Regexp format — https://clickhouse.com/docs/en/interfaces/formats#regexp
- ClickHouse official documentation: format_regexp setting — https://clickhouse.com/docs/en/operations/settings/settings-formats#format_regexp
- ClickHouse official documentation: format_regexp_escaping_rule — https://clickhouse.com/docs/en/operations/settings/settings-formats#format_regexp_escaping_rule
- ClickHouse official documentation: match() function — https://clickhouse.com/docs/en/sql-reference/functions/string-search-functions#match

## Issues Found

### 1. Incorrect claim that named capture groups are matched to columns by name
- **What was wrong:** The post stated "Each named capture group `(?P<name>...)` is matched to a column by name." ClickHouse's Regexp format actually maps captured groups to columns by **positional order** (first group to first column, second to second, etc.), not by name. Named groups are valid RE2 syntax and improve readability, but ClickHouse ignores the names for column mapping.
- **What was changed:** Rewrote the explanation to correctly state that groups are matched by position, and that named groups can be used for readability but are not used for name-based mapping. Also updated the Summary section which reinforced the incorrect claim about "named capture groups matching column names."
- **Why:** This was the core misconception in the post. Readers following the advice could encounter bugs if they used named groups in a different order than their column definitions, believing the names would handle the mapping.

### 2. Invalid escaping rule option `XML`
- **What was wrong:** The post listed `XML` as a valid value for `format_regexp_escaping_rule`. The official documentation only lists five valid values: `Raw`, `CSV`, `JSON`, `Escaped`, and `Quoted`.
- **What was changed:** Removed `XML` from the list of valid escaping rule options.
- **Why:** Using `XML` would result in an error. The official docs do not include it as a supported option.

## Review Notes
- All code examples use named groups in the same positional order as the target columns, so they would work correctly despite the original incorrect explanation. The fix was to the explanatory text, not to the code.
- The `match()` function only returns a boolean (0 or 1) — it does not extract or validate group mappings. The post correctly uses it just to test whether the pattern matches, which is a reasonable validation step.
- The `input()` table function example is an unusual but valid pattern for using the Regexp format with an INSERT...SELECT query.
