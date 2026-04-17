# Validation Summary: How to Configure ClickHouse TLS/SSL Settings

## Status
validated

## Post Type
Tutorial / Configuration guide

## Technologies Covered
- ClickHouse (server config.xml, clickhouse-client)
- TLS/SSL (OpenSSL / Poco NetSSL)
- OpenSSL CLI (self-signed cert generation)
- curl (HTTPS testing)

## Sources Consulted
- ClickHouse SSL/TLS configuration guide: https://clickhouse.com/docs/guides/sre/configuring-ssl
- ClickHouse default server config: https://github.com/ClickHouse/ClickHouse/blob/master/programs/server/config.xml
- ClickHouse client source (`src/Client/ClientApplicationBase.cpp`) for CLI flags
- ClickHouse `system.metrics` schema (`src/Storages/System/StorageSystemMetrics.cpp`)
- ClickHouse `system.settings` definitions (`src/Core/Settings.cpp`)
- Poco NetSSL `SSLManager` for `verificationMode` accepted values (none, relaxed, strict, once)

## Issues Found

1. **Non-existent `clickhouse-client` CLI flags `--ssl-cert-file` / `--ssl-key-file`.** These flags do not exist. The only TLS-related flags are `--secure`/`-s`, `--no-secure`, `--accept-invalid-certificate`, and `--tls-sni-override`. Client certificates are configured via `~/.clickhouse-client/config.xml` (or `--config-file`) under `<openSSL><client>`. Rewrote the mutual-TLS client example to show the XML client config and a plain `--secure` invocation.

2. **Non-existent `use_ssl` setting.** The query `SELECT value FROM system.settings WHERE name = 'use_ssl'` would return zero rows — there is no such setting in ClickHouse. TLS is a transport/server-config concern, not a session setting. Replaced with an `ss` port check and a corrected `system.metrics` query.

3. **Invalid `system.metrics` query.** `system.metrics` has only three columns (`metric`, `value`, `description`); there is no `interface` column, so `SELECT interface, count() …` would fail with an unknown-identifier error. Rewrote the query to `SELECT metric, value FROM system.metrics WHERE metric LIKE '%Connection%'`, which surfaces per-interface counts (TCPConnection, HTTPConnection, InterserverConnection, etc.) the way the metric is actually exposed.

## Review Notes

- Ports (`https_port` 8443, `tcp_port_secure` 9440, `interserver_https_port` 9010) and the full set of `<openSSL>` option names (`certificateFile`, `privateKeyFile`, `verificationMode`, `caConfig`, `loadDefaultCAFile`, `cacheSessions`, `disableProtocols`, `preferServerCiphers`) are all accurate.
- `verificationMode` accepts `none | relaxed | strict | once`; the post's usage (`none`, `relaxed`, `strict`) is correct.
- The `openssl req` command, file permissions, and `curl --cacert` example are all valid.
- Minor future improvement: the post could mention that self-signed certs require either `loadDefaultCAFile=false` with an explicit `caConfig` on the client, or `--accept-invalid-certificate`, otherwise verification will fail — but this is an enhancement, not a correctness issue.
