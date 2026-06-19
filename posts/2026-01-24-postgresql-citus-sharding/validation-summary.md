# Validation Summary: How to Scale PostgreSQL with Citus Sharding

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- PostgreSQL
- Citus
- SQL
- Docker
- PgBouncer
- PostgreSQL backup and recovery tools

## Sources Consulted
- Citus 13.0.1 documentation: Ubuntu/Debian multi-node installation: https://docs.citusdata.com/en/stable/installation/multi_node_debian.html
- Citus 13.0.1 documentation: Docker installation: https://docs.citusdata.com/en/stable/installation/single_node_docker.html
- Citus 13.0.1 documentation: utility functions, including create_distributed_table, create_reference_table, citus_rebalance_start, citus_rebalance_status, citus_move_shard_placement, isolate_tenant_to_new_shard, and citus_create_restore_point: https://docs.citusdata.com/en/stable/develop/api_udf.html
- Citus 13.0.1 documentation: metadata tables and views, including pg_dist_shard, pg_dist_placement, pg_dist_node, citus_shards, and citus_stat_statements: https://docs.citusdata.com/en/stable/develop/api_metadata.html
- Citus 13.0.1 documentation: cluster management and rebalancing: https://docs.citusdata.com/en/stable/admin_guide/cluster_management.html
- Citus 13.0.1 documentation: small database migration with pg_dump/pg_restore: https://docs.citusdata.com/en/stable/develop/migration_data_small.html
- PgBouncer official configuration reference: https://www.pgbouncer.org/config.html

## Issues Found
- The installation snippets used Citus 12.1/PostgreSQL 16 commands. Updated them to current Citus 13.0/PostgreSQL 17 package and Docker image examples from the official Citus stable docs.
- The Docker section described starting a cluster with docker-compose but used a single docker run command. Clarified that the command starts a single-node development/testing container and changed the verification command to citus_version().
- The events table did not define user_id, but later examples joined events to users on e.user_id. Added user_id to the events table schema.
- The shard placement example used pg_dist_shard_placement, which Citus documents as deprecated since Citus 7.0. Replaced it with pg_dist_placement joined to pg_dist_node.
- The UPDATE pitfall said an UPDATE without the distribution column locks all shards. Reworded the comment to the more accurate "touches every shard."
- The rebalancing example used rebalance_table_shards(), which Citus documents as deprecated as of Citus 11.2. Replaced it with get_rebalance_table_shards_plan() and citus_rebalance_start().
- The citus_stat_statements example ordered by total_time, which is not a citus_stat_statements column in current Citus. Updated the query to join pg_stat_statements and order by total_exec_time.
- The citus_shards example selected logicalrelid::regclass, but current citus_shards exposes table_name rather than logicalrelid. Updated the query to use table_name.
- The tenant isolation move example tried to find the isolated shard via pg_dist_shard shardminvalue and shardmaxvalue. Updated it to use isolate_tenant_to_new_shard()'s returned shard id.
- The PgBouncer section said to put PgBouncer in front of both coordinator and workers, but the example config routes application traffic to the coordinator. Reworded the line to match the configuration shown.
- The point-in-time recovery note mentioned pg_basebackup with WAL archiving only. Added citus_create_restore_point(), which Citus provides for consistent restore points across all nodes.

## Review Notes
The PgBouncer snippet is syntactically valid, but production deployments should choose session or transaction pooling based on application session-state requirements. The post remains a high-level guide and does not cover authentication hardening, worker pg_hba.conf setup, or restore runbooks in full detail.
