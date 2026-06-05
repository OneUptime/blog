# Validation Summary: How to Profile and Optimize OpenTelemetry Collector CPU Usage

## Status
validated

## Post Type
Technical guide / tutorial

## Technologies Covered
- OpenTelemetry Collector
- OpenTelemetry Collector pprof extension
- OpenTelemetry Collector zPages extension
- Go pprof tooling
- OpenTelemetry Collector filter, transform, batch, OTLP, and OTLP/HTTP components
- OTTL (OpenTelemetry Transformation Language)
- Kubernetes Deployments
- Grafana Alloy / Pyroscope pprof scraping

## Sources Consulted
- OpenTelemetry Collector troubleshooting documentation: https://opentelemetry.io/docs/collector/troubleshooting/
- OpenTelemetry Collector pprof extension README: https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/main/extension/pprofextension/README.md
- OpenTelemetry Collector zPages extension README: https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/main/extension/zpagesextension/README.md
- OpenTelemetry Collector batch processor README: https://github.com/open-telemetry/opentelemetry-collector/blob/main/processor/batchprocessor/README.md
- OpenTelemetry Collector filter processor README: https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/main/processor/filterprocessor/README.md
- OpenTelemetry Collector transform processor README: https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/main/processor/transformprocessor/README.md
- OTTL language documentation: https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/main/pkg/ottl/LANGUAGE.md
- OTTL span context documentation: https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/main/pkg/ottl/contexts/ottlspan/README.md
- OTTL functions documentation: https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/main/pkg/ottl/ottlfuncs/README.md
- Go net/http/pprof documentation: https://pkg.go.dev/net/http/pprof
- Go runtime/pprof documentation: https://pkg.go.dev/runtime/pprof
- Kubernetes Deployment documentation: https://kubernetes.io/docs/concepts/workloads/controllers/deployment/
- Grafana Alloy pyroscope.scrape documentation: https://grafana.com/docs/alloy/latest/reference/components/pyroscope/pyroscope.scrape/

## Issues Found
- The initial pprof Collector configuration referenced `otlp`, `batch`, and `otlp/backend` in the service pipeline without defining those components. Added minimal receiver, processor, and exporter definitions so the configuration is complete.
- The filter processor examples used the older `traces.span` configuration shape and a non-current `matches` expression. Updated them to current `trace_conditions` syntax with `IsMatch(...)` for regex and `span.attributes[...]` paths for exact comparisons.
- The transform processor examples used unprefixed `attributes[...]` paths in a way that does not match the current documented OTTL span context examples. Updated statements to use `span.attributes[...]` and added `error_mode: ignore`.
- The batch processor comment described `send_batch_size` as a maximum batch size. Updated it to describe the setting as the threshold that triggers sending a batch; `send_batch_max_size` is the upper-limit setting.
- The OTLP exporter section described OTLP/HTTP as HTTP/JSON. Updated it to state that the Collector's built-in OTLP/gRPC and OTLP/HTTP exporters use protobuf, while compression is the relevant CPU tradeoff in the shown examples.
- The scaling section described `max_recv_msg_size_mib` as a receiver worker setting. Updated the text to identify it as a maximum receive message size setting and framed horizontal scaling as replicas behind a Service or load balancer.
- The Kubernetes Deployment example omitted the required selector/template label relationship for `apps/v1`. Added labels and `spec.selector.matchLabels`.
- The continuous profiling example implied Pyroscope Go SDK environment variables would profile the prebuilt Collector. Replaced it with a Grafana Alloy `pyroscope.scrape` example that scrapes the Collector's pprof endpoint.
- Removed overly specific CPU-per-throughput and percentage claims that were not generally valid across Collector configurations and workloads.

## Review Notes
The pprof extension endpoint, zPages endpoint, `curl` profile capture commands, `go tool pprof` usage, heap profile flags, batch processor defaults, and pprof endpoint behavior are consistent with the consulted documentation. Performance recommendations remain workload-dependent and should be verified with profiles from the specific deployment.
