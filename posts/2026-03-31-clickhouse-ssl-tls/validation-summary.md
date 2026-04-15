# Validation Summary: How to Configure ClickHouse SSL/TLS for Secure Connections

## Status
validated

## Post Type
Tutorial / Configuration Guide

## Technologies Covered
- ClickHouse (server and clickhouse-client)
- OpenSSL (certificate generation, DH parameters, s_client verification)
- TLS/SSL (HTTPS, secure native TCP, mTLS, interserver encryption)
- Poco C++ Libraries (underlying SSL implementation used by ClickHouse)

## Sources Consulted
- ClickHouse official documentation: Configuring SSL guide (https://clickhouse.com/docs/en/guides/sre/configuring-ssl)
- ClickHouse official documentation: Server configuration parameters (https://clickhouse.com/docs/en/operations/server-configuration-parameters/settings)
- ClickHouse official documentation: CLI interface (https://clickhouse.com/docs/en/interfaces/cli)
- ClickHouse official documentation: Configuration files and reload (https://clickhouse.com/docs/en/operations/configuration-files)
- ClickHouse official documentation: SYSTEM statements (https://clickhouse.com/docs/en/sql-reference/statements/system)
- ClickHouse official documentation: SSL for ZooKeeper (https://clickhouse.com/docs/en/operations/ssl-zookeeper)
- ClickHouse source code: programs/client/Client.cpp (command-line option definitions)

## Issues Found

### 1. Invalid clickhouse-client CLI flags for mTLS (`--certificate` and `--privatekey`)

**What was wrong:** The mTLS section showed connecting with `--certificate /path/to/client.crt` and `--privatekey /path/to/client.key` as clickhouse-client command-line flags. According to the ClickHouse client source code (Client.cpp), these flags do not exist. The only TLS-related CLI flags are `--secure`, `--no-secure`, `--accept-invalid-certificate`, and `--tls-sni-override`. Client certificates for mTLS must be configured through the client XML config file, not CLI flags.

**What was changed:** Replaced the incorrect CLI command with the correct approach: configuring client certificate settings in the client XML config file (`/etc/clickhouse-client/config.xml`) using `<openSSL><client><certificateFile>` and `<privateKeyFile>` elements, then connecting with the standard `--secure` flag.

**Why:** Using non-existent CLI flags would cause clickhouse-client to fail with an "unknown option" error, preventing users from establishing mTLS connections.

## Review Notes
- The blog's claim that "ClickHouse reloads its certificate on SIGHUP" is commonly referenced in the community. The official docs confirm ClickHouse automatically tracks config file changes and reloads on the fly. SIGHUP likely also triggers a reload, but the automatic detection mechanism is the primary documented approach.
- The approach of commenting out `<http_port>` to disable plain HTTP works when editing the main `config.xml` directly. If using a `config.d/` drop-in override, you may need `<http_port remove="remove"/>` instead, since ClickHouse merges configs and the base `config.xml` typically defines `<http_port>8123</http_port>` by default.
- All port numbers are correct: HTTP 8123, HTTPS 8443, native TCP 9000, native TCP secure 9440, interserver HTTP 9009, interserver HTTPS 9010.
- All OpenSSL XML configuration elements are correct: `certificateFile`, `privateKeyFile`, `dhParamsFile`, `verificationMode`, `loadDefaultCAFile`, `cacheSessions`, `disableProtocols`, `preferServerCiphers`, `caConfig`, `invalidCertificateHandler`.
- The `verificationMode` values (`none`, `relaxed`, `strict`) and their descriptions are accurate per the Poco SSL library used by ClickHouse.
- The `disableProtocols` format (`sslv2,sslv3,tlsv1,tlsv1_1`) is correct.
- All openssl CLI commands (`req`, `dhparam`, `s_client`) use valid flags and syntax.
- The `--accept-invalid-certificate` flag for clickhouse-client is confirmed valid.
