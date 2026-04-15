# Validation Summary: How to Use LDAP Authentication in ClickHouse

## Status
validated

## Post Type
Tutorial / Configuration Guide

## Technologies Covered
- ClickHouse (LDAP external authenticator feature)
- LDAP / LDAPv3
- Active Directory
- OpenLDAP
- TLS/SSL for LDAP connections

## Sources Consulted
- ClickHouse official documentation on LDAP external authenticators: https://clickhouse.com/docs/en/operations/external-authenticators/ldap
- ClickHouse official documentation on external user directories: https://clickhouse.com/docs/en/operations/external-authenticators/ldap#ldap-external-user-directory

## Issues Found

### 1. Incorrect `role_mappings` element name and structure
**What was wrong:** The post used `<role_mappings><mapping>...</mapping></role_mappings>` as the XML structure for mapping LDAP groups to ClickHouse roles. The correct element name is `<role_mapping>` (singular, no nested `<mapping>` wrapper). Children (`base_dn`, `scope`, `search_filter`, `attribute`, `prefix`) go directly inside `<role_mapping>`.
**What was changed:** Replaced `<role_mappings><mapping>` with `<role_mapping>` and removed the wrapper element.

### 2. Role mapping placed in wrong config section
**What was wrong:** The post placed `role_mapping` inside the `<ldap_servers>/<corporate_ldap>` block. According to official documentation, `role_mapping` belongs inside `<user_directories>/<ldap>`, not inside `ldap_servers`.
**What was changed:** Moved the role mapping configuration into a proper `<user_directories>/<ldap>` block with the correct structure, including the `<server>`, `<roles>`, and `<role_mapping>` elements.

### 3. Non-existent `allow_ldap_server` option
**What was wrong:** The post referenced a "built-in `allow_ldap_server` option in `users.xml`" for allowing any LDAP user to authenticate. This option does not exist in ClickHouse. The correct mechanism is the `<user_directories>/<ldap>` configuration block.
**What was changed:** Replaced the section with an explanation of the `user_directories` approach, which is the actual mechanism for auto-creating users from LDAP on first login.

### 4. Misleading `{ldap_user}` SQL placeholder
**What was wrong:** The post showed `CREATE USER '{ldap_user}' IDENTIFIED WITH ldap SERVER 'corporate_ldap'` and claimed ClickHouse creates a user entry on first successful login via this SQL syntax. SQL `CREATE USER` does not support template placeholders. Auto-creation of users happens via the `user_directories` mechanism, not SQL.
**What was changed:** Removed the incorrect SQL example and replaced the section with an accurate explanation of how `user_directories` enables automatic user creation on first LDAP login.

### 5. Missing `scope` parameter in role mapping
**What was wrong:** The role mapping example did not include the `<scope>` parameter.
**What was changed:** Added `<scope>subtree</scope>` to the role mapping configuration, which is the default and most commonly used value.

### 6. Search filter placeholder in role mapping
**What was wrong:** The role mapping search filter used `{user_dn}` which requires `user_dn_detection` to be configured. In the `user_directories` context, `{bind_dn}` is more commonly used and works without additional configuration.
**What was changed:** Changed `{user_dn}` to `{bind_dn}` in the role mapping search filter to be consistent with the documentation examples.

## Review Notes
- The LDAP server definition (`ldap_servers` block), user definition in `users.xml`, SQL `CREATE USER` syntax, Active Directory bind DN examples, verification commands, and troubleshooting section are all technically accurate.
- The `user_dn_detection` section in the LDAP server config is correctly placed and uses valid parameters.
- The XML escaping of `&` as `&amp;` in search filters is correctly applied throughout.
- The `enable_tls` value of `yes` is correct per ClickHouse docs (valid values are `no`, `yes`, `starttls`).
- This feature is not available in ClickHouse Cloud, which the post does not mention. This could be worth noting in a future update.
