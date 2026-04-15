# Validation Summary: How to Use Values Format in ClickHouse

## Status
validated

## Post Type
Tutorial / Reference Guide

## Technologies Covered
- ClickHouse (database engine)
- ClickHouse Values format (data serialization format)
- clickhouse-client CLI
- SQL INSERT syntax

## Sources Consulted
- ClickHouse official documentation: Formats — Values (https://clickhouse.com/docs/en/interfaces/formats#values)
- ClickHouse official documentation: INSERT INTO (https://clickhouse.com/docs/en/sql-reference/statements/insert-into)
- ClickHouse official documentation: Format Settings — Values (https://clickhouse.com/docs/en/operations/settings/formats#input_format_values_interpret_expressions)
- ClickHouse official documentation: SQLInsert format (https://clickhouse.com/docs/en/interfaces/formats#sqlinsert)

## Issues Found

1. **Missing performance caveat for expressions in Values format**: The blog presented expression support (`now()`, `INTERVAL` arithmetic) as a feature highlight without mentioning the official recommendation against it for performance reasons. The ClickHouse docs state that expression evaluation uses inefficient code. Added a note about the slower code path.

2. **Misleading settings comments**: The `input_format_values_interpret_expressions` and `input_format_values_deduce_templates_of_expressions` settings both default to `1` (enabled). The blog's comments implied they needed to be enabled ("Allow expressions in Values input"), when in fact the SET statements as shown were no-ops. Updated comments to clarify these are defaults and describe what each setting actually does.

3. **Incorrect claim: "only format natively compatible with SQL INSERT syntax"**: ClickHouse also provides the `SQLInsert` output format, which generates complete INSERT statements. Changed "the only format" to "the primary format" and mentioned SQLInsert.

4. **Overstated MySQL/PostgreSQL compatibility**: The blog claimed Values output "can be run directly in MySQL or PostgreSQL" without qualification. ClickHouse defaults to backslash escaping for single quotes (`\'`), which differs from PostgreSQL's SQL-standard `''` escaping. The `output_format_values_escape_quote_with_quote` setting exists specifically for this reason. Added a note about the escaping difference and the relevant setting, and softened the compatibility claim.

## Review Notes
- The comparison table (Values vs CSV vs JSONEachRow) is accurate but simplified. It omits formats like TSV, Parquet, and Native that are also commonly used for import/export. This is acceptable for a focused tutorial.
- The claim that output is "on a single line" is practically correct (ClickHouse docs say "extra spaces aren't inserted" during formatting) but not explicitly stated in official docs. Left as-is since it reflects actual behavior.
- The CLI examples using `clickhouse-client --query` with shell redirection are correct and idiomatic.
