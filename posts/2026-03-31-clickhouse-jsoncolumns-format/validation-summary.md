# Validation Summary: How to Use JSONColumns Format in ClickHouse

## Status
validated

## Post Type
Tutorial / Reference guide

## Technologies Covered
- ClickHouse (JSON output/input formats: `JSONColumns`, `JSONCompactColumns`, `JSONColumnsWithMetadata`, `JSONEachRow`)
- ClickHouse HTTP interface (port 8123)
- curl (HTTP client examples)
- Python (`requests`, `json`, `pandas`)
- Mermaid (diagram)

## Sources Consulted
- ClickHouse Formats overview: https://clickhouse.com/docs/en/interfaces/formats
- ClickHouse JSONColumnsWithMetadata format docs: https://clickhouse.com/docs/en/interfaces/formats/JSONColumnsWithMetadata
- ClickHouse HTTP interface docs: https://clickhouse.com/docs/en/interfaces/http
- ClickHouse JSONColumns format docs: https://clickhouse.com/docs/en/interfaces/formats/JSONColumns
- ClickHouse JSONCompactColumns format docs: https://clickhouse.com/docs/en/interfaces/formats/JSONCompactColumns

## Issues Found
- **JSONColumnsWithMetadata example output was incomplete.** The post showed the output as containing only `meta`, `data`, and `rows`, but ClickHouse always emits an additional `statistics` block (with `elapsed`, `rows_read`, `bytes_read`) for this format. Updated the example output to include the `statistics` block so the shown response matches what ClickHouse actually returns.

All other technical claims were verified as correct:
- `JSONColumns` is a single JSON object keyed by column name with arrays of values — accurate.
- `JSONCompactColumns` is a positional array of arrays without column names — accurate.
- Both formats support INSERT as well as SELECT — accurate (per the formats table, both directions are supported).
- The constraint that all column arrays must have the same length is correct.
- SQL syntax (`FORMAT JSONColumns` clause, `INSERT INTO ... FORMAT JSONColumns`) is correct.
- HTTP interface usage on port 8123 with URL-encoded `query` parameter is correct.
- `Accept-Encoding: gzip` header for compressed responses is supported by ClickHouse's HTTP interface.
- `today()` function returning today's date is a valid ClickHouse function.
- The Python pandas integration works because `pd.DataFrame(dict_of_lists)` consumes a dict-of-arrays directly, which matches the JSONColumns output shape.
- The comparison table accurately reflects each format's properties.

## Review Notes
- The `JSONColumnsWithMetadata` output may also include a `rows_before_limit_at_least` field when `LIMIT` is used; this was not added since the post's example does not require demonstrating that field and the omission does not cause confusion about format structure.
- The Python example sends credentials via query parameters; in production, prefer HTTP basic auth or the `X-ClickHouse-User`/`X-ClickHouse-Key` headers to avoid credentials appearing in server access logs. Not a correctness issue — just a future hardening note.
- These columnar JSON formats have been available since ClickHouse 22.4. The post does not call out any version requirement, which is reasonable for a current-version tutorial.
