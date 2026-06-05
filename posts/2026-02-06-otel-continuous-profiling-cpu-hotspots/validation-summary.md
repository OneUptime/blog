# Validation Summary: How to Use OpenTelemetry Continuous Profiling to Correlate CPU Hotspots

## Status
validated

## Post Type
Technical tutorial / guide

## Technologies Covered
- OpenTelemetry profiles and traces
- Grafana Pyroscope
- Grafana Tempo and TraceQL
- Grafana traces-to-profiles / span profiles
- Go
- Python

## Sources Consulted
- OpenTelemetry specification status summary: https://opentelemetry.io/docs/specs/status/
- OpenTelemetry profiles concept page: https://opentelemetry.io/docs/concepts/signals/profiles/
- Grafana Pyroscope Span Profiles overview: https://grafana.com/docs/pyroscope/latest/configure-client/trace-span-profiles/
- Grafana Pyroscope Go span profiles documentation: https://grafana.com/docs/pyroscope/latest/configure-client/trace-span-profiles/go-span-profiles/
- Grafana Pyroscope Python span profiles documentation: https://grafana.com/docs/pyroscope/latest/configure-client/trace-span-profiles/python-span-profiles/
- Grafana Pyroscope Python SDK documentation: https://grafana.com/docs/pyroscope/latest/configure-client/language-sdks/python/
- Grafana Pyroscope server HTTP API documentation: https://grafana.com/docs/pyroscope/latest/reference-server-api/
- Grafana Pyroscope traces-to-profiles data source documentation: https://grafana.com/docs/grafana/latest/datasources/pyroscope/configure-traces-to-profiles/
- Grafana Tempo HTTP API documentation: https://grafana.com/docs/tempo/latest/api_docs/
- Grafana Tempo TraceQL query documentation: https://grafana.com/docs/tempo/latest/traceql/construct-traceql-queries/
- Go package documentation for github.com/grafana/pyroscope-go: https://pkg.go.dev/github.com/grafana/pyroscope-go
- Go package documentation for github.com/grafana/otel-profiling-go: https://pkg.go.dev/github.com/grafana/otel-profiling-go
- grafana/otel-profiling-python source and README: https://github.com/grafana/otel-profiling-python

## Issues Found
- The OpenTelemetry profiling overview overstated direct span linking as a general OTel behavior. Updated it to describe the developing OpenTelemetry profiles signal and Grafana Pyroscope's bridge-package behavior more precisely.
- The Go snippet imported `runtime` without using it and referenced an undefined `traceExporter`. Removed the unused import, accepted `traceExporter trace.SpanExporter` as a parameter, handled the `pyroscope.Start` error, and returned `nil` on success.
- The Go explanation said the wrapper intercepts span start/stop generically. Updated it to match the documented behavior: pprof samples are labeled with `span_id`, and linked spans get `pyroscope.profile.id`.
- The Python setup described `py-spy` as the integration. Updated it to the documented Pyroscope Python SDK plus `pyroscope-otel` integration.
- The Python comments implied every span would be linked. Updated them to note that the processor adds `pyroscope.profile.id` to root spans and tags samples with `span_id`.
- The Pyroscope query example used `/api/v1/query`, which is not the documented primary profile query endpoint. Updated it to `/pyroscope/render`.
- The Tempo parsing example expected a `batches` / `scopeSpans` shape after fetching a trace. Updated it to use the documented TraceQL search response `spanSets` and matching span fields.
- The Grafana dashboard example used a PromQL-style `topk()` query for Pyroscope. Replaced it with a Pyroscope profile query and a table/top-functions visualization note.
- The overhead section gave a fixed 1-3% overhead claim and suggested enabling profiling per request with a head-based sampler. Replaced this with a workload-dependent overhead note and trace sampling / subset-of-instances guidance.

## Review Notes
Span profiles currently support CPU profiling only in Grafana's documented span-profile integrations. Spans shorter than the sampling interval may not have captured profile samples, so very short spans can still have no linked profile even when the bridge is configured correctly.
