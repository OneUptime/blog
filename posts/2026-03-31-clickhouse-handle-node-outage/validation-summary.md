# Validation Summary: How to Handle a ClickHouse Node Outage

## Status
validated

## Post Type
Runbook / Operational Guide

## Technologies Covered
- ClickHouse (replication, system tables, HTTP interface)
- systemd / journalctl
- AWS ELBv2 (Application Load Balancer) CLI
- SQL (ClickHouse dialect)

## Sources Consulted
- ClickHouse `system.replicas` docs: https://clickhouse.com/docs/en/operations/system-tables/replicas
- ClickHouse `system.parts` docs: https://clickhouse.com/docs/en/operations/system-tables/parts
- ClickHouse `load_balancing` setting docs: https://clickhouse.com/docs/en/operations/settings/settings#load_balancing
- ClickHouse HTTP interface docs: https://clickhouse.com/docs/en/interfaces/http (port 8123, `/ping` endpoint)
- AWS CLI `elbv2 deregister-targets` reference

## Issues Found
- **`checksums_sha512` column does not exist in `system.parts`.** The post referenced this as a way to compare part differences across replicas, but ClickHouse's `system.parts` does not have a SHA-512 checksum column. Replaced with `hash_of_all_files`, which is the actual (SipHash128-based) hash column used to detect divergence in part contents. The other valid options (`hash_of_uncompressed_files`, `uncompressed_hash_of_compressed_files`) would also work but `hash_of_all_files` is the most direct fit.

## Review Notes
- All `system.replicas` columns (`replica_path`, `is_readonly`, `is_session_expired`, `future_parts`, `queue_size`, `absolute_delay`) are correct.
- `load_balancing` values `random` and `nearest_hostname` are valid per ClickHouse docs.
- HTTP `/ping` endpoint on port 8123 is accurate; `/replicas_status` is an additional endpoint worth mentioning for replication-specific health checks, though the post's scope is fine as-is.
- `systemctl` and `journalctl` commands are correct.
- AWS CLI `aws elbv2 deregister-targets` syntax with `--target-group-arn` and `--targets Id=...,Port=...` is correct.
- The claim that a lagging replica with `absolute_delay > 0` will catch up automatically on return is accurate for `ReplicatedMergeTree` tables.
