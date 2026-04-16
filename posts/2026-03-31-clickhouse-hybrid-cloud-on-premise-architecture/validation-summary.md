# Validation Summary: How to Set Up ClickHouse Hybrid Cloud-On-Premise Architecture

## Status
validated

## Post Type
Tutorial / Architecture Guide

## Technologies Covered
- ClickHouse
- ClickHouse Keeper (Raft-based coordination)
- ReplicatedMergeTree table engine
- S3 object storage (tiered storage)
- Hybrid cloud/on-premise replication

## Sources Consulted
- ClickHouse Keeper documentation: https://clickhouse.com/docs/en/guides/sre/keeper/clickhouse-keeper
- ReplicatedMergeTree docs: https://clickhouse.com/docs/en/engines/table-engines/mergetree-family/replication/
- ClickHouse storage policies / tiered storage: https://clickhouse.com/docs/en/engines/table-engines/mergetree-family/mergetree#table_engine-mergetree-multiple-volumes
- S3 disk configuration docs: https://clickhouse.com/docs/en/engines/table-engines/mergetree-family/mergetree#table_engine-mergetree-s3

## Issues Found
- **Keeper XML snippet missing `<keeper_server>` wrapper.** The original snippet showed `<raft_configuration>` at the top level, but in ClickHouse Keeper configuration this element must be nested inside `<keeper_server>`. Fix: wrapped the `<raft_configuration>` block inside `<keeper_server>` so the snippet is structurally valid on its own.

## Review Notes
- Port 9234 is correctly identified as the Keeper raft/inter-server communication port (the client port is 9181, which is not relevant here).
- The S3 disk config fields (`type`, `endpoint`, `access_key_id`, `secret_access_key`) are correct, and `move_factor` is correctly placed at the policy level rather than the volume level.
- The `ReplicatedMergeTree('/path', '{replica}')` two-argument form is correct; the `{replica}` macro is standard.
- `SETTINGS storage_policy = 'tiered'` is the correct syntax for applying a storage policy to a table.
- The three-node Keeper quorum topology (2 on-prem + 1 cloud) correctly tolerates loss of the cloud node without losing quorum.
- `ON CLUSTER 'hybrid'` assumes a cluster named `hybrid` is defined in `remote_servers`; this is an understood prerequisite and not an error.
- The snippet uses inline credentials (`access_key_id`/`secret_access_key`). For production, IAM roles / IRSA or named credential providers would be preferable, but the inline form remains valid.
