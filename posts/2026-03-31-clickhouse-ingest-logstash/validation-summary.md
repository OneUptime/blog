# Validation Summary: How to Ingest Data from Logstash into ClickHouse

## Status
validated

## Post Type
Tutorial / How-to guide

## Technologies Covered
- Logstash (logstash-output-http plugin)
- ClickHouse (HTTP interface, JSONEachRow format, MergeTree, Buffer tables, async_insert)
- Beats input (Filebeat protocol, port 5044)

## Sources Consulted
- Logstash HTTP output plugin docs: https://www.elastic.co/guide/en/logstash/current/plugins-outputs-http.html
- Logstash mutate filter docs: https://www.elastic.co/guide/en/logstash/current/plugins-filters-mutate.html
- Logstash date filter docs: https://www.elastic.co/guide/en/logstash/current/plugins-filters-date.html
- ClickHouse HTTP interface docs: https://clickhouse.com/docs/en/interfaces/http
- ClickHouse formats (JSONEachRow): https://clickhouse.com/docs/en/interfaces/formats#jsoneachrow
- ClickHouse async_insert docs: https://clickhouse.com/docs/en/optimize/asynchronous-inserts

## Issues Found
1. **Invalid plugin options `batch_size` and `batch_timeout`** — The `logstash-output-http` plugin does not expose `batch_size` or `batch_timeout` settings; batching is controlled by Logstash pipeline settings (`pipeline.batch.size` / `pipeline.batch.delay`). Removed both options from the HTTP output block and from the Performance Tips section.
2. **Incompatible `format => json_batch` with `FORMAT JSONEachRow`** — `json_batch` serialises a batch of events as a single JSON array (`[{...},{...}]`), which is not valid `JSONEachRow` input (that format requires newline-delimited JSON objects). Changed to `format => "json"` so each event is serialised as a standalone JSON object that ClickHouse will accept. Updated the Summary and Performance Tips to match.
3. **Contradictory `codec => json_lines`** — The `http` output plugin ignores codecs (per its documentation: "this gem does not yet support codecs"), and the directive conflicts with the `format` setting. Removed it.
4. **Broken test command** — `echo '{...}' | logstash -f clickhouse.conf` does not feed the pipeline when the input is `beats { port => 5044 }`; Logstash only reads stdin when the config uses `stdin {}` input. Replaced with instructions to start Logstash with the config and ship a test event from a Beats producer.
5. **Performance Tips referenced invalid options** — The recommendation to "Set `batch_size => 5000` and `batch_timeout => 10`" was removed; replaced with guidance to tune `pipeline.workers` (since `format => json` sends one request per event) and pair with `async_insert=1` / `wait_for_async_insert=0` for server-side batching.

## Review Notes
- The `mutate` filter ordering used in the Field Mapping section (`rename` → `convert` → `gsub`) is correct; Logstash processes mutate operations in a fixed order regardless of declaration order.
- The `X-ClickHouse-User` / `X-ClickHouse-Key` authentication headers are documented and correct.
- `http_method => "post"` (lowercase) is accepted by the plugin's enum validation.
- The `TTL ts + INTERVAL 90 DAY` clause on the target table relies on the `ts` column remaining a `DateTime`; authors using the `gsub`-based string conversion should ensure ClickHouse auto-parses the resulting `YYYY-MM-DD HH:MM:SS` string back into `DateTime` on insert — this works for `JSONEachRow` with standard date-time strings.
- The post does not pin versions; the HTTP output plugin options and ClickHouse formats referenced are current as of the 2026-04-16 review date.
