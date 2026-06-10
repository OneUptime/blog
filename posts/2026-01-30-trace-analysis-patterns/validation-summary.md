# Validation Summary: How to Create Trace Analysis Patterns

## Status
validated

## Post Type
Tutorial / Conceptual guide with reference TypeScript implementations

## Technologies Covered
- Distributed tracing (OpenTelemetry-style span model)
- TypeScript
- Mermaid diagrams
- Statistical algorithms: Welford's online mean/variance algorithm, nearest-rank percentile
- Service dependency / graph analysis (DFS over edges built from parent/child spans)
- Trace anomaly detection (z-score over baselines)

## Sources Consulted
- OpenTelemetry span data model: https://opentelemetry.io/docs/specs/otel/trace/api/ (span fields: `spanId`, `parentSpanId`, `startTime`, `endTime`, `attributes`, `kind`, `status`)
- OpenTelemetry status codes: https://opentelemetry.io/docs/specs/otel/trace/api/#set-status (UNSET, OK, ERROR)
- OpenTelemetry SpanKind: https://opentelemetry.io/docs/specs/otel/trace/api/#spankind (INTERNAL, SERVER, CLIENT, PRODUCER, CONSUMER)
- OpenTelemetry semantic conventions: https://opentelemetry.io/docs/specs/semconv/ (`service.name`, `db.system`, `http.url`)
- Welford's online algorithm: https://en.wikipedia.org/wiki/Algorithms_for_calculating_variance#Welford's_online_algorithm
- Critical path concept in distributed tracing: longest end-to-end chain whose end time bounds the root span's end time

## Issues Found
1. **Bug in `buildDependencyGraph` running error rate** (section 4 / Service Dependency Analysis): The original code only updated `service.errorRate` inside an `if (span.status?.code === 'ERROR')` block, so the denominator (`spanCount`) grew for every span but the numerator only grew on errors — and the running-average formula was only applied when the span was an error. This produced an incorrect rate: e.g., after spans error, success, success the reported rate stayed at 1.0 instead of dropping to ~0.33. Fixed by computing `isError` (1 for error, 0 otherwise) and applying the running-average update unconditionally, matching the structure used for `avgLatency` immediately above it.

## Review Notes
- The Welford's algorithm implementation is correct. It computes the population standard deviation via `sqrt(m2 / count)`. For finite-sample inference the unbiased estimator divides by `count - 1` instead, but for anomaly detection over large baselines (the post explicitly gates detection on `stats.count >= 100`) the difference is negligible.
- The `findLongestPath` heuristic in critical path analysis selects the direct child whose `endTime` is latest. This is a sound critical-path heuristic because a parent span cannot end before its latest-ending child, so the path through that child is what bounded the parent's completion.
- Span attribute references (`service.name`, `db.system`, `http.url`, `span.kind` values `CLIENT`/`SERVER`) match OpenTelemetry semantic conventions. Note: `http.url` was superseded by `url.full` in OTel semantic conventions v1.21+, and `db.system` was renamed to `db.system.name` in v1.27+, but both legacy names remain widely supported by collectors and tools — not worth changing in a conceptual post.
- The `cache.type` attribute used in `categorizeSpan` is not part of stable OTel semantic conventions; cache spans are usually emitted with `db.system` (e.g., `redis`, `memcached`). Acceptable as illustrative pseudo-code.
- Several supporting types (`ErrorPattern`, `SpanSummary`, `EdgeAccumulator`, `ImpactAnalysis`, `ComparisonSummary`, `AnomalyEvidence`, `FullAnalysis`, `GroupAnalysis`, `Recommendation`, `Issue`, `BaselineStats`, `SpanStats`) are referenced but not declared. This is consistent with the post's illustrative tone — the snippets are not meant to be copied verbatim into a production project — but readers should be aware that compiling these would require defining those interfaces.
- `findCriticalServicePaths` performs DFS with `visited.delete(current)` on backtrack, allowing the same node to appear in different paths but preventing cycles within a single path. This is appropriate for an acyclic dependency graph; a cyclic graph would still terminate because cycles are blocked within a path.
- The nearest-rank `percentile` function (`Math.ceil((p/100)*n) - 1`, clamped to `>= 0`) is a reasonable choice and matches common implementations.
