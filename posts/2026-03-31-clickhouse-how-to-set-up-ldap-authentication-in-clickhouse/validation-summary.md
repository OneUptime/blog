# Validation Summary: How to Set Up LDAP Authentication in ClickHouse

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- ClickHouse (LDAP external authenticator, user directories, RBAC)
- LDAP / OpenLDAP
- Microsoft Active Directory
- LDAPS (LDAP over TLS)
- ClickHouse `system.session_log` system table

## Sources Consulted
- ClickHouse official docs: External Authenticators — LDAP (https://clickhouse.com/docs/en/operations/external-authenticators/ldap)
- ClickHouse official docs: `system.session_log` (https://clickhouse.com/docs/en/operations/system-tables/session_log)

## Issues Found
1. **Incorrect column name in `system.session_log` query.** The "Check failed logins" SQL selected a `message` column, which does not exist in `system.session_log`. The correct column for the login failure reason is `failure_reason`. Updated the SELECT list accordingly.
2. **Redundant / conflicting AD config using deprecated fields.** The "Configuring Search Bind for AD" example declared both the deprecated `auth_dn_prefix` / `auth_dn_suffix` and the modern `bind_dn` templates on the same server. Per the official docs, `auth_dn_prefix`/`auth_dn_suffix` are an alternative to `bind_dn` (superseded), so mixing them is misleading. Removed the deprecated fields and kept the `bind_dn` template plus the `user_dn_detection` block, which is the canonical modern pattern for AD search bind.

## Review Notes
- All other LDAP server config fields (`host`, `port`, `bind_dn`, `verification_cooldown`, `enable_tls`, `tls_require_cert`, `tls_ca_cert_file`, `tls_minimum_protocol_version`) are valid and documented.
- The `user_directories` → `ldap` section with `roles` and `role_mapping` (`base_dn`, `attribute`, `scope`, `search_filter`, `prefix`) matches the official schema.
- The three bind DN template styles shown (OpenLDAP uid, AD userPrincipalName, AD sAMAccountName with `COMPANY\` prefix) are all valid `bind_dn` templates.
- `users.xml` per-user `<ldap><server>…</server></ldap>` block is the correct syntax.
- `clickhouse-client` flags (`--host`, `--user`, `--password`, `--query`) used in the test command are current.
- The post does not mention a specific ClickHouse version; the covered LDAP and session_log features have been stable across recent releases, so the guidance should be broadly applicable.
