# Validation Summary: How to Use remote() and remoteSecure() Table Functions in ClickHouse

## Status
validated

## Post Type
Tutorial / Reference Guide

## Technologies Covered
- ClickHouse (remote() and remoteSecure() table functions)
- ClickHouse native TCP protocol and TLS-encrypted native protocol
- ClickHouse SQL (DDL for user management, GRANT, SELECT, INSERT INTO ... SELECT)
- ClickHouse cluster() table function (comparison)
- ClickHouse Distributed table engine (mentioned as alternative)

## Sources Consulted
- ClickHouse official documentation on remote/remoteSecure table functions: https://clickhouse.com/docs/en/sql-reference/table-functions/remote
- ClickHouse official documentation on cluster() table function: https://clickhouse.com/docs/en/sql-reference/table-functions/cluster
- ClickHouse official documentation on server configuration (listen_host): https://clickhouse.com/docs/en/operations/server-configuration-parameters/settings
- ClickHouse official documentation on access control (CREATE USER, GRANT): https://clickhouse.com/docs/en/sql-reference/statements/create/user

## Issues Found
1. **Incomplete `remoteSecure()` syntax**: The Basic Syntax section showed only one form for `remoteSecure()` and omitted the `sharding_key` parameter. The `remoteSecure()` function has the exact same signature as `remote()`, supporting both `db.table` and separate `db, table` forms, as well as the optional `sharding_key` parameter. Fixed by adding the missing form and `sharding_key` parameter to match the `remote()` signatures.

## Review Notes
- All SQL examples use valid ClickHouse syntax (toDate, toYYYYMM, now(), INTERVAL, today(), count(), UNION ALL, etc.).
- The default ports cited are correct: 9000 for native TCP, 9440 for native TCP with TLS.
- The comparison table between remote() and cluster() is accurate for a high-level overview. Note that cluster() does not accept user/password parameters — it uses the current connection's credentials, as the post states.
- The security section correctly advises using remoteSecure() for connections where credentials traverse the network.
- The performance note about predicate pushdown is accurate — ClickHouse does push filters and partial aggregations to the remote server.
- The `<listen_host>0.0.0.0</listen_host>` configuration is correct for enabling remote connections, and the post appropriately warns about restricting access via network controls or HOST IP clauses.
