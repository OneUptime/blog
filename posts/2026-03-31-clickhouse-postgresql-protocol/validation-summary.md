# Validation Summary: How to Configure ClickHouse PostgreSQL Protocol Compatibility

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- ClickHouse (PostgreSQL wire protocol interface)
- PostgreSQL (`psql` CLI, wire protocol)
- Python (`psycopg2`)
- Node.js (`pg` / node-postgres)
- Grafana (PostgreSQL datasource)
- UFW (firewall configuration)

## Sources Consulted
- ClickHouse PostgreSQL Interface documentation: https://clickhouse.com/docs/en/interfaces/postgresql
- ClickHouse system.processes table documentation: https://clickhouse.com/docs/en/operations/system-tables/processes
- ClickHouse Users and Roles documentation: https://clickhouse.com/docs/en/operations/access-rights

## Issues Found

### 1. Incorrect `system.processes` interface filter (fixed)
**What was wrong:** The monitoring query used `WHERE interface = 'PostgreSQL'`, but the `interface` column in `system.processes` is `UInt8` (numeric), not a string. PostgreSQL connections correspond to value `5`.
**What was changed:** Updated the query to `WHERE interface = 5` and added an explanatory note about the numeric values.

### 2. Unsupported psql meta-commands claimed as working (fixed)
**What was wrong:** The "System Catalog Compatibility" section claimed that `\dt` and `\d my_table` work via psql connected to ClickHouse. These psql meta-commands rely on PostgreSQL-specific system catalog queries that ClickHouse does not fully support, and official documentation does not list them as functional.
**What was changed:** Rewrote the section to clarify that psql meta-commands are generally not supported, and replaced the example with a standard SQL query against `system.tables` which does work through the PostgreSQL interface.

### 3. Misleading authentication claims (fixed)
**What was wrong:** The post stated "No special password type is needed... SHA256 passwords work fine" without mentioning that the PostgreSQL wire protocol in ClickHouse currently only supports plain-text password transmission. This is an important security consideration.
**What was changed:** Updated the authentication section to note that plain-text password transmission is used over the wire and recommended TLS to protect credentials in transit. Removed the inaccurate claim that "SHA256 passwords work fine" (which conflated server-side password storage with wire protocol behavior).

## Review Notes
- The default port `9005` is accurate as the conventionally documented example, but it is not a hardcoded default — the PostgreSQL interface must be explicitly enabled by setting `postgresql_port` in the config. The blog correctly shows this as a manual configuration step.
- The Node.js code example uses top-level `await` which requires either an ES module context or being wrapped in an async function. This is a minor style issue and not incorrect per se, but readers using CommonJS (`require`) may need to wrap the code in an async IIFE.
- The `psycopg2` example uses `today() - 1` which is valid ClickHouse SQL but may confuse readers expecting PostgreSQL syntax. This is acceptable since the post clearly explains that ClickHouse SQL syntax is used through the interface.
