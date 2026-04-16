# Validation Summary: How to Ingest Data from StatsD into ClickHouse

## Status
validated

## Post Type
Tutorial / How-to guide

## Technologies Covered
- ClickHouse (MergeTree, TTL, LowCardinality, Map)
- StatsD (wire format, metric types)
- Vector.dev (statsd source, metric_to_log transform, remap transform, clickhouse sink)
- Node.js (`dgram` UDP socket, `@clickhouse/client`)
- SQL (aggregation with `toStartOfMinute`, `sum`)

## Sources Consulted
- Vector StatsD source: https://vector.dev/docs/reference/configuration/sources/statsd/
- Vector `metric_to_log` transform: https://vector.dev/docs/reference/configuration/transforms/metric_to_log/
- Vector `remap` transform: https://vector.dev/docs/reference/configuration/transforms/remap/
- Vector ClickHouse sink: https://vector.dev/docs/reference/configuration/sinks/clickhouse/
- ClickHouse JS client: https://clickhouse.com/docs/integrations/language-clients/javascript
- clickhouse-js CHANGELOG (for the v1.0.0 `host` → `url` deprecation): https://github.com/ClickHouse/clickhouse-js/blob/main/CHANGELOG.md
- StatsD wire format (Etsy spec) and DogStatsD datagram format: https://docs.datadoghq.com/developers/dogstatsd/datagram_shell/
- ClickHouse MergeTree / TTL docs: https://clickhouse.com/docs/engines/table-engines/mergetree-family/mergetree

## Issues Found

1. **Vector pipeline fed metric events into the ClickHouse sink (broken).**
   The original config wired `statsd` → `remap` → `clickhouse`. Vector's `statsd` source emits **metric** events, but the `clickhouse` sink only accepts **log** events, so the pipeline would not run. Added a `metric_to_log` transform in between.

2. **Incorrect use of `.kind` as metric type in VRL.**
   The original `remap` used `.metric_type = string!(.kind)` and `.value = float!(.value)`. On a Vector metric event, `.kind` is `"incremental"` or `"absolute"` (aggregation semantics), not `counter`/`gauge`/`timer`. There is also no top-level `.value` on a metric; the value lives under `.counter.value`, `.gauge.value`, etc. Replaced the body of the `remap` with a conditional that, after `metric_to_log`, branches on the presence of `.counter`/`.gauge`/`.distribution`/`.set` sub-fields to set `metric_type` and `value` correctly.

3. **Node.js StatsD parser swapped value and type.**
   The original code destructured `msg.split('|')` into `[nameType, valueStr, sampleRate]` and then did `nameType.split(':')` into `[name, rawType]`. The StatsD wire format is `<name>:<value>|<type>[|@<rate>]`, so after the first split the first element is `name:value` (not `name:type`) and the second element is the type (not the value). The result was that `metric_type` got the numeric value as a string and `value: parseFloat(valueStr)` parsed the type string (e.g. `"c"`) and produced `NaN`. Renamed/rewired the variables so that `metric_type` receives the type token and `value` receives the parsed numeric value.

4. **`@clickhouse/client` used deprecated `host` option.**
   Changed `createClient({ host: 'http://clickhouse:8123' })` to `createClient({ url: 'http://clickhouse:8123' })`. The `host` option was deprecated in `@clickhouse/client` v1.0.0 in favour of `url`; it still works with a deprecation warning but new code should use `url`.

## Review Notes

- The SQL schema and query are valid ClickHouse — `LowCardinality(String)`, `Map(String, String)`, `MergeTree`, `PARTITION BY toYYYYMM(...)`, `TTL`, and `toStartOfMinute(...)` all behave as described.
- The StatsD wire-format parser in the Node.js example still intentionally ignores tags (DogStatsD `|#tag1:v1,tag2` segments) and sample rate; that is fine for an illustrative snippet but a production forwarder should parse those by prefix (`@` for sample rate, `#` for tags), since both are optional and their position is not fixed.
- The Node.js forwarder has a minor race — `flush()` is `async` and two flushes can run concurrently under bursty traffic (both the size-triggered and the interval-triggered path call `buffer.splice(0)`, which mitigates double-send but there is no back-pressure on the insert). Not a technical inaccuracy, just an implementation caveat worth noting for readers.
- The `statsd` source's `address` field is listed as required by the docs, so keeping it explicit (`0.0.0.0:8125`) as the post already does is the right call.
- The ClickHouse JS client also prefers `username` over the older `user`, but since the post does not pass credentials to the JS client this does not need changing here.
