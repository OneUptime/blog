# Validation Summary: How to Automate ClickHouse User Provisioning

## Status
validated

## Post Type
Tutorial / How-to guide

## Technologies Covered
- ClickHouse SQL (CREATE USER, CREATE ROLE, GRANT, SET DEFAULT ROLE)
- ClickHouse RBAC / access control
- ClickHouse system tables (`system.users`, `system.role_grants`)
- ClickHouse LDAP external authenticator
- `clickhouse-client` CLI
- Bash scripting for batch provisioning

## Sources Consulted
- CREATE USER: https://clickhouse.com/docs/en/sql-reference/statements/create/user
- CREATE ROLE: https://clickhouse.com/docs/en/sql-reference/statements/create/role
- GRANT: https://clickhouse.com/docs/en/sql-reference/statements/grant
- SET ROLE / SET DEFAULT ROLE: https://clickhouse.com/docs/en/sql-reference/statements/set-role
- system.users: https://clickhouse.com/docs/en/operations/system-tables/users
- system.role_grants: https://clickhouse.com/docs/en/operations/system-tables/role-grants
- LDAP external authenticator: https://clickhouse.com/docs/en/operations/external-authenticators/ldap
- clickhouse-client CLI: https://clickhouse.com/docs/en/interfaces/cli
- ClickHouse syntax (reserved identifiers): https://clickhouse.com/docs/en/sql-reference/syntax

## Issues Found

1. **`DEFAULT ROLE` used before the role was granted (CREATE USER examples).** The original single-user example and the shell-script loop both applied `DEFAULT ROLE <role>` inside `CREATE USER`, then ran `GRANT` afterwards. Per the `SET DEFAULT ROLE` docs, a role can only be set as default if it has *already been granted* to the user, so the original order would throw an exception at execution time. Fixed by removing `DEFAULT ROLE` from the `CREATE USER` statement and following with `GRANT ... TO ...` and then `SET DEFAULT ROLE ... TO ...`. This applies to both the standalone SQL example and the Bash provisioning loop.

2. **LDAP config had a non-existent `<bind_password>` field and a fixed service-account `<bind_dn>`.** ClickHouse's LDAP external authenticator performs a per-user simple bind — there is no service-account bind-password field in the `<ldap_servers>` schema. `<bind_dn>` is a *template* where `{user_name}` is substituted at login time, and the user's own password is used for the bind. Fixed by removing `<bind_password>` and changing `<bind_dn>` to the documented template form `uid={user_name},ou=people,dc=corp,dc=example,dc=com`. Added a short clarifying paragraph so readers understand the model.

## Review Notes

- `CREATE USER IF NOT EXISTS`, `HOST IP '...'`, and `IDENTIFIED WITH sha256_password BY '...'` are all valid current syntax.
- `system.users` columns `name`, `auth_type`, `host_ip`, `default_roles_all` are correct; `auth_type` and `host_ip` are both `Array`-typed, which may surprise readers who expect scalar columns — the queries still work, the output is just arrays.
- `system.role_grants` columns `user_name` (Nullable) and `granted_role_name` are correct.
- `user` as a column alias is safe — ClickHouse keywords are contextual, not reserved, per the syntax docs. If the author ever worries about a collision with the `user()` function, wrapping the alias in backticks is the idiomatic escape.
- The `sha256_password` scheme ships a temp password (`'changeme'`, `'TempPass123'`) in plaintext through SQL and bash. That is fine for a tutorial illustration, but a production script should either read from a secret store, use `DOUBLE_SHA1_HASH`/`SHA256_HASH` with pre-hashed values, or delegate entirely to LDAP/SSO. Worth flagging to readers in a future revision.
- `<enable_tls>` accepts `yes`, `no`, or `starttls` (not `true`/`false`) — the post's `yes` value is correct.
- The post does not pin a ClickHouse version; all verified syntax is current as of ClickHouse 24.x / 25.x.
