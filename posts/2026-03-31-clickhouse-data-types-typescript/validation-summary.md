# Validation Summary: How to Handle ClickHouse Data Types in TypeScript

## Status
validated

## Post Type
Tutorial / Reference Guide

## Technologies Covered
- ClickHouse (JSONEachRow format, data types)
- TypeScript (type annotations, bigint, generics)
- @clickhouse/client (official JavaScript/TypeScript client)

## Sources Consulted
- ClickHouse JSONEachRow format docs: https://clickhouse.com/docs/en/interfaces/formats/JSONEachRow
- ClickHouse format settings docs: https://clickhouse.com/docs/operations/settings/formats
- ClickHouse JavaScript client docs: https://clickhouse.com/docs/en/integrations/language-clients/javascript
- TypeScript Handbook: bigint primitive type

## Issues Found
1. **Decimal serialization claim was incorrect.** The introduction and table asserted that `Decimal` is serialized as a JSON string by default. This is wrong: `output_format_json_quote_decimals` defaults to `0`, so ClickHouse outputs Decimal as an unquoted JSON number by default. Quoting requires explicitly enabling the setting. Updated the intro, type-mapping table, and summary to correctly describe the default behavior and the setting name.
2. **`BigInt` used as a TypeScript type annotation.** The mapping table used `BigInt` (the object wrapper) where the primitive type `bigint` is the idiomatic TypeScript type (the code examples correctly used `bigint` already). Replaced `BigInt` with `bigint` in the two table rows for UInt64 and Int64 to keep terminology consistent.

## Review Notes
- The claim about `UInt64`/`Int64` being quoted as strings by default is correct (`output_format_json_quote_64bit_integers` defaults to 1).
- The `@clickhouse/client` API usage (`client.query({ query, query_params, format })` returning a `ResultSet` with `json<T>()`) matches the official client API.
- The DateTime parsing tip (replacing the space with `T` and appending `Z`) is a reasonable approach for ClickHouse's default `YYYY-MM-DD HH:MM:SS` format, though users should be aware the original value has no timezone info and appending `Z` assumes UTC — this is usually correct but depends on the column's timezone configuration.
- `Float32`/`Float64` are output as JSON numbers, which can lose precision for very large/precise floats; this is noted as "safe as number" in the post which is generally true for typical analytics values.
- The post does not cover newer types like `Variant`, `Dynamic`, or `JSON` — acceptable scope omission.
