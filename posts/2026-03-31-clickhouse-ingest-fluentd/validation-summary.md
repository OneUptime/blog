# Validation Summary: How to Ingest Data from Fluentd into ClickHouse

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Fluentd (and `fluent-plugin-clickhouse` Ruby gem)
- Fluent Bit
- ClickHouse (MergeTree, LowCardinality, TTL, HTTP interface / JSONEachRow)
- td-agent / td-agent-gem
- Docker

## Sources Consulted
- `fluent-plugin-clickhouse` source: https://github.com/kumagi/fluent-plugin-clickhouse/blob/master/lib/fluent/plugin/out_clickhouse.rb
- RubyGems listing: https://rubygems.org/gems/fluent-plugin-clickhouse
- Fluentd buffer docs: https://docs.fluentd.org/configuration/buffer-section
- Fluent Bit plugin tree: https://github.com/fluent/fluent-bit/tree/master/plugins
- Fluent Bit HTTP output: https://docs.fluentbit.io/manual/pipeline/outputs/http
- Fluent Bit stdin input: https://docs.fluentbit.io/manual/pipeline/inputs/standard-input
- ClickHouse CREATE TABLE: https://clickhouse.com/docs/en/sql-reference/statements/create/table
- ClickHouse TTL / LowCardinality / MergeTree docs

## Issues Found

1. **Fluentd match block was missing the required `columns` parameter.** The `fluent-plugin-clickhouse` plugin (kumagi) maps record fields to ClickHouse columns positionally via a comma-separated `columns` config param. Without it, `write()` raises `NoMethodError` on `nil.map`. Added `columns ts,level,service,message,host` to match the target table schema.

2. **Removed the `<format>` subsection from the Fluentd match block.** The plugin does not declare a `<format>` sub-config and writes rows directly via the `clickhouse` Ruby client using `columns`; the block would either be ignored or cause a config error depending on Fluentd version.

3. **Fluent Bit does not ship a native `clickhouse` output plugin.** Verified by checking the Fluent Bit plugin tree — there is no `out_clickhouse`. Rewrote the Fluent Bit section to use the built-in `http` output pointed at ClickHouse's HTTP interface with `URI=/?query=INSERT INTO app_logs FORMAT JSONEachRow`. Changed `format json_stream` to `format json_lines` (which is newline-delimited JSON objects — the format ClickHouse `JSONEachRow` expects).

4. **Fixed the test `docker run` command.** The original used `-o clickhouse`, which does not exist as a Fluent Bit output. Replaced with `-o http` with appropriate `-p` overrides for host/port/uri/format.

## Review Notes

- `fluent-plugin-clickhouse` (kumagi) has had no release since 2018 (v0.0.1), inherits from the deprecated `Fluent::BufferedOutput` v0.12 base class, and has essentially no README documentation. The buffer parameters used in the post (`flush_interval`, `buffer_chunk_limit`, `buffer_queue_limit`, `retry_wait`, `retry_limit`) are top-level v0.12-style names that still work via Fluentd v1's compat shim but emit deprecation warnings; modern v1 idiom nests them in a `<buffer>` section with renamed keys (`chunk_limit_size`, `total_limit_size`, etc.). Left as-is to match the gem's era, but readers evaluating this plugin for new production deployments should be aware of its maintenance status.
- The ClickHouse `CREATE TABLE` statement is valid and idiomatic.
- The `record_transformer` filter and `Socket.gethostname` interpolation are correct Fluentd syntax.
