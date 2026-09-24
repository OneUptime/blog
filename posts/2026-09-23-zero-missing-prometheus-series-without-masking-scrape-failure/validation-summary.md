# Validation Summary: How to Return Zero for Missing Prometheus Series Without Masking a Failed Scrape

## Status
validated

## Post Type
Technical guide with Python instrumentation and PromQL examples.

## Technologies Covered
- Prometheus scrape health, target discovery, and staleness
- PromQL rates, aggregation, vector matching, set operators, and absence detection
- Python prometheus_client labeled counters

## Sources Consulted
- Python client labels and initialization: https://prometheus.github.io/client_python/instrumenting/labels/
- Prometheus jobs, instances, and automatically generated metrics: https://prometheus.io/docs/concepts/jobs_instances/#automatically-generated-labels-and-time-series
- PromQL operators, aggregation, and vector matching: https://prometheus.io/docs/prometheus/latest/querying/operators/
- PromQL rate, absent, and vector functions: https://prometheus.io/docs/prometheus/latest/querying/functions/
- Prometheus query staleness and lookback: https://prometheus.io/docs/prometheus/latest/querying/basics/#staleness
- Prometheus instrumentation and avoiding missing metrics: https://prometheus.io/docs/practices/instrumentation/#avoid-missing-metrics
- Prometheus experimental start-timestamp feature flags: https://prometheus.io/docs/prometheus/latest/feature_flags/
- Official Prometheus rate implementation, including sample-count and start-timestamp handling: https://raw.githubusercontent.com/prometheus/prometheus/main/promql/functions.go

## Issues Found
- The `or vector(0)` explanation referred to a global scalar. Set operators require instant vectors, and `vector(0)` returns a single-element instant vector. Changed the description to a global, label-less instant vector and clarified that the fallback is added only when no matching label-less result exists.
- The statement that a counter with one sample always yields no rate omitted experimental start-timestamp behavior. Qualified it as default behavior with one sample inside the selected range, and noted that suitable start timestamps can permit a single-sample rate when experimental support is enabled. The official implementation and feature documentation establish this exception.

## Review Notes
- Verified the Python Counter constructor and keyword-label initialization against official client documentation; executed the example and checked that all three counter children expose zero.
- Reviewed every PromQL example against documented syntax and semantics. Applying rate before aggregation preserves counter-reset handling. Filtering up before aggregation creates healthy-target zeros, and the final intersection preserves rate values while excluding targets without a matching healthy up series.
- Reviewed expected cases: healthy absence produces zero; healthy counters with sufficient samples retain their rate; failed scrapes exclude historical rates; absent targets are excluded once their up series becomes stale; and single-sample startup normally uses the fallback under default behavior.
- The queries correctly depend on consistent target labels and target uniqueness after HA deduplication. up measures scrape success, not application correctness or metric completeness. Mandatory instrumentation still needs a separate presence check.
- Job-wide absent detection does not identify individual missing targets while other targets remain. Discovery removal becomes visible according to staleness and lookback behavior, rather than necessarily at the instant of removal.
- A five-minute rate selector does not require five full minutes of history to produce a result; the post correctly emphasizes sufficient samples and startup policy rather than guaranteeing complete window coverage.
- All technical documentation links in the post resolved to the intended official resources. No terminal commands, configuration snippets, or pinned software versions required correction, and no deprecated APIs were identified in the examples.
- PromQL validation was based on official documentation and source inspection. promtool was not available locally, so no live Prometheus execution or promtool scenario tests were performed.
