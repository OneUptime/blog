# Validation Summary: How to Use ClickHouse LDAP Proxy

## Status
validated

## Post Type
Tutorial / Configuration Guide

## Technologies Covered
- ClickHouse
- LDAP (Lightweight Directory Access Protocol)
- Active Directory
- TLS/SSL

## Sources Consulted
- ClickHouse official documentation — LDAP external authenticator: https://clickhouse.com/docs/operations/external-authenticators/ldap
- ClickHouse guide — Configuring LDAP for Authentication and Role Mapping: https://clickhouse.com/docs/guides/sre/configuring-ldap
- ClickHouse official documentation — Users and roles settings: https://clickhouse.com/docs/operations/settings/settings-users

## Issues Found

1. **`<tls_verify_certificate>` is not a valid element name** (line 31). The correct element is `<tls_require_cert>` with allowed values: `never`, `allow`, `try`, `demand`. Changed `<tls_verify_certificate>yes</tls_verify_certificate>` to `<tls_require_cert>demand</tls_require_cert>`.

2. **`<allow_ddl>` inside `<databases>` is not valid** (lines 51-55). The `<databases>` section in a user definition is used exclusively for row-level security filters (via `<filter>` sub-elements), not for DDL control. Replaced with a valid `<networks>` block, which is a common element in user definitions.

3. **LDAP group-to-role mapping section was entirely incorrect** (lines 64-76). The elements `<ldap_dn_regex>` and `<role_name>` do not exist in ClickHouse's LDAP configuration. Role mapping is not done inside a user's `<ldap>` block in `users.xml`; it is configured in the `<user_directories>` section using `<role_mapping>` with `<base_dn>`, `<scope>`, `<search_filter>`, `<attribute>`, and `<prefix>` elements. Rewrote the entire section with the correct structure and explanation.

4. **Roles syntax in `<user_directories>` was incorrect** (lines 97-98). Roles are specified as self-closing XML tags with the role name as the element name (e.g., `<analyst_role />`), not as `<role_name>analyst_role</role_name>`. Fixed the syntax.

## Review Notes
- The blog title says "LDAP Proxy" but ClickHouse does not have an "LDAP Proxy" feature. The official documentation refers to this as "LDAP external authenticator" and "LDAP external user directory." The title is a misnomer but was not changed since the file/directory name would also need to change.
- The post does not mention the `<user_dn_detection>` sub-section of the LDAP server configuration, which can be useful for automatically detecting user DNs instead of relying solely on `bind_dn` templates. This could be a useful addition in a future update.
- Multiple `<role_mapping>` sections can be defined within a single `<user_directories><ldap>` block for more complex group-to-role mappings.
