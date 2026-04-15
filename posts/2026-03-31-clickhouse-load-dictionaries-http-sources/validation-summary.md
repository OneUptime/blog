# Validation Summary: How to Load Dictionaries from HTTP Sources in ClickHouse

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- ClickHouse (dictionaries, external dictionary sources)
- HTTP-based dictionary sources
- SQL DDL (CREATE DICTIONARY)
- ClickHouse dictionary functions (dictGetString)
- system.dictionaries monitoring table

## Sources Consulted
- ClickHouse official documentation — Dictionary HTTP sources: https://clickhouse.com/docs/en/sql-reference/statements/create/dictionary/sources/http
- ClickHouse official documentation — Dictionary layouts: https://clickhouse.com/docs/en/sql-reference/dictionaries#ways-to-store-dictionaries-in-memory
- ClickHouse official documentation — dictGet functions: https://clickhouse.com/docs/en/sql-reference/functions/ext-dict-functions
- ClickHouse official documentation — system.dictionaries: https://clickhouse.com/docs/en/operations/system-tables/dictionaries
- ClickHouse official documentation — Input/Output formats: https://clickhouse.com/docs/en/interfaces/formats

## Issues Found

1. **HASHED() layout used with String primary keys**: The `country_codes_http` and `geo_data_dict` dictionaries used `LAYOUT(HASHED())` with `String` primary keys. The `HASHED()` layout only supports `UInt64` keys. Changed both to `LAYOUT(COMPLEX_KEY_HASHED())`, which supports arbitrary key types including String.

2. **FORMAT 'CSV' but example response includes headers**: The first dictionary used `FORMAT 'CSV'`, but the example CSV response showed a header row (`code,name,continent`). The `CSV` format in ClickHouse does not parse header rows — they would be treated as data, causing errors. Changed to `format 'CSVWithNames'` which correctly handles the header row.

3. **Parameter casing inside SOURCE(HTTP(...))**: All three dictionaries used uppercase parameter names (`URL`, `FORMAT`, `HEADERS`) inside the `SOURCE(HTTP(...))` block. The official ClickHouse documentation consistently uses lowercase (`url`, `format`, `headers`) for parameters inside source blocks. Changed all to lowercase to match official conventions.

4. **dictGetString missing tuple() for complex key**: The `country_codes_http` dictionary uses `COMPLEX_KEY_HASHED()` layout, which requires key arguments to be wrapped in `tuple()`. Updated `dictGetString('country_codes_http', 'name', country_code)` to `dictGetString('country_codes_http', 'name', tuple(country_code))`.

## Review Notes
- The `dictGetString` function is not deprecated but the generic `dictGet` is generally preferred for new code. The post's usage is still valid.
- The `FLAT()` layout used for `feature_flags_dict` with `UInt64` primary key is correct — FLAT is the fastest layout for UInt64 keys.
- The system.dictionaries columns referenced (`status`, `element_count`, `last_successful_update_time`, `last_exception`) are all confirmed in official documentation.
- The `SYSTEM RELOAD DICTIONARY` command syntax is correct.
- The claim about ClickHouse continuing to use last successfully loaded data when HTTP source fails during refresh is accurate behavior.
