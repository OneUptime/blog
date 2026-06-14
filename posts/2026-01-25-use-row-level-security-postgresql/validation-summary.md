# Validation Summary: How to Use Row-Level Security in PostgreSQL

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- PostgreSQL row-level security
- PostgreSQL roles and policies
- PostgreSQL session settings and configuration functions
- SQL / PL/pgSQL
- Python
- psycopg2
- Flask

## Sources Consulted
- PostgreSQL documentation: Row Security Policies - https://www.postgresql.org/docs/current/ddl-rowsecurity.html
- PostgreSQL documentation: CREATE POLICY - https://www.postgresql.org/docs/current/sql-createpolicy.html
- PostgreSQL documentation: ALTER TABLE, including FORCE ROW LEVEL SECURITY - https://www.postgresql.org/docs/current/sql-altertable.html
- PostgreSQL documentation: Role Attributes, including BYPASSRLS - https://www.postgresql.org/docs/current/role-attributes.html
- PostgreSQL documentation: Configuration Settings Functions, including current_setting and set_config - https://www.postgresql.org/docs/current/functions-admin.html
- Psycopg documentation: Passing parameters to SQL queries - https://www.psycopg.org/docs/usage.html
- Flask documentation: jsonify API - https://flask.palletsprojects.com/en/stable/api/

## Issues Found
- The `documents` table did not define `is_public`, but later policy and index examples referenced it. Added `is_public BOOLEAN DEFAULT false` to the table definition.
- The no-policy RLS comment mentioned only table owners and superusers as exceptions. Updated it to also include roles with `BYPASSRLS`, matching PostgreSQL behavior.
- The multi-tenant/RBAC examples referenced `team_id` and `team_members` without defining them. Added `teams`, `team_members`, and `projects.team_id` definitions.
- The Flask example returned `jsonify(projects)` without importing `jsonify`. Added it to the Flask imports.
- The psycopg2 example parameterized `SET` commands directly. Replaced those statements with `SELECT set_config(..., %s, false)` calls and string values, which matches PostgreSQL's configuration function API and psycopg parameter binding.
- The audit insert policy comment implied the policy alone lets anyone insert rows. Updated it to clarify that the role still needs normal `INSERT` privileges.
- The audit log immutability comment ignored owner/BYPASSRLS behavior. Updated it to say the restriction applies to roles subject to RLS.
- The hierarchical access policy referenced `current_org_id()` without defining it and used a less clear set-returning function call. Added a `current_org_id()` function and changed the policy to select from `get_accessible_orgs(...)` as a table function.
- The bypass section said only superusers always bypass RLS. Updated it to include roles with `BYPASSRLS`.
- The service-account policy comment implied table privileges were not required. Updated it to clarify that the policy allows all rows for roles with table privileges.
- The performance section attempted to index `documents.tenant_id`, but the `documents` table has no `tenant_id` column. Changed the example to index `projects.tenant_id`.
- The testing section claimed `documents` would be filtered by tenant, but the `documents` examples only use owner-based policies. Updated the comment to say it should only show user 1's documents.

## Review Notes
The post is technically sound after the fixes. The examples still assume application-defined helpers such as `get_tenant_from_request`, `get_user_from_request`, and `is_admin()`, which is acceptable for a tutorial but could be made more explicit in a future improvement.
