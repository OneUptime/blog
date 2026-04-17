# Validation Summary: How to Understand ClickHouse Distributed Query Execution

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- ClickHouse
- Distributed table engine
- MergeTree storage
- ClickHouse `EXPLAIN` query plan
- Two-level aggregation (GROUP BY)
- ClickHouse `load_balancing` setting
- `system.query_log` and ProfileEvents

## Sources Consulted
- ClickHouse official documentation on settings: https://clickhouse.com/docs/operations/settings/settings
- ClickHouse source `src/Common/ProfileEvents.cpp`: https://github.com/ClickHouse/ClickHouse/blob/master/src/Common/ProfileEvents.cpp
- ClickHouse `system.events` / `system.query_log` docs: https://clickhouse.com/docs/operations/system-tables/events
- Altinity Knowledge Base on load balancers: https://kb.altinity.com/altinity-kb-setup-and-maintenance/load-balancers/
- PR introducing `hostname_levenshtein_distance` (contrasted with the older `nearest_hostname`): https://github.com/ClickHouse/ClickHouse/pull/54826

## Issues Found
- **`nearest_hostname` described as "lexicographically closest"** — this is inaccurate. ClickHouse selects the replica whose hostname has the fewest differing characters at matching positions relative to the initiator's hostname (a Hamming-style positional character comparison), not lexicographic (dictionary) order. Reworded to "whose hostname differs from the initiator's by the fewest characters at matching positions, reducing cross-datacenter traffic."

## Review Notes
- All ProfileEvent names used (`AggregationHashTablesInitializedAsTwoLevel`, `NetworkSendBytes`, `NetworkReceiveBytes`, `RemoteReadThrottlerSleepMicroseconds`) exist in the ClickHouse ProfileEvents source.
- The `load_balancing` options listed (random, nearest_hostname, in_order, first_or_random) are all valid. The post is not exhaustive — ClickHouse also supports `round_robin` and the newer `hostname_levenshtein_distance`, but the list is presented as a sample ("options:") and does not claim completeness.
- The settings `group_by_two_level_threshold` (default 100000) and `group_by_two_level_threshold_bytes` (default 50000000) are correct and match defaults.
- The execution-stages description (initiator parse, rewrite, fan-out, per-shard execution, streaming partial results, final merge on initiator) matches ClickHouse's distributed query behavior.
- `ReadFromRemote` is a real query plan step visible in `EXPLAIN` output for distributed queries. The "Distributed" reference is understood to point at the Distributed table engine source rather than a literal distinct node name — acceptable for a conceptual overview.
