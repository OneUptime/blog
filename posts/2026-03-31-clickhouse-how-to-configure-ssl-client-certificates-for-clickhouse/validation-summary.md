# Validation Summary: How to Configure SSL Client Certificates for ClickHouse

## Status
validated

## Post Type
Tutorial / How-to guide

## Technologies Covered
- ClickHouse (server config.xml, users.xml, system.session_log)
- OpenSSL (CA / server / client certificate generation)
- mutual TLS (mTLS)
- `clickhouse-client` CLI
- `clickhouse-driver` (Python)
- `@clickhouse/client` (Node.js / TypeScript)

## Sources Consulted
- ClickHouse client source (Client.cpp) for SSL/TLS CLI flags — https://github.com/ClickHouse/ClickHouse/blob/master/programs/client/Client.cpp
- ClickHouse CLI interfaces docs — https://clickhouse.com/docs/interfaces/cli
- ClickHouse JavaScript client docs — https://clickhouse.com/docs/integrations/language-clients/javascript
- ClickHouse server openSSL configuration reference (config.xml / users.xml) — ClickHouse operations/server-configuration-parameters and user-guides/sql-users-and-roles
- `clickhouse-driver` Python library features — https://clickhouse-driver.readthedocs.io/en/latest/features.html

## Issues Found
1. **Step 6 — clickhouse-client SSL flags were incorrect.** The original draft passed `--ssl-ca-cert-file`, `--ssl-cert-file`, and `--ssl-key-file` to `clickhouse-client`. These flags do not exist in the native `clickhouse-client` binary. The client only exposes `--secure`, `--no-secure`, `--accept-invalid-certificate`, and `--tls-sni-override` for TLS on the command line; certificate paths must be supplied through a client config file (`~/.clickhouse-client/config.xml` or one passed with `--config-file`) using the `<openSSL><client>` section. Replaced the invalid flags with a correct client `config.xml` snippet plus the working `clickhouse-client --secure` invocation.
2. **Node.js example — used `host` instead of `url`.** The `@clickhouse/client` documentation specifies `url: 'https://<hostname>:<port>'` as the connection parameter. Changed `host` to `url` to match the documented API.

## Review Notes
- The OpenSSL certificate generation commands (CA, server CSR/cert, client CSR/cert, `CAcreateserial`) are valid and follow standard x509 signing practice.
- The server-side `<openSSL>` fields (`certificateFile`, `privateKeyFile`, `caConfig`, `verificationMode`, `loadDefaultCAFile`, `cacheSessions`, `disableProtocols`, `preferServerCiphers`) match ClickHouse's documented openSSL section. `verificationMode=strict` combined with `caConfig` is what actually enforces mTLS on the server side.
- `<ssl_certificates><common_name>` in `users.xml` is the documented way to bind a ClickHouse user to a client certificate's CN; `<networks><ip>::/0</ip></networks>` is intentionally permissive since authentication is now certificate-based.
- Ports 8443 (HTTPS) and 9440 (native secure TCP) are the conventional defaults but are only exposed when declared via `<https_port>` / `<tcp_port_secure>`, as shown.
- `clickhouse-driver`'s `Client(secure=True, verify=True, ca_certs=..., certfile=..., keyfile=...)` parameter names are correct and are passed through to the underlying SSL context.
- Users should be aware that `disableProtocols>sslv2,sslv3` leaves TLS 1.0/1.1 enabled; for stricter deployments consider adding `tlsv1,tlsv1_1` and setting a modern `cipherList`. This is a hardening suggestion, not a bug.
- `system.session_log` filtering by `interface = 'TCP'` will miss HTTPS sessions on port 8443 (those use the `HTTP` interface). Mentioning that or removing the filter could make the monitoring query more broadly useful.
