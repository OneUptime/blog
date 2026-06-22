# Validation Summary: How to Manage ClickHouse Users and Access Control

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- ClickHouse SQL access control
- ClickHouse users and roles
- ClickHouse RBAC grants
- ClickHouse settings profiles
- ClickHouse quotas
- ClickHouse row policies
- ClickHouse LDAP, Kerberos, and SSL certificate authentication

## Sources Consulted
- ClickHouse official documentation for SQL users and roles: https://clickhouse.com/docs/operations/access-rights
- ClickHouse official documentation for `CREATE USER`: https://clickhouse.com/docs/sql-reference/statements/create/user
- ClickHouse official documentation for `ALTER USER`: https://clickhouse.com/docs/sql-reference/statements/alter/user
- ClickHouse official documentation for `CREATE ROLE` and `ALTER ROLE`: https://clickhouse.com/docs/sql-reference/statements/create/role and https://clickhouse.com/docs/sql-reference/statements/alter/role
- ClickHouse official documentation for `GRANT`: https://clickhouse.com/docs/sql-reference/statements/grant
- ClickHouse official documentation for `CREATE SETTINGS PROFILE`: https://clickhouse.com/docs/sql-reference/statements/create/settings-profile
- ClickHouse official documentation for `CREATE QUOTA`: https://clickhouse.com/docs/sql-reference/statements/create/quota
- ClickHouse official documentation for `CREATE ROW POLICY`: https://clickhouse.com/docs/sql-reference/statements/create/row-policy
- ClickHouse official documentation for LDAP authentication: https://clickhouse.com/docs/operations/external-authenticators/ldap
- ClickHouse official documentation for Kerberos authentication: https://clickhouse.com/docs/operations/external-authenticators/kerberos
- ClickHouse official documentation for SSL X.509 certificate authentication: https://clickhouse.com/docs/operations/external-authenticators/ssl-x509
- ClickHouse official documentation for custom settings: https://clickhouse.com/docs/operations/settings/query-level
- ClickHouse official documentation for system quota tables: https://clickhouse.com/docs/operations/system-tables

## Issues Found
1. **Misleading SHA-256 wording**: The user creation example described `IDENTIFIED WITH sha256_password BY 'password'` as using a SHA-256 hash. ClickHouse hashes the supplied password for this form; precomputed hashes use `sha256_hash`. Updated the comment to say "SHA256 password hashing."
2. **Incorrect CLUSTER and REMOTE grant scopes**: The examples used `GRANT CLUSTER ON cluster_name` and `GRANT REMOTE ON 'remote_host:9000'`, which do not match ClickHouse's documented grant grammar. Updated them to `GRANT CLUSTER ON *.*` and `GRANT REMOTE ON *.*`.
3. **Settings profile inheritance and assignment syntax**: The inherited settings profile omitted the quoted profile name, and the assignment examples used `SETTINGS PROFILE` in `ALTER USER` / `ALTER ROLE`, which is not the documented `ALTER` syntax. Updated the examples to use `INHERIT 'analyst_profile'`, `ADD PROFILES 'analyst_profile'`, and `ADD SETTINGS`.
4. **Row policy mode clause order**: The `AS PERMISSIVE` and `AS RESTRICTIVE` examples placed `AS` before `FOR SELECT`, but ClickHouse documents the `AS` clause after `USING`. Reordered those snippets.
5. **Custom setting examples used an undefined setting name**: The row policy examples used `tenant_id` as a session setting. ClickHouse custom settings must use an allowed prefix; in ClickHouse Cloud, custom settings begin with `SQL_`, while self-managed deployments must allow the prefix through `custom_settings_prefixes`. Updated the examples to use `SQL_tenant_id` and added a prerequisite comment.
6. **LDAP bind DN example was not a user bind template**: The LDAP sample used a fixed admin DN, which would not authenticate each ClickHouse user by username as described. Updated it to a `{user_name}`-based bind DN template.
7. **Default role examples omitted role assignment**: The `CREATE USER ... DEFAULT ROLE` examples did not assign the role in the same statement. Updated them to include `ROLE ... DEFAULT ROLE ...`.

## Review Notes
- No local `clickhouse` or `clickhouse-local` binary was available in the workspace, so SQL validation was performed against current official ClickHouse documentation rather than a local parser.
- LDAP, Kerberos, and SSL X.509 authentication are documented as not supported in ClickHouse Cloud; the post uses self-managed configuration paths, so these examples are appropriate for self-managed deployments.
