# Validation Summary: How to Scale Redis with Redis Cluster Proxy

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Redis Cluster Proxy (`redis-cluster-proxy`)
- Redis Cluster
- Python `redis` client library
- systemd service configuration

## Sources Consulted
- redis-cluster-proxy GitHub repository source code and README: https://github.com/RedisLabs/redis-cluster-proxy
- `src/proxy.c` — CLI argument parsing and PROXY subcommand handling
- `src/commands.c` — multi-key cross-slot command definitions
- `src/config.c` — configuration option definitions (flag names and valid values)

## Issues Found

1. **`--cluster` flag does not exist**: The blog used `--cluster 127.0.0.1:7001` but the cluster entry point address is a positional argument, not a named flag. Fixed to place `127.0.0.1:7001` at the end of the command as a positional argument.

2. **`--max-clients` incorrect flag name**: The actual flag is `--maxclients` (no hyphen between "max" and "clients"). Fixed in both the command example and the key flags list.

3. **`--log-level verbose` invalid level**: `verbose` is not a valid log level. Valid levels are `debug`, `info`, `success`, `warning`, `error`. Changed to `--log-level debug`.

4. **`PROXY CLUSTERS` command does not exist**: The correct command is `PROXY CLUSTER` (singular), with subcommands like `PROXY CLUSTER INFO`, `PROXY CLUSTER STATUS`, `PROXY CLUSTER NODES`. Fixed to `PROXY CLUSTER INFO`.

5. **`PROXY STATS` command does not exist**: There is no `STATS` subcommand in redis-cluster-proxy. Valid PROXY subcommands include `CONFIG`, `MULTIPLEXING`, `INFO`, `COMMAND`, `CLIENT`, `CLUSTER`, `LOG`, `DEBUG`, `SHUTDOWN`. Replaced with `PROXY CONFIG GET maxclients` as a valid alternative.

6. **MSET cross-slot claim was misleading**: The blog stated MSET requires all keys in the same slot, but redis-cluster-proxy actually supports cross-slot MSET (it splits and aggregates results). However, cross-slot support requires the `--enable-cross-slot` flag. Fixed to clarify that cross-slot support must be explicitly enabled.

7. **Systemd service file used non-existent `--cluster` flag**: Same issue as #1 above, also present in the systemd ExecStart line. Fixed to use the positional argument syntax.

8. **Missing project status warning**: The redis-cluster-proxy project is explicitly unmaintained and marked as alpha software not recommended for production use (per the repository README). Added a note at the top of the post to inform readers.

## Review Notes
- The redis-cluster-proxy project has not been actively maintained since April 2020. The last commit (August 2023) was just a README status update. The repository has 70+ open issues with no activity. Readers should be aware this is alpha software.
- The Python code example is correct and would work as described when connected through the proxy.
- The build process (`make` producing `src/redis-cluster-proxy`) is accurate.
- The GitHub repository URL `https://github.com/RedisLabs/redis-cluster-proxy.git` is correct and accessible.
