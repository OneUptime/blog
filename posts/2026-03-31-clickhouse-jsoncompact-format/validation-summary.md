# Validation Summary: How to Use JSONCompact Format in ClickHouse

## Status
validated

## Post Type
Tutorial / Reference Guide

## Technologies Covered
- ClickHouse (JSONCompact output formats)
- ClickHouse HTTP interface (port 8123)
- SQL (ClickHouse dialect)
- curl (HTTP client usage)
- JSON serialization

## Sources Consulted
- ClickHouse Formats documentation: https://clickhouse.com/docs/en/interfaces/formats
- ClickHouse JSONCompact format reference: https://clickhouse.com/docs/en/interfaces/formats#jsoncompact
- ClickHouse JSONCompactEachRow format reference: https://clickhouse.com/docs/en/interfaces/formats#jsoncompacteachrow
- ClickHouse JSONCompactEachRowWithNamesAndTypes format reference: https://clickhouse.com/docs/en/interfaces/formats#jsoncompacteachrowwithnamesandtypes
- ClickHouse JSONCompactStrings format reference: https://clickhouse.com/docs/en/interfaces/formats#jsoncompactstrings
- ClickHouse HTTP interface documentation: https://clickhouse.com/docs/en/interfaces/http

## Issues Found
No technical issues found.

All named formats (`JSONCompact`, `JSONCompactEachRow`, `JSONCompactEachRowWithNames`, `JSONCompactEachRowWithNamesAndTypes`, `JSONCompactStrings`, `JSONCompactStringsEachRow`) are real ClickHouse output formats. The output structures shown (with `meta`, `data`, `rows`, and `statistics` sections for the envelope-based `JSONCompact` format, and line-delimited arrays for the `EachRow` variants) accurately reflect ClickHouse's actual output. The `INSERT ... FORMAT JSONCompactEachRow` and `INSERT ... FORMAT JSONCompactEachRowWithNames` syntax examples are valid. The HTTP interface curl example uses the correct default port (8123) and URL-encoded query parameters.

## Review Notes
- The "Standard JSON output" example in the opening comparison is simplified — actual ClickHouse `JSON` format output also includes the `meta`, `rows`, and `statistics` envelope fields. The simplification is a reasonable illustration of the object-per-row vs. array-per-row distinction (which is where the bandwidth savings come from), so it was left as-is.
- The bandwidth comparison table uses approximate numbers for an illustrative 1000-row table with specific columns. These are plausible estimates but will vary based on actual data characteristics (string lengths, number of columns, etc.).
- ClickHouse also offers `JSONCompactStringsEachRowWithNames` and `JSONCompactStringsEachRowWithNamesAndTypes` variants that aren't listed in the variants table; this is a minor omission rather than an error, since the post doesn't claim the list is exhaustive.
- The post's recommendation to use `Arrow` or `Parquet` for very large result sets is sound general guidance; ClickHouse's `Native` format is another strong option for ClickHouse-to-ClickHouse transfers but is out of scope here.
