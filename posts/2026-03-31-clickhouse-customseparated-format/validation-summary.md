# Validation Summary: How to Use CustomSeparated Format in ClickHouse

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- ClickHouse
- ClickHouse `CustomSeparated`, `CustomSeparatedWithNames`, `CustomSeparatedWithNamesAndTypes` formats
- ClickHouse `Regexp` format
- ClickHouse format settings (`format_custom_*`, `format_regexp_*`)
- SQL (ClickHouse dialect)
- The `file()` table function
- MergeTree engine

## Sources Consulted
- ClickHouse CustomSeparated format docs: https://clickhouse.com/docs/en/interfaces/formats/CustomSeparated
- ClickHouse Regexp format docs: https://clickhouse.com/docs/en/interfaces/formats/Regexp
- ClickHouse formats overview: https://clickhouse.com/docs/en/interfaces/formats
- ClickHouse format settings docs: https://clickhouse.com/docs/en/operations/settings/formats
- ClickHouse source `EscapingRuleUtils.cpp` (escaping rule enum): https://github.com/ClickHouse/ClickHouse/blob/master/src/Formats/EscapingRuleUtils.cpp

## Issues Found
- The post used the format name `CustomSeparatedByRegexp`, which does not exist in ClickHouse. The correct format name for regex-based row parsing is `Regexp`. Updated both the section heading/description and the `FROM file(...)` calls in the "Regex-Based Parsing" and "Practical Example: Apache Access Log" sections to use `Regexp` instead. The `format_regexp`, `format_regexp_escaping_rule`, and `format_regexp_skip_unmatched` settings remain unchanged because they are the correct settings for the `Regexp` format.

## Review Notes
- The escaping rules table includes `XML`. ClickHouse's source code does define `XML` in the escaping rule enum, but in practice it is primarily intended for output formats (e.g., XML output). It is acceptable to list it for completeness.
- The default for `format_custom_row_after_delimiter` in ClickHouse's documentation is described as "Delimiter after field of the last column" rather than literally "after each row"; functionally these are equivalent, so the description in the table is fine.
- The `format_custom_null_representation` setting is correctly named.
- The `Raw` escaping rule does forbid the delimiter (and row separators) from appearing inside values, as the post states.
- Format and setting names verified against current ClickHouse docs as of 2026-04-17; no other inaccuracies observed.
