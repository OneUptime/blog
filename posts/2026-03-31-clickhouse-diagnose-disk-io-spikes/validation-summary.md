# Validation Summary: How to Diagnose ClickHouse Disk IO Spikes

## Status
validated

## Post Type
Tutorial / Diagnostic guide

## Technologies Covered
- ClickHouse (system.merges, system.query_log, system.parts)
- MergeTree engine settings
- Linux IO tools (iostat, iotop)
- XML server configuration (config.xml)

## Sources Consulted
- ClickHouse docs: system.merges — https://clickhouse.com/docs/en/operations/system-tables/merges
- ClickHouse docs: system.query_log — https://clickhouse.com/docs/en/operations/system-tables/query_log
- ClickHouse docs: system.parts — https://clickhouse.com/docs/en/operations/system-tables/parts
- ClickHouse docs: MergeTree settings — https://clickhouse.com/docs/operations/settings/merge-tree-settings
- ClickHouse docs: Server settings — https://clickhouse.com/docs/operations/server-configuration-parameters/settings
- Linux man pages: iostat(1), iotop(8)

## Issues Found
1. **Intro count mismatch.** The opening line said "three main sources" but four bullet points followed. Changed to "four main sources".
2. **Config placement error.** `max_bytes_to_merge_at_max_space_in_pool` is a MergeTree setting and must live inside the `<merge_tree>` section of `config.xml`, while `background_merges_mutations_concurrency_ratio` is a top-level server setting. The original snippet placed both at the same level, which would not apply the MergeTree setting correctly. Restructured the XML to wrap `max_bytes_to_merge_at_max_space_in_pool` inside a `<merge_tree>` block.

## Review Notes
- The `system.merges`, `system.query_log`, and `system.parts` column names and types used in the queries are all correct per current ClickHouse documentation.
- The `iostat -x 1 10` and `iotop -o -P` invocations are correct for the standard sysstat and iotop packages.
- The heuristic "high `await` with low `%util` suggests small random reads" is a simplification — high await with low util more commonly points to a small number of slow requests (e.g., high-latency storage). It's not strictly wrong in context, but readers should not treat it as definitive; the overall emphasis on correlating ClickHouse-level signals with host metrics is sound.
- `today() - 7` correctly returns a Date 7 days ago in ClickHouse and compares via implicit conversion with DateTime columns.
