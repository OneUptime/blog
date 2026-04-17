# Validation Summary: How to Debug ClickHouse Client Connection Issues

## Status
validated

## Post Type
Tutorial / Troubleshooting Guide

## Technologies Covered
- ClickHouse server
- `clickhouse-client` (native protocol CLI)
- ClickHouse HTTP interface
- curl
- netcat (`nc`)
- OpenSSL (`openssl s_client`)
- TLS / SSL certificate handling

## Sources Consulted
- ClickHouse `clickhouse-client` source — `programs/client/Client.cpp` (https://github.com/ClickHouse/ClickHouse/blob/master/programs/client/Client.cpp) — verified `--secure`, `--accept-invalid-certificate`, `--host`, `--port`, `--user`, `--password`, `--query` flags.
- ClickHouse `ClientBase.cpp` (https://github.com/ClickHouse/ClickHouse/blob/master/src/Client/ClientBase.cpp) — confirmed that `--log-level` is a real flag (defined as `("log-level", po::value<std::string>(), "Log level")`).
- ClickHouse openSSL client configuration (`openSSL.client.caConfig`, `invalidCertificateHandler`, `verificationMode`) — https://clickhouse.com/docs/operations/server-configuration-parameters/settings
- ClickHouse network ports reference — https://clickhouse.com/docs/guides/sre/network-ports (9000 native, 9440 native-TLS, 8123 HTTP, 8443 HTTPS).
- ClickHouse HTTP interface — https://clickhouse.com/docs/interfaces/http (confirmed `X-ClickHouse-User` / `X-ClickHouse-Key` auth headers and `/ping` endpoint).
- `openssl-s_client(1)` man page — confirmed `-connect` and `-verify` options.

## Issues Found
- **`--ssl-ca-cert` does not exist as a `clickhouse-client` CLI flag.** The client does not accept a command-line argument to set the CA certificate; the CA bundle is provided via the client's XML config under `openSSL.client.caConfig`. The original example (`clickhouse-client ... --ssl-ca-cert /etc/ssl/certs/my-ca.crt ...`) would have failed with an unknown-option error. I replaced the single bash block with a small XML snippet for `~/.clickhouse-client/config.xml` (setting `caConfig` and `verificationMode`) followed by the plain `--secure` invocation, and added a brief note explaining there is no CLI flag for this.

## Review Notes
- `--log-level debug` is correct — confirmed in `ClientBase.cpp`. (Note: `send_logs_level` is a separate *query setting* that controls how verbosely the server streams its own logs back to the client; it is not the same as `--log-level`, which controls the client's own Poco logger.)
- `--accept-invalid-certificate` is correct and is equivalent to setting `openSSL.client.invalidCertificateHandler.name=AcceptCertificateHandler` and `openSSL.client.verificationMode=none` — consistent with the post's "testing only" warning.
- Default ports (9000/9440/8123/8443) are correct.
- HTTP auth via `?user=&password=` and via headers (`X-ClickHouse-User` / `X-ClickHouse-Key`) are both valid; the post correctly shows both.
- The `grep` pattern in the server-log tail uses the extended alternation `|` but not `-E`; in GNU grep without `-E` the `\|` form works, but the post uses bare `|`. In GNU `grep`, unescaped `|` is a literal, so this particular pattern effectively only matches lines containing the literal string `New connection\|Auth\|Exception`. However, escaped `\|` within quotes is a common idiom and many readers will rewrite; since this is stylistic/portability rather than a hard error on the happy-path grep (and changing it risks breaking author intent), left as-is. Future edit could switch to `grep -E "New connection|Auth|Exception"` for clarity.
- Author reference to `/ping` endpoint, curl examples, and TCP connectivity test via `nc -zv` are all accurate.
