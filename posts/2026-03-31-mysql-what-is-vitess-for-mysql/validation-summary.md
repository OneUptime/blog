# Validation Summary: What Is Vitess for MySQL

## Status
validated

## Post Type
Tutorial / Overview Guide

## Technologies Covered
- Vitess (database clustering system)
- MySQL
- Docker Compose
- Python (mysql.connector)
- VTGate, VTTablet, vtctld, VTAdmin
- etcd / Consul (topology storage)

## Sources Consulted
- Vitess official documentation (v22): https://vitess.io/docs/22.0/
- vtctldclient CreateKeyspace reference: https://vitess.io/docs/20.0/reference/programs/vtctldclient/vtctldclient_createkeyspace/
- Vitess DDL Strategies: https://vitess.io/docs/22.0/user-guides/schema-changes/ddl-strategies/
- Vitess Reshard reference: https://vitess.io/docs/22.0/reference/programs/vtctldclient/vtctldclient_reshard/
- Vitess Ports reference: https://vitess.io/docs/22.0/user-guides/configuration-basic/ports/
- vtctldclient transition guide: https://vitess.io/docs/14.0/reference/vtctldclient-transition/
- Docker Compose V2 deprecation announcement: https://www.docker.com/blog/new-docker-compose-v2-and-v1-deprecation/

## Issues Found

1. **`vtctlclient` deprecated, replaced by `vtctldclient`**: All instances of `vtctlclient` were replaced with `vtctldclient`. The `vtctlclient` binary was deprecated starting in Vitess v12 and has been superseded by `vtctldclient` in all current documentation (v17+).

2. **Invalid `CreateKeyspace` flags**: The `--sharding_column_name` and `--sharding_column_type` flags do not exist on `vtctldclient CreateKeyspace`. In modern Vitess, sharding configuration is done entirely through VSchema (which the post already covers in the next section). Removed these flags and added a comment clarifying that sharding is configured via VSchema.

3. **Invalid `ALGORITHM=ONLINE` DDL syntax**: `ALGORITHM=ONLINE` is not a valid MySQL or Vitess keyword. MySQL supports `ALGORITHM=INPLACE`, `ALGORITHM=COPY`, and `ALGORITHM=INSTANT`. Vitess online DDL is triggered by setting the `@@ddl_strategy` session variable. Replaced with `SET @@ddl_strategy='vitess';` before the ALTER TABLE statement.

4. **Outdated Reshard command syntax**: The `vtctlclient Reshard create commerce.reshard_workflow` format is from the old vtctlclient API. Updated to the modern `vtctldclient` syntax using `--workflow` and `--target-keyspace` flags, and included the required `--source-shards` and `--target-shards` parameters for the `create` subcommand.

5. **Incorrect VTAdmin port**: Changed from port 15000 (which is the vtctld web UI port) to port 14201 (the correct default VTAdmin web UI port).

6. **Deprecated Docker Compose V1 syntax**: Changed `docker-compose` (hyphen, V1 standalone binary, EOL since June 2023) to `docker compose` (space, V2 plugin, actively maintained).

## Review Notes
- The VSchema JSON example is accurate and well-structured.
- The Python connection example using mysql.connector on port 15306 is correct.
- The architecture diagram and component descriptions are accurate.
- The claims about Vitess users (YouTube, Slack, GitHub, Square) are all verified.
- The `SHOW VITESS_MIGRATIONS` syntax is correct.
- The old DDL strategy name `online` was renamed to `vitess` in newer versions; the post now uses the current name.
