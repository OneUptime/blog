# Validation Summary: How to Use TSKV Format in ClickHouse

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- ClickHouse (MergeTree engine, SQL DDL/DML)
- TSKV format (Tab-Separated Key=Value)
- clickhouse-client CLI
- ClickHouse HTTP interface

## Sources Consulted
- ClickHouse official documentation on TSKV format: https://clickhouse.com/docs/en/interfaces/formats/TSKV
- ClickHouse source code: `TSKVRowOutputFormat.cpp`, `TSKVRowInputFormat.cpp`, `WriteHelpers.h`, `ReadHelpers.h`
- ClickHouse official test suite: `00310_tskv.sh`
- ClickHouse documentation on `input_format_skip_unknown_fields` setting

## Issues Found

1. **Extra keys handling was inaccurate (line 88):** The post stated that extra keys with no matching column are "silently ignored." This is only true when the setting `input_format_skip_unknown_fields` is set to `1`. By default, unknown keys cause an error. Fixed the text to mention the required setting.

2. **`\=` escape sequence was misleading (line 104):** The escape table claimed `\=` means "Literal `=` in value." In reality, the `=` character is only escaped in key names on output (not in values). On input, `\=` works only because any unrecognized `\c` escape sequence passes through as `c` — it is not a formally defined escape sequence specific to TSKV. Fixed the table entry to say "Literal `=` in key name."

## Review Notes
- The escape sequences table only lists the most common sequences. ClickHouse's TabSeparated escaping family also supports `\b` (backspace), `\f` (formfeed), `\r` (carriage return), and `\'` (single quote), which are not mentioned. This is not an error but could be noted in a future update.
- In Yandex log pipelines, TSKV lines conventionally start with a `tskv` prefix/marker (e.g., `tskv\tkey1=val1\t...`). ClickHouse tolerates this on input by ignoring a bare `tskv` field with no `=` sign. The post does not mention this convention, which could be a useful addition for readers working with Yandex-style logs.
- The TSKV output example (lines 67-68) correctly shows output without the `tskv` prefix, which matches ClickHouse's actual output behavior.
- The comparison table between TSKV and TabSeparated is accurate for default settings. Note that TabSeparated can also tolerate missing columns if `input_format_tsv_allow_variable_number_of_columns` is enabled.
