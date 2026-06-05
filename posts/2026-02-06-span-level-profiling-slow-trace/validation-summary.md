# Validation Summary: How to Set Up Span-Level Profiling to See Exactly Which Code Executed During a

## Status
validated

## Post Type
Tutorial / implementation guide

## Technologies Covered
- OpenTelemetry tracing and span context
- Grafana Pyroscope span profiles
- Grafana Tempo traces-to-profiles correlation
- Java OpenTelemetry Java agent and otel-profiling-java
- Python OpenTelemetry SDK, pyroscope-io, and pyroscope-otel
- Go OpenTelemetry SDK, pyroscope-go, and otel-profiling-go
- OpenTelemetry Collector profile pipelines and OTLP exporters

## Sources Consulted
- Grafana Pyroscope Java span profiles documentation: https://grafana.com/docs/pyroscope/latest/configure-client/trace-span-profiles/java-span-profiles/
- Grafana Pyroscope Python span profiles documentation: https://grafana.com/docs/pyroscope/latest/configure-client/trace-span-profiles/python-span-profiles/
- Grafana Pyroscope Go span profiles documentation: https://grafana.com/docs/pyroscope/latest/configure-client/trace-span-profiles/go-span-profiles/
- Grafana Pyroscope Python SDK documentation: https://grafana.com/docs/pyroscope/latest/configure-client/language-sdks/python/
- Grafana Cloud traces-to-profiles correlation documentation: https://grafana.com/docs/grafana-cloud/telemetry-signals/use-signals-together/setup-correlations/
- Grafana Pyroscope OpenTelemetry eBPF profiler documentation: https://grafana.com/docs/pyroscope/latest/configure-client/opentelemetry/ebpf-profiler/
- Go package documentation for github.com/grafana/otel-profiling-go: https://pkg.go.dev/github.com/grafana/otel-profiling-go
- Red Hat build of OpenTelemetry Collector profile pipeline documentation: https://docs.redhat.com/en/documentation/red_hat_build_of_opentelemetry/3.9/html/configuring_the_collector/

## Issues Found
- The Java section used a non-current manual `io.pyroscope:otel:0.13.0` span processor setup and a class name that does not match Grafana's current Java span profiles documentation. I changed it to use the OpenTelemetry Java agent with the `otel-profiling-java` extension and standard OpenTelemetry application spans.
- The Java explanation implied a generic application-registered `SpanProcessor`; current guidance is to use the Pyroscope OTel Java agent extension. I updated the explanation and noted CPU and wall profile support for Java.
- The Python section referred to `py-spy` or eBPF and an `enable_otel_span_profiles=True` setting. Grafana's current Python span profiles setup uses the Pyroscope Python SDK plus the `pyroscope-otel` package and `PyroscopeSpanProcessor`. I updated the installation line, imports, configuration, and tracer setup.
- The Python snippet imported `BatchSpanExporter`, which is not a valid processor for this setup and was unused. I removed it.
- The collector snippet used an `otlphttp/pyroscope` exporter without noting profile-signal support requirements. I updated it to a current OTLP exporter example for Pyroscope and added the `service.profilesSupport` caveat for collector distributions that still gate profile pipelines.

## Review Notes
- The article's high-level description of span profiles is accurate: profiling samples can be linked to trace/span identifiers and viewed from Grafana/Tempo when the application, profiler, and data sources are configured correctly.
- Span-profile links are sample-based, so short spans may not have samples. The post could mention this limitation more prominently in the future.
