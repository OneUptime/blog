# Validation Summary: How to Implement a Tenant Isolation Strategy in MySQL

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- MySQL (CREATE DATABASE, CREATE USER, GRANT, stored procedures, views, Performance Schema)
- Shell scripting (bash heredoc for schema provisioning automation)
- Multi-tenancy patterns (database-per-tenant, shared schema with tenant ID, per-tenant schema)

## Sources Consulted
- MySQL 8.0 Reference Manual: CREATE DATABASE — https://dev.mysql.com/doc/refman/8.0/en/create-database.html
- MySQL 8.0 Reference Manual: CREATE USER — https://dev.mysql.com/doc/refman/8.0/en/create-user.html
- MySQL 8.0 Reference Manual: GRANT Statement — https://dev.mysql.com/doc/refman/8.0/en/grant.html
- MySQL 8.0 Reference Manual: CREATE PROCEDURE — https://dev.mysql.com/doc/refman/8.0/en/create-procedure.html
- MySQL 8.0 Reference Manual: CREATE VIEW — https://dev.mysql.com/doc/refman/8.0/en/create-view.html
- MySQL 8.0 Reference Manual: Performance Schema threads Table — https://dev.mysql.com/doc/refman/8.0/en/performance-schema-threads-table.html
- PostgreSQL Row-Level Security documentation (for cross-reference of the RLS claim) — https://www.postgresql.org/docs/current/ddl-rowsecurity.html

## Issues Found
- **Stored procedure parameter type mismatch**: The `orders.tenant_id` column is defined as `INT UNSIGNED NOT NULL`, but the stored procedure parameter was declared as `IN p_tenant_id INT` (signed). Changed to `IN p_tenant_id INT UNSIGNED` to match the column type and prevent negative values from being accepted.

## Review Notes
- The claim that "MySQL does not have built-in row-level security like PostgreSQL" is accurate. MySQL lacks native RLS policies (`CREATE POLICY`); isolation must be enforced via application logic, views, or stored procedures.
- Strategy 3 (separate schemas) is acknowledged in the post as functionally identical to Strategy 1 since MySQL treats `DATABASE` and `SCHEMA` as synonyms. The distinction is operational (automated provisioning with restricted privileges) rather than a fundamentally different isolation mechanism. This is correctly noted in the post.
- The "BAD" vs "GOOD" SQL example intentionally shows identical queries to illustrate that the security difference lies in the source of the `tenant_id` parameter (user input vs. authenticated session), not in the SQL syntax itself. The comments make this clear.
- `FLUSH PRIVILEGES` is not strictly required after `GRANT` in MySQL 5.7+ (grant table changes via GRANT are applied immediately), but including it is not harmful and is a common practice.
- The Performance Schema query using `performance_schema.threads` with `TYPE = 'FOREGROUND'` and `PROCESSLIST_USER` is correct and functional.
