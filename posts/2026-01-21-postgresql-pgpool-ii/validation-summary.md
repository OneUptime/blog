# Validation Summary: How to Use Pgpool-II for PostgreSQL Load Balancing

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- PostgreSQL
- Pgpool-II
- Connection pooling
- Load balancing
- Streaming replication failover
- Pgpool-II client authentication

## Sources Consulted
- Pgpool-II 4.7.2 Documentation: Clustering mode - https://www.pgpool.net/docs/latest/en/html/runtime-config-running-mode.html
- Pgpool-II 4.7.2 Documentation: Backend Settings - https://www.pgpool.net/docs/latest/en/html/runtime-config-backend-settings.html
- Pgpool-II 4.7.2 Documentation: Connections and Authentication - https://www.pgpool.net/docs/latest/en/html/runtime-config-connection.html
- Pgpool-II 4.7.2 Documentation: Connection Pooling - https://www.pgpool.net/docs/latest/en/html/runtime-config-connection-pooling.html
- Pgpool-II 4.7.2 Documentation: Load Balancing - https://www.pgpool.net/docs/latest/en/html/runtime-config-load-balancing.html
- Pgpool-II 4.7.2 Documentation: Failover and Failback - https://www.pgpool.net/docs/latest/en/html/runtime-config-failover.html
- Pgpool-II 4.7.2 Documentation: Authentication Methods - https://www.pgpool.net/docs/latest/en/html/auth-methods.html
- Pgpool-II 4.7.2 Documentation: SHOW POOL_NODES - https://www.pgpool.net/docs/latest/en/html/sql-show-pool-nodes.html
- Pgpool-II 4.7.2 Documentation: SHOW POOL_PROCESSES - https://www.pgpool.net/docs/latest/en/html/sql-show-pool-processes.html
- Pgpool-II 4.7.2 Documentation: SHOW POOL_POOLS - https://www.pgpool.net/docs/latest/en/html/sql-show-pool-pools.html

## Issues Found
- Added `backend_clustering_mode = 'streaming_replication'` to the basic configuration. Current Pgpool-II documentation requires `backend_clustering_mode` to select streaming replication mode for primary/standby routing behavior.
- Corrected the load-balancing comment to say eligible `SELECT` queries are load balanced across backends. With the shown equal backend weights, reads are not guaranteed to go only to replicas.
- Replaced deprecated load-balancing function-list parameters `white_function_list` and `black_function_list` with current `read_only_function_list` and `write_function_list`.
- Corrected the failover script variable names and condition. Pgpool-II's `%m` and `%H` placeholders are the new main node, which can differ from the new primary in streaming replication mode; the script now checks `%P`, the old primary node ID, before promoting.
- Added `enable_pool_hba = on` to the authentication example because Pgpool-II only uses `pool_hba.conf` when this setting is enabled.
- Corrected the SCRAM authentication password example. Pgpool-II documentation states that `md5` entries in `pool_passwd` cannot be used for `scram-sha-256`; the example now uses `pg_enc` and an `AES` password entry.

## Review Notes
The post is now technically valid as a concise Pgpool-II setup guide. In a production version, the failover example would benefit from fuller operational details such as SSH setup, `.pgpoolkey` permissions, backend data directories, replication slots, `follow_primary_command`, and testing failback, but those are beyond the scope of the current short guide.
