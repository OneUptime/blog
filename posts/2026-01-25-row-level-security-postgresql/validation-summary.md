# Validation Summary: How to Secure Multi-Tenant Data with Row-Level Security in PostgreSQL

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- PostgreSQL Row-Level Security
- PostgreSQL policies, roles, session settings, triggers, and partitioning
- Python psycopg2
- FastAPI
- asyncpg

## Sources Consulted
- PostgreSQL Row Security Policies: https://www.postgresql.org/docs/current/ddl-rowsecurity.html
- PostgreSQL CREATE POLICY: https://www.postgresql.org/docs/current/sql-createpolicy.html
- PostgreSQL system administration functions (`current_setting`, `set_config`): https://www.postgresql.org/docs/current/functions-admin.html
- PostgreSQL table partitioning: https://www.postgresql.org/docs/current/ddl-partitioning.html
- PostgreSQL CREATE TRIGGER: https://www.postgresql.org/docs/current/sql-createtrigger.html
- PostgreSQL PL/pgSQL trigger functions: https://www.postgresql.org/docs/current/plpgsql-trigger.html
- psycopg2 cursor documentation: https://www.psycopg.org/docs/cursor.html
- FastAPI lifespan events: https://fastapi.tiangolo.com/advanced/events/
- FastAPI dependencies with yield: https://fastapi.tiangolo.com/tutorial/dependencies/dependencies-with-yield/
- asyncpg API reference: https://magicstack.github.io/asyncpg/current/api/index.html

## Issues Found
- The original `invoices.customer_id REFERENCES customers(id)` allowed an invoice row for one tenant to reference a customer row from another tenant. I changed the schema to add `UNIQUE (tenant_id, id)` on `customers` and a composite foreign key from `(tenant_id, customer_id)` to `customers(tenant_id, id)`.
- The setup implied RLS tests would work for any database role. PostgreSQL table owners and superusers bypass RLS by default, so I added a non-owner `app_user` role and clarified that RLS checks should be run as that role.
- The FastAPI example created the `FastAPI` app twice and did not explicitly clear the tenant setting after yielding a pooled connection. I removed the duplicate app initialization, cast the asyncpg tenant parameter to UUID, and added `RESET app.tenant_id` in a `finally` block.
- The role-based access policy referenced `assigned_staff_id` without defining it. I added the missing column before the policy example.
- The role-based access policy was created as a default permissive policy. Because PostgreSQL combines permissive policies with OR, it would not restrict the earlier tenant SELECT policy. I changed it to `AS RESTRICTIVE`.
- The `app.user_id` cast in the staff policy could fail if the setting existed but was empty. I wrapped it with `NULLIF(..., '')` before casting to UUID.
- The common pitfall snippet mixed placeholder styles and direct connection execution in a way that did not match psycopg2. I changed it to use psycopg2 cursor execution with `%s` placeholders.
- The introductory RLS comment used a different function name from the implementation. I changed it to `current_tenant_id()` and described it as applying the policy expression.

## Review Notes
- The article is now technically consistent with PostgreSQL's RLS behavior, including default-deny behavior, `WITH CHECK` enforcement, table-owner bypass, `BYPASSRLS`, and permissive versus restrictive policy composition.
- The examples assume the `gen_random_uuid()` function is available in the target PostgreSQL environment.
