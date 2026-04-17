# Validation Summary: How to Create a User in ClickHouse with SQL

## Status
validated

## Post Type
Tutorial / Reference guide

## Technologies Covered
- ClickHouse (SQL-driven access control / RBAC)
- SQL (DDL: CREATE USER, ALTER USER, DROP USER, GRANT, SHOW USERS, SHOW GRANTS)
- ClickHouse authentication methods (sha256_password, sha256_hash, double_sha1_password, bcrypt_password, no_password, LDAP)
- ClickHouse users.xml configuration
- ClickHouse system.users system table

## Sources Consulted
- Official ClickHouse CREATE USER documentation: https://clickhouse.com/docs/en/sql-reference/statements/create/user
- ClickHouse Access Control and Account Management docs: https://clickhouse.com/docs/en/operations/access-rights
- ClickHouse system.users system table reference: https://clickhouse.com/docs/en/operations/system-tables/users
- ClickHouse ALTER USER / DROP USER documentation
- ClickHouse Settings Constraints documentation
- ClickHouse GRANT / SHOW GRANTS syntax reference

## Issues Found
No technical issues found.

All code examples are syntactically correct and reflect current ClickHouse CREATE USER behavior:
- The top-level CREATE USER syntax skeleton matches the official grammar (with minor simplifications — e.g., omitting `OR REPLACE`, `VALID UNTIL`, `IN access_storage_type`, ssh_key/kerberos/ssl_certificate/http authenticators — which is acceptable scope trimming for an introductory guide).
- `IDENTIFIED BY 'password'` correctly defaults to `sha256_password` (SHA256 hashed at rest).
- `IDENTIFIED WITH sha256_hash BY '<hex>' [SALT '<salt>']` syntax is valid; the example hash is 64 hex characters as required.
- `double_sha1_password` and `bcrypt_password` auth methods are real and supported (bcrypt since 23.x).
- `IDENTIFIED WITH no_password` and `IDENTIFIED WITH ldap SERVER 'name'` are valid.
- HOST clauses (LOCAL, IP, NAME, REGEXP, ANY, NONE) are correct, including comma-separated combinations.
- Settings constraint modifiers (READONLY, MIN, MAX, WRITABLE) are valid.
- `max_memory_usage = 4294967296` is indeed 4 GiB.
- system.users columns cited (name, auth_type, host_ip, host_names, default_roles_list, default_database) all exist in the schema.
- `SHOW USERS`, `SHOW GRANTS FOR <user>`, `DROP USER IF EXISTS`, `currentUser()`, `currentDatabase()` are all correct.
- The users.xml `access_management` and `named_collection_control` settings are valid for enabling SQL-driven access control on the default user.

## Review Notes
- The claim that access control was "introduced in version 20.4" is essentially accurate — SQL-driven access management first appeared in the 20.4 release (April 2020) and matured in subsequent releases.
- The syntax skeleton omits some newer optional clauses (`OR REPLACE`, `VALID UNTIL`, `IN access_storage_type`, and additional authenticators like `ssh_key`, `kerberos`, `ssl_certificate`, `http`). These omissions are appropriate for an introductory post but readers may want to consult the official docs for those features.
- The additional settings modifier `CONST` / `CHANGEABLE_IN_READONLY` are not mentioned; this is a reasonable simplification since `CONST` is effectively a synonym for `READONLY`.
- The comment `max_execution_time = 300 READONLY -- cannot exceed 300s, user cannot change` is slightly imprecise: `READONLY` fixes the value at exactly 300 (user cannot raise OR lower it), not merely "cannot exceed." Not factually wrong, just incomplete phrasing — left unchanged to respect author's style.
- For production deployments, consider also adding `show_named_collections` alongside `named_collection_control` in users.xml; not required for basic user management, so not an error in the post.
