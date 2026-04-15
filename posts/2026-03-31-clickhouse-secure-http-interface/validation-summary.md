# Validation Summary: How to Secure ClickHouse HTTP Interface

## Status
validated

## Post Type
Guide

## Technologies Covered
- ClickHouse (HTTP interface, OpenSSL configuration, HTTP handlers, system tables)
- TLS/SSL configuration
- Nginx (reverse proxy, rate limiting, IP allowlisting)
- HTTP Basic Authentication
- CORS (Cross-Origin Resource Sharing)

## Sources Consulted
- ClickHouse Configuring SSL-TLS guide: https://clickhouse.com/docs/en/guides/sre/configuring-ssl
- ClickHouse OpenSSL server configuration: https://clickhouse.com/docs/en/operations/server-configuration-parameters/settings#openssl
- ClickHouse Configuration Files (remove attribute): https://clickhouse.com/docs/operations/configuration-files
- ClickHouse system.query_log documentation: https://clickhouse.com/docs/en/operations/system-tables/query_log
- ClickHouse HTTP Interface documentation: https://clickhouse.com/docs/en/interfaces/http
- ClickHouse http_options_response documentation: https://clickhouse.com/docs/operations/server-configuration-parameters/settings

## Issues Found

1. **`requireTLSv1_2` is not a valid ClickHouse setting.** The post used `<requireTLSv1_2>true</requireTLSv1_2>` in the OpenSSL server config. ClickHouse controls minimum TLS version via the `<disableProtocols>` setting. Changed to `<disableProtocols>sslv2,sslv3,tlsv1,tlsv1_1</disableProtocols>` which enforces TLS 1.2 as the minimum.

2. **`interface` column in `system.query_log` is `UInt8`, not a string.** The post filtered with `WHERE interface = 'HTTP'`, which would cause a type error or return no results. The correct value for HTTP is the integer `2`. Changed to `WHERE interface = 2`.

3. **`predefined_query_handler` requires a `<query>` child element.** The `http_handlers` example defined a `predefined_query_handler` without the mandatory `<query>` element. This would cause a configuration error on server startup. Added `<query>SELECT 1</query>` as a placeholder.

4. **`remove="true"` is not the canonical attribute value.** The official Configuration Files documentation specifies `remove="remove"` as the correct attribute value for removing inherited config elements. Updated from `remove="true"` to `remove="remove"`.

## Review Notes
- The Nginx config uses `proxy_ssl_verify off` which is acceptable for internal networks but should be noted as a security trade-off — in higher-security environments, the proxy should verify the upstream ClickHouse certificate.
- The `limit_req` directive references a zone `clickhouse_api` that must be defined in the `http` block (not shown in the snippet). This is standard Nginx practice and the snippet is a partial config, so this is acceptable.
- The Base64 encoding `YWRtaW46U2VjdXJlUGFzcyExMjM=` was verified to correctly encode `admin:SecurePass!123`.
