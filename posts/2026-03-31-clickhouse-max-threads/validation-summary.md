# Validation Summary: How to Set max_threads in ClickHouse for Parallel Query Execution

## Status
validated

## Post Type
Tutorial / Configuration Guide

## Technologies Covered
- ClickHouse (query execution settings, user profiles, system tables)
- SQL (ClickHouse dialect)
- ClickHouse HTTP interface
- XML configuration (ClickHouse profiles)

## Sources Consulted
- ClickHouse official documentation on `max_threads`: https://clickhouse.com/docs/en/operations/settings/settings#max_threads
- ClickHouse source code `Settings.h` — default value definition (`MaxThreads, max_threads, 0`)
- ClickHouse source code `getNumberOfPhysicalCPUCores()` — confirms physical core detection
- ClickHouse GitHub issue #37752 and PR #44973 — clarifies physical vs logical core behavior
- ClickHouse official documentation on `system.settings`: https://clickhouse.com/docs/en/operations/system-tables/settings
- ClickHouse official documentation on `system.processes`: https://clickhouse.com/docs/en/operations/system-tables/processes
- ClickHouse official documentation on `system.query_log`: https://clickhouse.com/docs/en/operations/system-tables/query_log
- ClickHouse official documentation on HTTP interface: https://clickhouse.com/docs/en/interfaces/http
- ClickHouse source code `ProfileEvents.cpp` — verified `RealTimeMicroseconds` and `OSCPUVirtualTimeMicroseconds` event names
- ClickHouse official documentation on `max_streams_to_max_threads_ratio`, `max_insert_threads`, `use_hedged_requests`

## Issues Found

1. **"logical CPU cores" was incorrect — changed to "physical CPU cores".**
   The post stated `max_threads = 0` tells ClickHouse to use "all logical CPU cores." ClickHouse's `getNumberOfPhysicalCPUCores()` function specifically targets physical cores (on systems with 32+ logical cores and HyperThreading enabled, it halves the count). Changed to "the number of physical CPU cores available on the server."

2. **Misleading comment on second query in "Checking the Current Value" section.**
   The comment said "Check the actual core count on the server" but the query shows the `max_threads` setting value from `system.settings`, which displays `0` (the configured default), not the resolved core count. Changed comment to "Show max_threads value in vertical format (0 indicates auto-detection of physical cores)."

3. **"Parallel Reading of Parts" section misrepresented `max_read_buffer_size`.**
   The section claimed ClickHouse reads parts in parallel independently of `max_threads` and showed `max_read_buffer_size` as the controlling setting. In reality, `max_read_buffer_size` controls the buffer size for individual filesystem read operations and has nothing to do with parallelism. Renamed section to "Tuning Read Buffer Size" and corrected the description and code comment to accurately reflect what the setting does.

4. **HTTP interface: settings passed incorrectly as POST body parameters.**
   The curl example passed `max_threads=4` as a `--data-urlencode` POST body parameter. ClickHouse's HTTP interface requires settings to be passed as URL query parameters (e.g., `?max_threads=4`), with the POST body reserved for the query text. Fixed to `curl "http://localhost:8123/?max_threads=4" --data-urlencode "query=..."`.

## Review Notes
- The `max_streams_to_max_threads_ratio`, `max_insert_threads`, `use_hedged_requests`, `system.processes.thread_ids`, and `ProfileEvents` references were all verified as accurate.
- The XML profile configuration format using `<clickhouse>` (rather than the deprecated `<yandex>`) is correct for modern ClickHouse versions.
- The monitoring queries using `system.processes` and `system.query_log` are well-constructed and the parallelism_ratio calculation is a useful diagnostic technique.
- The sizing recommendations table provides reasonable guidelines, though actual values will depend on hardware, data volume, and query complexity.
