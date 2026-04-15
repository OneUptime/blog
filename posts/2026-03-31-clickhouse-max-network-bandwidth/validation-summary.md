# Validation Summary: How to Configure ClickHouse Max Network Bandwidth

## Status
validated

## Post Type
Tutorial / Configuration Guide

## Technologies Covered
- ClickHouse (query settings, server configuration, replication settings)
- `users.xml` and settings profiles configuration
- `system.processes` system table
- `clickhouse-client` CLI

## Sources Consulted
- ClickHouse official documentation on query-level settings: https://clickhouse.com/docs/en/operations/settings/settings#max_network_bandwidth
- ClickHouse official documentation on `max_network_bandwidth_for_user`: https://clickhouse.com/docs/en/operations/settings/settings#max_network_bandwidth_for_user
- ClickHouse official documentation on `max_network_bandwidth_for_all_users`: https://clickhouse.com/docs/en/operations/settings/settings#max_network_bandwidth_for_all_users
- ClickHouse official documentation on settings profiles: https://clickhouse.com/docs/en/operations/settings/settings-profiles
- ClickHouse official documentation on `system.processes`: https://clickhouse.com/docs/en/operations/system-tables/processes
- ClickHouse official documentation on MergeTree replication settings (max_replicated_fetches_network_bandwidth, max_replicated_fetches_network_bandwidth_for_server)
- ClickHouse GitHub PR #24573 introducing server-wide replication bandwidth limits

## Issues Found

1. **Incorrect `users.xml` XML structure**: The original post placed `<max_network_bandwidth>` and `<max_network_bandwidth_for_user>` as direct children of the `<export_user>` element. In ClickHouse, these settings must be defined inside a `<profiles>` section as part of a named settings profile, and the user references that profile via `<profile>profile_name</profile>`. Fixed by restructuring the XML to use a dedicated `<export_profile>` profile that the user references.

2. **Unverified claim about outbound-only scope**: The original post stated "These settings apply to outbound result transfer, not inbound INSERT data." The official ClickHouse documentation describes `max_network_bandwidth` as limiting "the speed of data exchange over the network in bytes per second" without specifying a direction restriction. The claim that INSERT data is excluded is not supported by official documentation. Changed to a neutral description that matches the official docs.

## Review Notes
- The replication bandwidth XML snippets (`max_replicated_fetches_network_bandwidth_for_server` and `max_replicated_sends_network_bandwidth_for_server`) are shown as bare XML elements without indicating which configuration section they belong in. These are typically configured in the default profile or MergeTree server settings. The blog is slightly ambiguous here but not technically incorrect since the reader would need to place them in the appropriate config context.
- The `max_network_bandwidth_for_all_users` setting is shown being set via a session `SET` statement. While syntactically valid, this is a server-wide setting more commonly configured in a settings profile rather than per-session. The blog could note this distinction but it is not technically wrong.
- All `system.processes` column references (`query_id`, `user`, `read_bytes`, `written_bytes`, `elapsed`) were verified as correct.
- The `clickhouse-client --max_network_bandwidth=...` CLI usage is correct.
- The per-table `ALTER TABLE ... MODIFY SETTING max_replicated_fetches_network_bandwidth` syntax is correct.
