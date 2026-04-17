# Validation Summary: How to Build a DR Strategy for Multi-Cloud ClickHouse

## Status
validated

## Post Type
Guide (DR strategy / operations guide)

## Technologies Covered
- ClickHouse (ReplicatedMergeTree, insert_quorum, Keeper)
- clickhouse-backup
- Google Cloud Storage (gsutil)
- AWS S3
- iptables
- clickhouse-client

## Sources Consulted
- ClickHouse settings docs: https://clickhouse.com/docs/en/operations/settings/settings (insert_quorum, insert_quorum_parallel)
- ClickHouse ReplicatedMergeTree docs: https://clickhouse.com/docs/en/engines/table-engines/mergetree-family/replication
- clickhouse-backup documentation: https://github.com/Altinity/clickhouse-backup (create/upload commands and --config flag)
- gsutil cp reference: https://cloud.google.com/storage/docs/gsutil/commands/cp
- iptables manpage for -I/-s/-j flags
- clickhouse-client docs: https://clickhouse.com/docs/en/interfaces/cli (--host, -q flags)

## Issues Found
No technical issues found.

- `insert_quorum=2` and `insert_quorum_parallel=1` are valid ClickHouse settings with correct XML syntax.
- `clickhouse-backup create --config <path> <name>` and `clickhouse-backup upload --config <path> <name>` are valid CLI invocations.
- `gsutil -m cp -r` is correct for parallel recursive copy to GCS.
- `iptables -I INPUT -s <cidr> -j DROP` is valid.
- `clickhouse-client --host <host> -q "<query>"` uses correct flags.
- The characterization of ReplicatedMergeTree + `insert_quorum` as providing synchronous-like semantics (RPO=0) is accurate: the client waits for the specified number of replicas to acknowledge before the insert returns.

## Review Notes
- `insert_quorum` and `insert_quorum_parallel` are user-level (profile) settings. The XML snippet shows only the setting tags without the enclosing `<profiles>`/`<default>` context that would be present in a typical `users.xml`. This is acceptable for a conceptual illustration but readers should know where the settings belong when implementing.
- `insert_quorum_parallel=1` is the ClickHouse default; setting it explicitly is harmless but not required for correctness. Note that parallel quorum inserts trade sequential consistency for throughput.
- With `insert_quorum=2` the write fails if only one replica is reachable, which is the intended safety behavior for RPO=0 but worth noting for operators sizing cross-cloud replica counts.
- The failover runbook is high-level; production runbooks typically also cover replica catch-up verification (`SELECT * FROM system.replicas`) before declaring failover complete.
