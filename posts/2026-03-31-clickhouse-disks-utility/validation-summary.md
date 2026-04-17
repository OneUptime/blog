# Validation Summary: How to Use clickhouse-disks Utility

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- ClickHouse
- clickhouse-disks CLI utility
- clickhouse-client
- Local disk storage
- S3 object storage (as a ClickHouse disk backend)

## Sources Consulted
- Official ClickHouse docs: [Clickhouse-disks](https://clickhouse.com/docs/operations/utilities/clickhouse-disks)
- Raw docs source on GitHub: [docs/en/operations/utilities/clickhouse-disks.md](https://github.com/ClickHouse/ClickHouse/blob/master/docs/en/operations/utilities/clickhouse-disks.md)
- ClickHouse source code: [programs/disks/DisksApp.cpp](https://github.com/ClickHouse/ClickHouse/blob/master/programs/disks/DisksApp.cpp)
- GitHub issue proposing the utility: [#34998 Remote disk managing tool](https://github.com/ClickHouse/ClickHouse/issues/34998)
- GitHub PR adding disk commands: [#36060 Add feature disks](https://github.com/ClickHouse/ClickHouse/pull/36060) (merged 2022-06-07)
- ClickHouse system.disks table docs: [system-tables/disks.md](https://github.com/ClickHouse/ClickHouse/blob/master/docs/en/operations/system-tables/disks.md)

## Issues Found

1. **Incorrect config flag name.** The post used `--config /etc/clickhouse-server/config.xml` throughout. The official flag is `--config-file` (short `-C`). Per the docs, the program-wide options are `--config-file, -C`, `--save-logs`, `--log-level`, `--disk`, `--query, -q`, and `--help, -h` — there is no `--config` alias. Replaced every occurrence with `--config-file`.

2. **Non-interactive commands missing `--query` flag.** The post invoked subcommands positionally, e.g. `clickhouse-disks ... list-disks` and `clickhouse-disks ... --disk default list /data/...`. Per the docs and `DisksApp.cpp`, the utility launches interactive mode by default; a single command is executed non-interactively only when passed via `--query, -q`. Rewrote the List Configured Disks, Listing Files, Copying Data, Removing Files, and Manual Cold Storage Migration examples to use `--query "..."`. The Interactive Mode example (which intentionally has no command) was left as-is aside from the config flag fix.

3. **Inaccurate "since 22.4" version claim.** The utility's disk commands were added in [PR #36060](https://github.com/ClickHouse/ClickHouse/pull/36060), merged 2022-06-07 — after the 22.4 (Apr 2022), 22.5 (May 2022), and 22.6 (released early June 2022, branch cut before the merge) releases. The earliest stable release to include the tool is 22.7. Changed "ClickHouse 22.4 and later" to "ClickHouse 22.7 and later".

## Review Notes
- The `system.disks` query in "Checking Disk Usage" is accurate: `name`, `path`, `free_space`, and `total_space` are all valid columns of `system.disks`.
- The `--disk` flag defaults to `default`, so specifying it is only strictly needed when targeting a non-default disk, but leaving it explicit in the examples aids clarity.
- The `copy` subcommand syntax (`--disk-from`, `--disk-to`, `<source>`, `<destination>`) is correct.
- The utility has evolved (new commands like `switch-disk`, `read`, `write`, `mkdir` exist); the post only covers the most common operations, which is fine for an introductory guide.
- Partition directory name format `YYYYMM_<min_block>_<max_block>_<level>` used in examples (e.g. `202601_1_1_0`, `202506_1_100_5`) matches the MergeTree part naming convention.
