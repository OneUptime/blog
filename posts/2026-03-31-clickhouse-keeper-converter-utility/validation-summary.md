# Validation Summary: How to Use clickhouse-keeper-converter Utility

## Status
validated

## Post Type
Tutorial / Migration Guide

## Technologies Covered
- ClickHouse
- ClickHouse Keeper
- clickhouse-keeper-converter utility
- Apache ZooKeeper
- Raft consensus protocol
- XML configuration (config.xml)

## Sources Consulted
- ClickHouse Keeper guide: https://clickhouse.com/docs/guides/sre/keeper/clickhouse-keeper
- ClickHouse source — keeper-converter: https://github.com/ClickHouse/ClickHouse/blob/master/programs/keeper-converter/KeeperConverter.cpp
- ClickHouse source — KeeperSnapshotManager.cpp (snapshot filename format: `snapshot_{up_to_log_idx}.bin[.zstd]`)
- ZooKeeper administration docs (snapshot naming `snapshot.<zxid>` in `version-2/`, four-letter-word commands)

## Issues Found
- **Incorrect output snapshot glob**: The verification step used `snapshot.*` to describe the expected converted output files. ClickHouse Keeper writes snapshots as `snapshot_<N>.bin` (optionally `.bin.zstd`), so the literal dot in `snapshot.*` would not match. Updated the comment to `snapshot_*.bin files should appear` to reflect the actual filename format produced by `KeeperSnapshotManager`.

## Review Notes
- The `clickhouse-keeper-converter` CLI flags (`--zookeeper-logs-dir`, `--zookeeper-snapshots-dir`, `--output-dir`) match the official documentation and example usage.
- The ZooKeeper snapshot path `/var/lib/zookeeper/data/version-2/snapshot.*` uses the correct `snapshot.<zxid>` naming convention for ZooKeeper's on-disk files.
- The `keeper_server` XML configuration (fields `tcp_port`, `server_id`, `log_storage_path`, `snapshot_storage_path`, `coordination_settings`, `raft_configuration`) matches ClickHouse Keeper's expected schema.
- The four-letter-word commands (`stat`, `ruok`) used for ZooKeeper/Keeper health checks require the `4lw.commands.whitelist` (ZooKeeper 3.5+) / `four_letter_word_white_list` setting (ClickHouse Keeper) to be enabled. This is commonly preconfigured but readers on locked-down clusters may need to enable it — worth noting in a future revision.
- "Ships with ClickHouse 22.4+" is reasonable: ClickHouse Keeper was declared production-ready in 22.4, though the converter existed in earlier releases.
- The post does not mention that the converter must be run while the ZooKeeper ensemble is stopped (or against a fully-committed snapshot) to guarantee a consistent migration. This is an operational caveat rather than a technical error.
