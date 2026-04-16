# Validation Summary: How to Use ClickHouse Node.js Client (@clickhouse/client)

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- ClickHouse
- Node.js
- JavaScript (ES modules)
- @clickhouse/client (official ClickHouse JS client)
- Node.js streams (`stream`, `stream/promises`)

## Sources Consulted
- Official ClickHouse JS client docs: https://clickhouse.com/docs/integrations/language-clients/javascript
- ClickHouse/clickhouse-js GitHub repo: https://github.com/ClickHouse/clickhouse-js
- Source: `packages/client-common/src/config.ts` (config options, `host` deprecation)
- Source: `packages/client-common/src/error/error.ts` (`ClickHouseError` shape)
- Source: `packages/client-node/src/config.ts` (`BasicTLSOptions`, `MutualTLSOptions`)
- Official examples: `examples/node/basic_tls.ts`, `examples/node/select_streaming_json_each_row.ts`, `examples/node/insert_file_stream_ndjson.ts`

## Issues Found
- **Deprecated `host` config option**: All `createClient({ host: ... })` calls were using the deprecated `host` field. Per the official client source (deprecated since v1.0.0), the recommended field is `url`. Replaced every `host:` with `url:` in the config objects across all code samples (basic client, TLS client, and all subsequent sections).

No other technical issues found. Parameterized query syntax (`{name: Type}` + `query_params`), TLS shape (`tls: { ca_cert: Buffer }`), `ClickHouseError` export with `.code` property, `resultSet.stream()` emitting `Row[]` with `row.json()` method, and `client.insert({ values: stream })` with an object-mode Readable are all accurate against the current API.

## Review Notes
- `ClickHouseError.code` is typed as `string` (numeric ClickHouse exception code as a string), not `number` — the template-literal usage in the error-handling example works either way but readers should not assume it's numeric.
- For row streaming, `row.text` is a property (not a method); the post only uses `row.json()`, which is correct.
- TLS `ca_cert` must be a `Buffer` — calling `readFileSync('/path/to/ca.crt')` without an encoding argument returns a Buffer, so the example is correct.
- Port 8123 (HTTP) and 8443 (HTTPS) are the ClickHouse default HTTP interface ports and are correctly referenced.
