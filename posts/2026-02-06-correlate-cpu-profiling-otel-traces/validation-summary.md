# Validation Summary: How to Correlate CPU Profiling Data with OpenTelemetry Traces to Identify Hot

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- OpenTelemetry traces and profiles
- Grafana Pyroscope
- Grafana Tempo / TraceQL
- Grafana data source provisioning
- Go profiling with `pyroscope-go` and `otel-profiling-go`
- Java profiling with async-profiler
- Node.js CPU profiling with the inspector API
- Python OpenTelemetry trace flags

## Sources Consulted
- Grafana Pyroscope span profiles for Go: https://grafana.com/docs/pyroscope/latest/configure-client/trace-span-profiles/go-span-profiles/
- Grafana Pyroscope server HTTP API: https://grafana.com/docs/pyroscope/latest/reference-server-api/
- Grafana Tempo data source provisioning: https://grafana.com/docs/grafana/latest/datasources/tempo/configure-tempo-data-source/provision/
- Grafana Cloud Traces to profiles documentation: https://grafana.com/docs/grafana-cloud/monitor-applications/profiles/traces-to-profiles/
- Node.js inspector API documentation: https://nodejs.org/api/inspector.html
- async-profiler project documentation and API source: https://github.com/async-profiler/async-profiler
- OpenTelemetry specification status summary: https://opentelemetry.io/docs/specs/status/
- OpenTelemetry profiles concepts: https://opentelemetry.io/docs/concepts/signals/profiles/
- OpenTelemetry Python trace API: https://opentelemetry-python.readthedocs.io/en/stable/api/trace.html
- Grafana Tempo TraceQL documentation: https://grafana.com/docs/tempo/latest/traceql/construct-traceql-queries/

## Issues Found
- The Go Pyroscope example implied allocation profiles would be span-linked. Grafana's span profile documentation currently states only CPU profiling is supported for span profiles, so the example now enables only `pyroscope.ProfileCPU` and clarifies that CPU samples are labeled with span IDs.
- The Node.js section was titled "Using perf with Node.js" but used the Node.js inspector CPU profiler. The heading now accurately says "Using Node.js inspector."
- The Node.js inspector example used callback-style `Session` calls without awaiting profiler startup and did not stop profiling if the profiled operation failed. It now uses `node:inspector/promises`, awaits `Profiler.enable`, `Profiler.start`, and `Profiler.stop`, and stops/disconnects in `finally`.
- The Java async-profiler example called `AsyncProfiler.execute`, which can throw `IOException`, without declaring or handling it. The method now declares `throws Exception`, and profiler stop logic runs in `finally` so the process-wide profiler is not left running if the operation fails.
- The Pyroscope retrieval example used an undocumented `/api/v1/profile` URL with `app` and `span_id` parameters. It now uses the documented `querier.v1.QuerierService/SelectMergeSpanProfile` endpoint with `spanSelector`, `labelSelector`, and `profileTypeID`.
- The Grafana `tracesToProfiles.profileTypeId` value was incomplete. It now uses the documented `process_cpu:cpu:nanoseconds:cpu:nanoseconds` value.
- The Python sampling comment said it profiled "100% of requests that are already slow," but the code only checks the sampled/debug trace flag before the request duration is known. The comment now describes traces already selected for debugging.

## Review Notes
OpenTelemetry profiles are still under development/experimental according to the official OpenTelemetry documentation, so profile-specific APIs and collector support may change. The Java async-profiler example is still intentionally simplified; in a real concurrent service, async-profiler is process-wide, so per-request start/stop profiling needs coordination to avoid overlapping profiling sessions.
