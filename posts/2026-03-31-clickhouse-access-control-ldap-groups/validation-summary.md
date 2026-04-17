# Validation Summary: How to Set Up ClickHouse Access Control with LDAP Groups

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- ClickHouse (access control, external authenticators, system tables)
- LDAP (Active Directory / OpenLDAP)
- XML configuration (`config.xml`, `users.xml`)
- SQL (CREATE ROLE, GRANT, SHOW CURRENT ROLES, system tables)

## Sources Consulted
- ClickHouse LDAP external authenticators documentation: https://clickhouse.com/docs/operations/external-authenticators/ldap
- ClickHouse SHOW statement reference: https://clickhouse.com/docs/sql-reference/statements/show
- ClickHouse `system.role_grants` system table: https://clickhouse.com/docs/operations/system-tables/role-grants

## Issues Found
1. **Role mapping was configured in the wrong file/section.** The original post placed an `<ldap_roles>` block inside `<users>` in `users.xml`. Per the official ClickHouse docs, LDAP role mapping is configured as an external user directory under `<user_directories>` in `config.xml` (not in `users.xml`). Fixed by rewriting the section to use `<user_directories><ldap>...</ldap></user_directories>` in `config.xml`.
2. **Wrong XML element names for role mapping.** The post used `<ldap_roles>` with nested `<role>` elements. The correct element is `<role_mapping>` (one per mapping rule), a direct child of `<ldap>` inside `<user_directories>`. Updated both the main mapping example and the "Handling Multiple Group Sources" example.
3. **Nonexistent caching setting.** The "Refreshing Group Membership" section referenced `ldap_roles_cache_ttl_min` / `<roles_cache_ttl_min>`, which do not exist in ClickHouse. Replaced with the documented `verification_cooldown` setting (a server-level setting in seconds that caches successful bind + role mapping results) and corrected the surrounding explanation — LDAP authentication is actually re-evaluated on each request unless this cooldown is set.
4. **Role name inconsistency.** ClickHouse roles were defined as `clickhouse_analysts`/`clickhouse_engineers`/`clickhouse_admins`, but the mapping used `<prefix>clickhouse_</prefix>`, which strips that prefix — so the actual role names looked up in ClickHouse would be `analysts`/`engineers`/`admins`. Renamed the `CREATE ROLE` / `GRANT` statements to use the stripped names so the example is internally consistent.

## Review Notes
- The `enable_tls`, `tls_ca_cert_file`, `bind_dn`, `bind_password`, and `user_dn_detection` sub-elements used in the `<ldap_servers>` example are all valid per the official docs.
- `SHOW CURRENT ROLES` is a valid ClickHouse SQL statement.
- `system.role_grants` column names `user_name`, `granted_role_name`, and `with_admin_option` are correct.
- The post uses ```text``` fenced code blocks for XML snippets; this is a stylistic choice and was left untouched (```xml``` would syntax-highlight, but the existing choice is not technically wrong).
- `verification_cooldown` caches the authentication + role lookup result for all subsequent requests within the window; future posts may want to call out explicitly that it is *not* a per-role TTL.
