# Validation Summary: How to Handle ClickHouse Data Center Failover

## Status
validated

## Post Type
Runbook / Operations Guide

## Technologies Covered
- ClickHouse (ReplicatedMergeTree, system.replicas)
- ClickHouse Keeper (clickhouse-keeper-client)
- AWS Route 53 (DNS failover via CLI)
- Bash shell scripting

## Sources Consulted
- ClickHouse system tables documentation: https://clickhouse.com/docs/en/operations/system-tables/replicas
- ClickHouse Keeper documentation: https://clickhouse.com/docs/en/guides/sre/keeper/clickhouse-keeper
- clickhouse-keeper-client reference: https://clickhouse.com/docs/en/operations/utilities/clickhouse-keeper-client
- AWS Route 53 CLI reference: https://docs.aws.amazon.com/cli/latest/reference/route53/change-resource-record-sets.html
- ClickHouse INTERVAL / date-time functions: https://clickhouse.com/docs/en/sql-reference/operators#interval

## Issues Found
No technical issues found.

- `system.replicas` columns referenced (`table`, `is_leader`, `absolute_delay`, `queue_size`) are all valid and current.
- `clickhouse-keeper-client --host ... -q "stat"` is correct usage; the `stat` four-letter command is a valid Keeper admin command that reports mode/leader.
- AWS Route 53 `change-resource-record-sets` JSON payload (Action UPSERT, ResourceRecordSet with Name/Type/TTL/ResourceRecords) matches the documented schema.
- ClickHouse `INTERVAL 5 MINUTE` arithmetic syntax is correct.
- Bash loop and `ping -c 3` usage are correct.

## Review Notes
- The post correctly notes that a Keeper quorum node must exist in the DR data center — without this, a full primary-DC outage would leave Keeper without quorum and replicas read-only. This is the critical architectural prerequisite for DC failover.
- `is_leader` in `system.replicas` reflects the current merge-selection leader, not a writable-primary designation (ClickHouse replication is multi-leader for writes). The runbook's use of it as a health signal rather than a promotion gate is appropriate.
- DNS TTL of 60s is a reasonable pre-configured value; in practice, resolver caching and connection pools may extend real cutover time beyond the TTL — the runbook's Phase 4 (explicit app restart / config update) correctly covers this.
- Consider, in future revisions, mentioning `SYSTEM RESTORE REPLICA` for the return-to-primary path if the primary's data directory was lost, and `absolute_delay` caveats when queue_size is non-zero.
