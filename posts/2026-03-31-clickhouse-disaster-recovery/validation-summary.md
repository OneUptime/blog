# Validation Summary: How to Set Up ClickHouse Disaster Recovery

## Status
validated

## Post Type
Tutorial / Operations Guide

## Technologies Covered
- ClickHouse (ReplicatedMergeTree engine, ClickHouse Keeper, system tables)
- clickhouse-backup (Altinity)
- Amazon S3 (Cross-Region Replication via `aws s3api put-bucket-replication`)
- Bash / cron
- Mermaid (for the diagram)

## Sources Consulted
- ClickHouse docs — ReplicatedMergeTree engine: https://clickhouse.com/docs/en/engines/table-engines/mergetree-family/replication
- ClickHouse docs — `system.replicas` and `system.replication_queue`: https://clickhouse.com/docs/en/operations/system-tables/replicas
- Altinity clickhouse-backup README: https://github.com/Altinity/clickhouse-backup/blob/master/ReadMe.md
- AWS S3 Replication configuration reference: https://docs.aws.amazon.com/AmazonS3/latest/userguide/replication-add-config.html
- AWS CLI `s3api put-bucket-replication` reference: https://docs.aws.amazon.com/cli/latest/reference/s3api/put-bucket-replication.html

## Issues Found
1. **S3 replication.json was incomplete.** The original JSON used a shape that's neither a valid V1 config (no `<Prefix>` under the rule) nor a valid V2 config (missing `Filter`, `Priority`, and `DeleteMarkerReplication`). Newer AWS accounts effectively require V2. Updated the example to include `ID`, `Priority: 1`, an empty `Filter: {}` (replicate everything), and `DeleteMarkerReplication: { "Status": "Disabled" }` so the payload validates with `put-bucket-replication`.
2. **Cron cleanup command was incorrect.** `clickhouse-backup delete local` accepts exactly one backup name per invocation, but the original command passed multiple names via `$(...)` substitution, which would fail. Rewrote the line to pipe `awk` output through `xargs -r -n1 clickhouse-backup delete local`, which invokes the delete command once per backup name.

## Review Notes
- The ReplicatedMergeTree DDL, macro configuration, `system.replicas` / `system.replication_queue` column usage (`is_leader`, `inserts_in_queue`, `merges_in_queue`, `log_pointer`), and clickhouse-backup commands (`create`, `upload`, `create-remote`, `list`, `download`, `restore`, `--tables`) all match the official docs.
- The install one-liner (`curl ... | tar -xz -C /usr/local/bin/`) depends on the tarball layout of a specific release. Some Altinity release tarballs extract the binary under a subdirectory (e.g., `build/linux/amd64/clickhouse-backup`), in which case the user may need to move the binary or add `--strip-components`. Left as-is because it works for many releases and the blog is illustrative; worth noting for readers targeting a specific version.
- `is_leader` is still exposed in `system.replicas` but ClickHouse has moved toward multi-leader semantics — the column remains for compatibility and is a reasonable health-check signal.
- The example credentials in the YAML are clearly placeholder AWS example keys (`AKIAIOSFODNN7EXAMPLE` / `wJalrXUtnFEMI/...`), which is fine for a tutorial.
