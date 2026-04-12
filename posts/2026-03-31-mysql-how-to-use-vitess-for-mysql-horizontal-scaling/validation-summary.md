# Validation Summary: How to Use Vitess for MySQL Horizontal Scaling

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- MySQL
- Vitess (CNCF graduated project for MySQL horizontal scaling)
- Kubernetes (Vitess Operator deployment)
- Docker (vttestserver local development)
- etcd / ZooKeeper (topology store)
- Prometheus (monitoring metrics)

## Sources Consulted
- Vitess official documentation — https://vitess.io/docs/
- vtctldclient ApplyVSchema reference (v22) — https://vitess.io/docs/22.0/reference/programs/vtctldclient/vtctldclient_applyvschema/
- vtctldclient Reshard reference (v22) — https://vitess.io/docs/22.0/reference/programs/vtctldclient/vtctldclient_reshard/
- vtctldclient Reshard switchtraffic reference — https://vitess.io/docs/22.0/reference/programs/vtctldclient/vtctldclient_reshard/vtctldclient_reshard_switchtraffic/
- vtctldclient Workflow show reference — https://vitess.io/docs/22.0/reference/programs/vtctldclient/vtctldclient_workflow/
- Vitess vttestserver Docker documentation — https://vitess.io/docs/22.0/get-started/vttestserver-docker-image/
- Vitess VSchema reference — https://vitess.io/docs/22.0/reference/features/vschema/
- Vitess resharding user guide — https://vitess.io/docs/user-guides/migration/resharding/
- Vitess monitoring documentation — https://vitess.io/docs/21.0/user-guides/configuration-basic/monitoring/
- Vitess connection pools documentation — https://vitess.io/docs/archive/16.0/reference/features/connection-pools/

## Issues Found

1. **ApplyVSchema command syntax (line 109)**: The keyspace was passed as a `--keyspace=commerce` flag, but `ApplyVSchema` takes the keyspace as a positional argument. Also changed `--vschema_file` to `--vschema-file` (canonical hyphenated form). Fixed to: `vtctldclient ApplyVSchema --vschema-file=vschema.json commerce`.

2. **Reshard command flag `--keyspace` (lines 118, 125, 129)**: The Reshard command uses `--target-keyspace`, not `--keyspace`. Changed all three occurrences.

3. **Reshard create flag names (line 119)**: `--source_shards` and `--target_shards` used underscores. The canonical vtctldclient flag format uses hyphens: `--source-shards` and `--target-shards`.

4. **Reshard SwitchTraffic subcommand casing (lines 126, 130)**: `SwitchTraffic` should be lowercase `switchtraffic` per the vtctldclient command reference.

5. **SwitchTraffic flag name (lines 126, 130)**: `--tablet_type` (singular, underscores) was incorrect. The correct flag is `--tablet-types` (plural, hyphens).

6. **Workflow show command syntax (line 122)**: Reordered so `show` subcommand comes directly after `Workflow`, with `--keyspace` and `--workflow` as flags of the `show` subcommand.

7. **Prometheus metric names (lines 152-154)**: The metric names `vitess_query_count`, `vitess_query_error_count`, and `vitess_transaction_count` do not match actual Vitess Prometheus metric names. Updated to `vtgate_api_count`, `vtgate_api_error_count`, and `vtgate_queries_processed_total` with accurate descriptions.

8. **Prometheus metrics port (line 147)**: Changed from port 15000 (vtctld web port) to port 15001 (VTGate default web port), since VTGate metrics are most relevant for monitoring query traffic. Updated the comment accordingly.

## Review Notes
- The vttestserver Docker command uses command-line flags (`--keyspaces`, `--num_shards`, etc.). The official documentation recommends environment variables (`-e KEYSPACES=`, `-e NUM_SHARDS=`) as the preferred approach, but the flag-based approach also works.
- The Docker image tag `vitess/vttestserver:latest` is used. Production setups should pin to a specific version tag (e.g., `vitess/vttestserver:mysql80` or a versioned release).
- The VTTablet connection pool flags and default values shown are accurate.
- The VSchema JSON format is correct and matches the official Vitess VSchema reference.
- The core components description (VTGate, VTTablet, VTorc, topology store) is accurate.
- The architecture diagram is a useful simplification, though a production setup would have multiple VTTablet+MySQL pairs per shard (primary + replicas).
