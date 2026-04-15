# Validation Summary: ClickHouse Security Hardening Checklist

## Status
validated

## Post Type
Checklist / Reference Guide

## Technologies Covered
- ClickHouse (server configuration, SQL, access control)
- OpenSSL / TLS (via Poco library used by ClickHouse)
- XML-based ClickHouse configuration (users.d/, config.xml)

## Sources Consulted
- ClickHouse official documentation on SSL/TLS configuration (https://clickhouse.com/docs/en/guides/sre/configuring-ssl)
- ClickHouse default config.xml from GitHub repository (programs/server/config.xml)
- Poco SSLManager documentation (underlying TLS library used by ClickHouse) for valid OpenSSL configuration properties
- ClickHouse documentation on access control and RBAC (https://clickhouse.com/docs/en/guides/sre/user-management/configuring-access-control)
- ClickHouse documentation on encryption at rest (https://clickhouse.com/docs/en/operations/storing-data#encrypted-virtual-file-system)
- ClickHouse documentation on system.query_log (https://clickhouse.com/docs/en/operations/system-tables/query_log)

## Issues Found

### 1. TLS configuration used `requireTLSv1_2` instead of `disableProtocols` (Fixed)
**What was wrong:** The OpenSSL configuration snippet used `<requireTLSv1_2>true</requireTLSv1_2>` to enforce TLS 1.2 minimum. While this is a technically valid Poco library setting, it only requires that TLS 1.2 is available — it does not disable older protocols (SSLv2, SSLv3, TLS 1.0, TLS 1.1). The standard ClickHouse approach, as shown in the official default config.xml, is to use `<disableProtocols>` to explicitly disable older, insecure protocols.

**What was changed:** Replaced `<requireTLSv1_2>true</requireTLSv1_2>` with `<disableProtocols>sslv2,sslv3,tlsv1,tlsv1_1</disableProtocols>`. Also added `<loadDefaultCAFile>true</loadDefaultCAFile>` (loads system CA certificates, standard in official config) and `<preferServerCiphers>true</preferServerCiphers>` (ensures the server's cipher preference order is used, a security best practice).

**Why:** A security hardening guide must use the mechanism that actually prevents downgrade attacks. `disableProtocols` is the authoritative way to enforce minimum TLS versions in ClickHouse and is what the official documentation recommends.

## Review Notes
- The TLS snippet is shown as a fragment without the surrounding `<clickhouse>` root element. This is acceptable for a snippet but readers should be aware it needs to be placed inside the `<clickhouse>` element in their config.
- The snippet does not show the port configuration (`<https_port>8443</https_port>` and `<tcp_port_secure>9440</tcp_port_secure>`) that must be set separately from the `<openSSL>` block to actually enable the secure ports. The checklist items mention these ports, but a reader following only the XML example would miss enabling them.
- The authentication example correctly uses `password_sha256_hex`. ClickHouse also supports `password_double_sha1_hex` and bcrypt (`password_bcrypt`), but SHA-256 is a good recommendation for the checklist.
- The RBAC SQL syntax (CREATE ROLE, GRANT) is correct for ClickHouse.
- The `system.query_log` query is correct — column names (`event_time`, `user`, `query`, `read_rows`) and the `type = 'QueryStart'` filter are all valid.
- The encryption at rest section correctly references AES_128_CTR and AES_256_CTR codecs and the `storage_policy` approach.
