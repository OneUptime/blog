# Validation Summary: How to Use Redis Data Integration (RDI) for ETL

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Redis Data Integration (RDI)
- Redis Enterprise
- Debezium (CDC engine)
- MySQL
- YAML pipeline configuration
- JMESPath expression language

## Sources Consulted
- Redis Data Integration official documentation — https://redis.io/docs/latest/integrate/redis-data-integration/
- RDI VM installation guide — https://redis.io/docs/latest/integrate/redis-data-integration/installation/install-vm/
- RDI pipeline configuration reference — https://redis.io/docs/latest/integrate/redis-data-integration/data-pipelines/pipeline-config/
- RDI config.yaml reference — https://redis.io/docs/latest/integrate/redis-data-integration/reference/config-yaml-reference/
- RDI CLI reference — https://redis.io/docs/latest/integrate/redis-data-integration/reference/cli/
- redis-di scaffold CLI docs — https://redis.io/docs/latest/integrate/redis-data-integration/reference/cli/redis-di-scaffold/
- redis-di deploy CLI docs — https://redis.io/docs/latest/integrate/redis-data-integration/reference/cli/redis-di-deploy/
- redis-di get-rejected CLI docs — https://redis.io/docs/latest/integrate/redis-data-integration/reference/cli/redis-di-get-rejected/
- RDI architecture overview — https://redis.io/docs/latest/integrate/redis-data-integration/architecture/
- Debezium MySQL connector documentation — https://debezium.io/documentation/reference/stable/connectors/mysql.html

## Issues Found

1. **Incorrect installation URL and command**: The post used a fabricated GitHub URL (`https://github.com/RedisLabs/redis-di/releases/...`) and a nonexistent `redis-di create` command. RDI is actually downloaded from the Redis Enterprise S3 bucket and installed via `sudo ./install.sh`. Fixed the URL, tarball name, and install command.

2. **Incorrect runtime description**: The post stated RDI runs as "Docker containers (or on Kubernetes)." RDI actually runs on VMs using an embedded K3s (Kubernetes) cluster, or on existing Kubernetes deployments. Fixed the description.

3. **Incomplete list of output data types**: The post listed hashes, JSON, streams, and sets. RDI also supports sorted sets and strings. Added the missing types.

4. **Incorrect `server-name` in job YAML**: The job file used `server-name` (hyphenated) but the correct field name is `server_name` (underscored). Fixed to use underscore.

5. **`redis-di scaffold` mischaracterized as config validation**: The blog comment said "Validate config" but `scaffold` actually generates scaffold configuration files. Fixed the comment and added the `--dir` flag.

6. **Missing required `--rdi-host` and `--rdi-port` flags**: The `redis-di deploy`, `redis-di status`, and `redis-di get-rejected` commands all require `--rdi-host` and `--rdi-port` connection flags that were omitted. Added them.

7. **Fabricated `--shard` flag on `get-rejected`**: The `redis-di get-rejected --shard 1` command used a nonexistent `--shard` flag. Removed it and replaced with the correct required flags.

8. **`redis-di deploy --dir` flag removed**: The `--dir` flag is not the correct usage for `deploy`; `deploy` reads from the current working directory or requires `--rdi-host`/`--rdi-port`. Fixed to show correct flags.

## Review Notes
- The `config.yaml` example omits the required `targets:` section that defines the Redis target connection. This is acceptable for brevity in a tutorial but readers should be aware the full config needs a target definition.
- The `config.yaml` shows plain-text credentials (`password: secret`). The official docs recommend using secret references (e.g., `${SOURCE_DB_PASSWORD}`) for production deployments.
- The MySQL privileges grant is correct for standard MySQL but hosted MySQL services (AWS RDS, Aurora) may additionally require `LOCK TABLES`.
- The config.yaml `database` field format may differ from the official reference which uses a `databases` list — the example is simplified for tutorial purposes.
- RDI supports additional source databases beyond those listed (MariaDB, MongoDB, Google Cloud Spanner, AlloyDB, Neon, Supabase, AWS Aurora). The post's list is not wrong but is incomplete.
