# Validation Summary: How to Use ClickHouse with Retool

## Status
validated

## Post Type
Tutorial / Integration guide

## Technologies Covered
- ClickHouse (HTTP interface, SQL dialect)
- Retool (REST API resource, Table/Chart components, Date Range Picker)
- HTTP / REST

## Sources Consulted
- ClickHouse HTTP interface documentation: https://clickhouse.com/docs/en/interfaces/http
- ClickHouse authentication headers (`X-ClickHouse-User`, `X-ClickHouse-Key`): https://clickhouse.com/docs/en/interfaces/http#default-authentication
- ClickHouse formats (`JSONEachRow`): https://clickhouse.com/docs/en/interfaces/formats#jsoneachrow
- ClickHouse date/time functions (`toDate`, `today`): https://clickhouse.com/docs/en/sql-reference/functions/date-time-functions
- Retool REST API resource documentation: https://docs.retool.com/data-sources/integrations/rest-api
- Retool components (Table, Chart, Date Range Picker): https://docs.retool.com/components

## Issues Found
No technical issues found.

- Port 8123 is the standard ClickHouse HTTP port — correct.
- `X-ClickHouse-User` and `X-ClickHouse-Key` are valid ClickHouse authentication headers.
- `default_format=JSONEachRow` URL parameter is correct for returning newline-delimited JSON suitable for Retool table parsing.
- SQL functions `toDate()`, `count()`, and `today()` are valid ClickHouse SQL functions.
- Retool's `{{ query1.data }}` binding syntax and "Run query automatically when inputs change" option are accurate.

## Review Notes
- The post correctly notes that Retool lacks a native ClickHouse connector and the REST API workaround is the standard community approach.
- The "Parameterized Queries for Security" section could be expanded in the future — Retool's REST API resource supports URL parameters and body parameters as typed fields which Retool auto-escapes; relying on string interpolation in SQL is a potential SQL injection vector. However, the post does note this caveat briefly ("validate inputs before embedding them in SQL strings").
- Using `X-ClickHouse-Key` header works but users should be aware that in production environments passing credentials via HTTPS is strongly recommended over HTTP.
- ClickHouse also supports sending queries via the `query` URL parameter (GET) in addition to POST body, which is what the last example shows implicitly — this is correct.
