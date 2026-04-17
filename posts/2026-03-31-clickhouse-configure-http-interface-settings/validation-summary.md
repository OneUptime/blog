# Validation Summary: How to Configure ClickHouse HTTP Interface Settings

## Status
validated

## Post Type
Tutorial / Configuration Guide

## Technologies Covered
- ClickHouse HTTP/HTTPS interface
- ClickHouse `config.xml` and `users.xml` configuration
- ClickHouse HTTP handlers (`static`, `dynamic_query_handler`)
- HTTP response compression (`enable_http_compression`, `http_zlib_compression_level`)
- CORS configuration via `http_options_response`
- HTTP sessions via `session_id`
- `curl` for HTTP client testing
- `iptables` for firewall-based port restriction
- nginx reverse proxy (mentioned)

## Sources Consulted
- [ClickHouse HTTP Interface documentation](https://clickhouse.com/docs/en/interfaces/http)
- [ClickHouse default config.xml on GitHub](https://github.com/ClickHouse/ClickHouse/blob/master/programs/server/config.xml)
- [ClickHouse Issue #18693 - CORS preflight support](https://github.com/ClickHouse/ClickHouse/issues/18693)
- [ClickHouse PR #29155 - Add CORS support](https://github.com/ClickHouse/ClickHouse/pull/29155)

## Issues Found

1. **Invalid HTTP handler type `<type>query</type>`** — The handler example in "Configuring HTTP Handlers" used `<type>query</type>`, which is not a valid ClickHouse handler type. Valid handler types are `predefined_query_handler`, `dynamic_query_handler`, `static`, and `redirect`. Fixed by replacing with `<type>dynamic_query_handler</type>` and adding the required `<query_param_name>` child, which is the correct way to run arbitrary client-supplied SQL from a POST body/parameter.

2. **"Enabling Response Compression" section showed a CORS config instead** — The XML snippet under the compression heading was actually `http_options_response` with `Access-Control-Allow-Origin: *`, which is the CORS OPTIONS-response mechanism, not compression. Replaced the snippet with the correct compression settings (`enable_http_compression` and `http_zlib_compression_level`) defined in a user profile in `users.xml`, which is how ClickHouse actually enables server-side HTTP response compression. The duplicate/correct CORS example remains in the later "CORS Configuration" section.

## Review Notes
- The default HTTP port (8123) and HTTPS port (8443) are correct.
- `keep_alive_timeout` is a valid server-level setting in `config.xml`. The `http_connection_timeout`, `http_send_timeout`, and `http_receive_timeout` values are typically user/profile-level settings (e.g., in `users.xml`), but ClickHouse accepts these names and they are commonly shown as profile defaults; the author's placement under a `config.xml` comment is acceptable in practice as these can be defined as top-level defaults, though strict readers may prefer them in `users.xml`.
- The `session_id` example using `SET max_memory_usage=10G` followed by `getSetting('max_memory_usage')` will work as shown, provided the same session is reused with identical credentials and within the `default_session_timeout`.
- URL-encoded curl queries use `+` for spaces — this is correct for query strings.
- The post could eventually be augmented to mention the newer `http_response_headers` and `common_http_response_headers` settings, but the existing `http_options_response` example remains valid.
