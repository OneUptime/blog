# Validation Summary: How to Build Trace Aggregation

## Status
validated

## Post Type
Technical guide / tutorial — long-form walkthrough of building a distributed trace aggregation pipeline, with TypeScript reference implementations and SQL schema designs.

## Technologies Covered
- OpenTelemetry concepts (spans, span kinds, status codes)
- TypeScript / Node.js (EventEmitter, async generators)
- `tdigest` npm package (streaming percentiles)
- Percentile calculation strategies (exact sort, histogram interpolation, t-digest)
- TimescaleDB (hypertables, continuous aggregates, `time_bucket`)
- ClickHouse (`MergeTree`, `SummingMergeTree`, `LowCardinality`, materialized views, TTL)
- Prometheus-style cumulative histogram buckets
- Graphviz DOT format for topology export
- Mermaid diagrams (flowchart, xychart-beta)

## Sources Consulted
- npm `tdigest` package — https://github.com/welch/tdigest (README and exports)
- OpenTelemetry semantic conventions for HTTP and exception attributes — https://opentelemetry.io/docs/specs/semconv/
- TimescaleDB continuous aggregates docs — https://docs.timescale.com/use-timescale/latest/continuous-aggregates/
- ClickHouse `SummingMergeTree` and `LowCardinality` docs — https://clickhouse.com/docs/en/engines/table-engines/mergetree-family/summingmergetree
- Prometheus histogram bucket conventions (`le` upper-bound, cumulative counts) — https://prometheus.io/docs/concepts/metric_types/#histogram
- Node.js `events` / `EventEmitter` API and `zlib.gzipSync` — https://nodejs.org/api/

## Issues Found

1. **Incorrect `tdigest` import (Section 2).** Original code used a default import:
   ```ts
   import TDigest from 'tdigest';
   ```
   The `tdigest` package exports `TDigest` as a named property on `module.exports` (alongside `Digest`). A default import yields the module object, not the class, so `new TDigest()` would fail at runtime. Changed to a named import:
   ```ts
   import { TDigest } from 'tdigest';
   ```

2. **`TraceIdBloomFilter.filter` never initialized (Section 11).** The class declared `private filter: Set<string>;` but never assigned a value, so the first `.add()` / `.has()` call would throw `Cannot read properties of undefined`. Added an inline initializer: `private filter: Set<string> = new Set();`.

3. **Pitfall 3 (Time Zone Handling) was technically wrong.** The original "BAD vs GOOD" pair was:
   ```ts
   // BAD
   const bucket = Math.floor(timestamp / 60000) * 60000;
   // GOOD
   const utcTimestamp = new Date(timestamp).getTime();
   const bucket = Math.floor(utcTimestamp / 60000) * 60000;
   ```
   Both produce identical results — millisecond epoch timestamps are timezone-agnostic, and `new Date(ms).getTime()` returns the same number it was given. The genuine pitfall appears only when bucketing by *calendar* units (day, week, month), where local time vs UTC actually matters. Rewrote the pitfall to use a day-boundary example contrasting `setHours(0,0,0,0)` (local-time, host-dependent) with explicit `Date.UTC(...)`.

## Review Notes

- The post uses `http.status_code`, `db.error`, `error.message`, and `exception.message` as OpenTelemetry attribute keys. Some of these (`http.status_code`, `db.error`, `error.message`, `http.error_message`) are not part of the current stable OpenTelemetry semantic conventions — the stable HTTP conventions use `http.response.status_code`, and standard error reporting uses `exception.*` plus span status. The code is presented as illustrative classification logic that handles whichever attribute set a given SDK happens to emit, so it is not strictly wrong, but readers building against current SDKs should prefer the stable `http.response.status_code` and `exception.*` keys. Not changed because the post does not claim these are official OTel attribute names.
- The `PercentileCalculator.calculateFromHistogram` function correctly assumes Prometheus-style cumulative buckets (matching the example data and the inline comment).
- The TimescaleDB continuous aggregate intentionally notes that averaging `latency_p95_ms` across base buckets is an approximation — this matches Pitfall 2 (percentile re-aggregation) and is called out in the SQL comment.
- The `getServiceErrorSummary` consumer in `ErrorRateAlerter.evaluate` is acknowledged to be simplified (the inline comments say "Would need request count per operation - simplified here"), so the slightly off semantics there are intentional pedagogical scaffolding rather than a bug worth rewriting.
- `MultiResolutionAggregator.selectResolution` returns the *smallest* (finest) resolution whose `resolution >= idealResolution` because configs are sorted ascending; this matches the "Target ~100-200 data points" comment. Behaviour is correct.
- `Downsampler.downsample` will produce `NaN` for `avg` if a source bucket has `count === 0` under the `'avg'` method (sum/count). This is a latent edge case rather than a bug in the documented happy path, so left as-is.
