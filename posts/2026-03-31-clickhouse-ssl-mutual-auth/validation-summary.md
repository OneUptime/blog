# Validation Summary: How to Set Up SSL Mutual Authentication in ClickHouse

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- ClickHouse (server configuration, user management, system tables)
- OpenSSL (certificate generation, CA management)
- Mutual TLS (mTLS) / X.509 certificate authentication
- clickhouse-client (native CLI client)
- clickhouse-connect (Python driver)
- curl (HTTP client for HTTPS interface)

## Sources Consulted
- ClickHouse official docs — Configuring SSL-TLS: https://clickhouse.com/docs/en/guides/sre/configuring-ssl
- ClickHouse official docs — Configuring TLS: https://clickhouse.com/docs/guides/sre/tls/configuring-tls
- ClickHouse official docs — SSL X.509 certificate authentication: https://clickhouse.com/docs/operations/external-authenticators/ssl-x509
- ClickHouse official docs — SSL user certificate auth guide: https://clickhouse.com/docs/guides/sre/ssl-user-auth
- ClickHouse official docs — CREATE USER statement: https://clickhouse.com/docs/sql-reference/statements/create/user
- ClickHouse official docs — Network Ports: https://clickhouse.com/docs/guides/sre/network-ports
- ClickHouse official docs — system.query_log: https://clickhouse.com/docs/operations/system-tables/query_log
- ClickHouse Connect Driver API docs: https://clickhouse.com/docs/integrations/language-clients/python/driver-api
- OpenSSL man pages for genrsa, req, x509

## Issues Found

### 1. clickhouse-client SSL certificate flags do not exist as CLI options
**What was wrong:** The post used `--ssl-ca-cert-file`, `--ssl-cert-file`, and `--ssl-key-file` as command-line flags for `clickhouse-client`. These are not documented CLI flags in ClickHouse. The official method is to configure client SSL certificates through a client XML config file.

**What was changed:** Replaced the single CLI command with a two-step approach: (1) create a client config file at `~/.clickhouse-client/config.xml` with the `<openSSL><client>` settings containing `<caConfig>`, `<certificateFile>`, and `<privateKeyFile>`, then (2) connect using `clickhouse-client --secure` without the non-existent SSL flags.

**Why:** Using undocumented flags would cause the connection command to fail. The config file approach is the officially documented method for passing SSL certificates to clickhouse-client.

### 2. Misleading "Verifying mTLS" section
**What was wrong:** The SQL query comment said "Check whether the current connection is using TLS" and implied the `interface` column in `system.query_log` indicates TLS usage. The `interface` column only identifies the protocol type (TCP=1, HTTP=2, etc.) and does NOT distinguish between encrypted and unencrypted connections.

**What was changed:** Rewrote the section to first show how to verify mTLS by attempting a connection without a client certificate (which should be rejected by the server), then show the query_log query with an accurate comment ("Check recent connections to confirm the authenticated user is connecting") instead of the misleading TLS-detection claim.

**Why:** The original verification method would not actually confirm TLS was in use. Testing that a connection without a client cert is rejected is a direct and reliable way to confirm mTLS enforcement.

## Review Notes
- The mTLS handshake sequence diagram is simplified (omits the CertificateRequest message from server to client, and shows "Encrypted connection established" as a client-to-server message rather than a mutual state). This is acceptable for a high-level blog illustration but is not protocol-accurate.
- The `verificationMode` value `strict` is correct for mTLS. Official ClickHouse examples sometimes use `relaxed` for basic TLS setups, but `strict` is the appropriate value when requiring client certificates, which is the purpose of this post.
- The OpenSSL commands, ClickHouse XML configuration, SQL user creation syntax, Python clickhouse-connect example, curl example, and port numbers (9440/8443) were all verified as correct.
- The certificate rotation section is reasonable but brief — it does not cover CRL configuration in ClickHouse, which would be needed for revoking certificates before expiry.
