# Validation Summary: How to Use ClickHouse with PHP

## Status
validated

## Post Type
Tutorial / Integration Guide

## Technologies Covered
- ClickHouse (HTTP interface on port 8123)
- PHP (7.4+ syntax with typed properties)
- cURL (PHP `curl_*` extension)
- Composer
- `smi2/phpclickhouse` PHP client library
- JSONEachRow ClickHouse format

## Sources Consulted
- ClickHouse HTTP interface documentation: https://clickhouse.com/docs/en/interfaces/http
- ClickHouse JSONEachRow format: https://clickhouse.com/docs/en/interfaces/formats#jsoneachrow
- smi2/phpClickHouse GitHub repo: https://github.com/smi2/phpClickHouse
- Packagist entry for `smi2/phpclickhouse`
- PHP cURL documentation: https://www.php.net/manual/en/book.curl.php

## Issues Found
No technical issues found.

Verified items:
- Default ClickHouse HTTP port `8123` is correct.
- Raw HTTP interface usage (GET `/?query=...` for SELECT, POST body for INSERT with `FORMAT JSONEachRow`) matches the official HTTP interface contract.
- `CURLOPT_USERPWD`, `CURLOPT_RETURNTRANSFER`, `CURLOPT_POST`, `CURLOPT_POSTFIELDS`, `CURLOPT_HTTPHEADER` usage is correct.
- `smi2/phpclickhouse` Composer package name is correct.
- `ClickHouseDB\Client` API: `database()`, `setTimeout()`, `setConnectTimeOut()` (camelCase with capital O matches the library), `ping()`, `write()`, `insert($table, $rows, $columns)`, `select()` — all confirmed against the library README.
- Parameter binding with `:param_name` syntax in `$db->select()` is supported by the library.
- Exception class `ClickHouseDB\Exception\QueryException` exists under the PSR-4 namespace.
- MergeTree DDL with `PARTITION BY toYYYYMM(...)` and `ORDER BY (...)` is valid ClickHouse syntax.

## Review Notes
- The `setConnectTimeOut` spelling (capital `O` in `Out`) is intentional and matches the library; this is an unusual casing that readers may easily mistype, but the post is correct.
- The raw cURL `query()` method appends ` FORMAT JSONEachRow` unconditionally. If a caller passes a SQL string that already contains a `FORMAT` clause, ClickHouse will reject it. This is a design trade-off rather than a bug.
- The `smi2/phpclickhouse` library also offers newer server-side native parameter binding via `selectWithParams()` using the `{name:Type}` syntax — not required here, but worth knowing for typed bindings.
- `CURLOPT_USERPWD` always emits a Basic Auth header even when the password is empty; this is harmless against a default ClickHouse install but worth noting if credentials are expected via `X-ClickHouse-User` / `X-ClickHouse-Key` headers in hardened deployments.
- The `sendBatch` helper in the bulk insert example does not check the HTTP status or raise on failure — fine as an illustrative snippet, but production code should mirror the error handling in Option 1.
