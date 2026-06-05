# Validation Summary: How to Correlate OpenTelemetry Profiles with Traces to Pinpoint Exactly Which

## Status
validated

## Post Type
Tutorial / technical guide

## Technologies Covered
- OpenTelemetry tracing and profiles
- Grafana Pyroscope
- Grafana Tempo trace-to-profiles correlation
- OpenTelemetry Collector profiles pipelines
- Java OpenTelemetry agent and Pyroscope OTel Java extension
- Python Pyroscope SDK and `pyroscope-otel`
- Go Pyroscope SDK and `otel-profiling-go`

## Sources Consulted
- Grafana Pyroscope Span Profiles overview: https://grafana.com/docs/pyroscope/latest/configure-client/trace-span-profiles/
- Grafana Pyroscope Java span profiles: https://grafana.com/docs/pyroscope/latest/configure-client/trace-span-profiles/java-span-profiles/
- Grafana Pyroscope Python span profiles: https://grafana.com/docs/pyroscope/latest/configure-client/trace-span-profiles/python-span-profiles/
- Grafana Pyroscope Go span profiles: https://grafana.com/docs/pyroscope/latest/configure-client/trace-span-profiles/go-span-profiles/
- Grafana Tempo trace-to-profiles configuration: https://grafana.com/docs/grafana/latest/datasources/tempo/configure-tempo-data-source/configure-trace-to-profiles/
- Grafana Tempo datasource provisioning: https://grafana.com/docs/grafana/latest/datasources/tempo/configure-tempo-data-source/provision/
- Grafana Pyroscope OpenTelemetry eBPF profiler and profiles pipeline notes: https://grafana.com/docs/pyroscope/latest/configure-client/opentelemetry/ebpf-profiler/
- OpenTelemetry Java agent extension documentation: https://opentelemetry.io/docs/zero-code/java/agent/extensions/
- OpenTelemetry Java agent configuration documentation: https://opentelemetry.io/docs/zero-code/java/agent/configuration/
- Go `runtime/pprof` package documentation: https://pkg.go.dev/runtime/pprof

## Issues Found
- The Java example used the standalone Pyroscope Java agent as a second `-javaagent` and claimed it automatically detected the OpenTelemetry Java agent. Updated it to use the documented `otel-profiling-java` extension loaded through `otel.javaagent.extensions`.
- The Java section claimed every sample receives `trace_id` and `span_id` labels. Reworded this to describe the documented span profile bridge behavior and added the CPU versus wall profile event caveat.
- The Python section referred to `py-spy` and `opentelemetry-exporter-profiling`, but Grafana's documented integration uses `pyroscope-io` plus `pyroscope-otel`. Corrected the heading, package name, install command, and comments.
- The Go example used `pprof.Do` with an empty callback and returned the original context, so it would not label any real work. Replaced it with the documented `otel-profiling-go` tracer provider wrapper and Pyroscope Go SDK setup.
- The Collector configuration used a separate `otlp/profiling` receiver with gRPC on port 4318 and HTTP-style endpoint strings for gRPC exporters. Updated it to use one OTLP receiver with gRPC 4317 and HTTP 4318, a profiles pipeline, `pyroscope:4040` as the OTLP gRPC profile export target, and noted `service.profilesSupport`.
- The Grafana provisioning snippet referenced `datasourceUid: "pyroscope"` without assigning that UID to the Pyroscope data source. Added `uid: pyroscope`.
- The Grafana query did not escape `$` for datasource provisioning. Updated it to use `$${...}` as shown in Grafana provisioning examples.
- The Grafana section said the button appears on every span. Corrected it to say the button appears on spans with the `pyroscope.profile.id` attribute.

## Review Notes
OpenTelemetry profiles and related Collector support are still evolving, and the Collector profiles pipeline may require explicit feature gates depending on the distribution and version. Span profile support also varies by language and profile type; the post now includes the key Java and Go/Python caveats without expanding beyond the original tutorial scope.
