# Validation Summary: How to Manage PostgreSQL Users and Databases with CloudNativePG

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- CloudNativePG
- Kubernetes
- PostgreSQL
- PostgreSQL roles and privileges
- PostgreSQL row-level security
- LDAP authentication
- External Secrets Operator

## Sources Consulted
- CloudNativePG PostgreSQL Role management: https://cloudnative-pg.io/docs/1.28/declarative_role_management/
- CloudNativePG API reference for RoleConfiguration and LDAPConfig: https://cloudnative-pg.io/docs/1.28/cloudnative-pg.v1/
- CloudNativePG Bootstrap documentation for post-init SQL execution order and database targets: https://cloudnative-pg.io/docs/1.27/bootstrap/
- CloudNativePG Connecting from an application documentation for generated secrets: https://cloudnative-pg.io/docs/devel/applications/
- CloudNativePG PostgreSQL Configuration documentation for pg_hba and LDAP configuration: https://cloudnative-pg.io/docs/1.28/postgresql_conf/
- CloudNativePG External Secrets documentation: https://cloudnative-pg.io/docs/1.25/cncf-projects/external-secrets/
- PostgreSQL predefined roles documentation: https://www.postgresql.org/docs/current/predefined-roles.html
- PostgreSQL row security policies documentation: https://www.postgresql.org/docs/current/ddl-rowsecurity.html
- PostgreSQL CREATE POLICY documentation: https://www.postgresql.org/docs/current/sql-createpolicy.html
- PostgreSQL LDAP authentication documentation: https://www.postgresql.org/docs/current/auth-ldap.html

## Issues Found
- Some examples used `postInitSQL` for extensions, schemas, and RLS policies intended for the application database. CloudNativePG runs `postInitSQL` against the `postgres` database, while `postInitApplicationSQL` runs against the application database. Updated those snippets to use `postInitApplicationSQL`.
- The additional database example attempted to create a database owned by `readonly_user`, but managed roles are created after database bootstrap. Changed that owner to the bootstrap owner, `app_user`, so the SQL can run during bootstrap.
- Bootstrap grant examples referenced roles that would not exist yet if they were only declared under `.spec.managed.roles`. Added a note about bootstrap ordering and added `CREATE ROLE` statements where bootstrap grants refer to non-owner roles.
- The LDAP example used `bindAsAuth: true` with `prefix` and `suffix` at the wrong level. Updated it to the documented `bindAsAuth.prefix` and `bindAsAuth.suffix` object structure.
- The credential secret examples used generic secrets without specifying the expected `kubernetes.io/basic-auth` type. Added `--type=kubernetes.io/basic-auth` to the secret creation commands.
- The generated superuser secret was described as always created. Updated the text to clarify that `[cluster name]-superuser` is generated only when `.spec.enableSuperuserAccess` is true and no different superuser secret is specified.
- The password expiry example used a date that is already in the past on the validation date. Updated it to a future timestamp.
- The RLS bootstrap example altered a table that was not created in the snippet. Added a minimal `customers` table creation statement before enabling RLS.
- The manual privilege and user-removal examples mixed SQL statements into `bash` blocks after an interactive `psql` command. Converted them to executable `psql -c` commands and added ownership cleanup before dropping a role.
- The standalone grants ConfigMap granted privileges on an `app` schema without creating it in that example. Added `CREATE SCHEMA IF NOT EXISTS app;`.

## Review Notes
- `kubectl` is not installed in the local review environment, so CLI syntax was reviewed against documented Kubernetes and CloudNativePG behavior rather than local command help.
- The post still uses direct bootstrap SQL for additional databases. CloudNativePG 1.29 includes declarative database management via a `Database` CRD, which could be considered for a future update, but the existing `postInitSQL` approach remains documented and valid.
