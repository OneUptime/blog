# Validation Summary: How to Harden ClickHouse Server for Production

## Status
validated

## Post Type
Tutorial / Security hardening guide

## Technologies Covered
- ClickHouse server configuration (config.xml, users.xml)
- ClickHouse SQL (CREATE USER, GRANT)
- OpenSSL / TLS configuration
- UFW (Uncomplicated Firewall)
- Linux filesystem permissions and PAM limits (limits.conf)

## Sources Consulted
- [ClickHouse system.session_log documentation](https://clickhouse.com/docs/en/operations/system-tables/session_log)
- [ClickHouse Configuration Files documentation](https://clickhouse.com/docs/operations/configuration-files)
- [ClickHouse default config.xml (GitHub)](https://github.com/ClickHouse/ClickHouse/blob/master/programs/server/config.xml)
- [ClickHouse System Tables Overview](https://clickhouse.com/docs/operations/system-tables/overview)
- ClickHouse docs on CREATE USER, TLS/OpenSSL configuration, query_log, and server settings

## Issues Found
- **`access_log` is not a real ClickHouse system log.** Section 8 originally configured an `<access_log>` block referencing a `system.access_log` table, and the Summary referenced `system.access_log`. ClickHouse has no such table. The correct table for recording authentication/login/logout events is `system.session_log`, configured via a `<session_log>` XML block. Fixed both the Section 8 XML snippet and the Summary wording to reference `session_log` instead.

## Review Notes
- The rest of the configuration is accurate: `<openSSL>` / `<server>` block with `certificateFile`, `privateKeyFile`, `caConfig`, `verificationMode`, `requireTLSv1_2`, and `cipherList` are all valid tags; `<http_port remove="true"/>` / `<tcp_port remove="true"/>` style removal is supported by ClickHouse's config merging; `<listen_host>`, `<query_log>` with `partition_by`/`ttl`, and the profile resource limits (`max_execution_time`, `max_memory_usage`, `max_rows_to_read`) are all valid.
- `CREATE USER ... IDENTIFIED WITH sha256_password BY '...' HOST IP '10.0.0.0/8'` is valid ClickHouse SQL.
- Note on the "Disable the Default User" section: setting `<access_management>0</access_management>` only prevents the default user from managing SQL-based access control; it does not disable the user. Setting a strong password (as shown) is what effectively removes the passwordless-login risk. The wording is slightly imprecise but not technically wrong, so left as-is per the "fix only what is wrong" guidance.
- `<verificationMode>relaxed</verificationMode>` is accepted but for production, `strict` is generally preferred when mutual TLS is in use. Left as-is — not incorrect, just a style preference.
- Firewall example uses UFW; readers on non-Ubuntu/Debian systems will need to translate to `firewalld`/`nftables`/`iptables`. This is a common convention and not an error.
