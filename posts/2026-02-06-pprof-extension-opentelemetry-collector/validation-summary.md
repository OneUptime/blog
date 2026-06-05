# Validation Summary: How to Configure the pprof Extension in the OpenTelemetry Collector

## Status
validated

## Post Type
Technical tutorial / configuration guide

## Technologies Covered
- OpenTelemetry Collector
- OpenTelemetry Collector pprof extension
- Go `net/http/pprof` and runtime profiling
- Collector internal telemetry
- Kubernetes Deployments, Services, and NetworkPolicies
- `go tool pprof`
- Grafana Pyroscope `profilecli`

## Sources Consulted
- OpenTelemetry Collector pprof extension README and config docs: https://github.com/open-telemetry/opentelemetry-collector-contrib/tree/main/extension/pprofextension
- OpenTelemetry Collector pprofextension package documentation: https://pkg.go.dev/github.com/open-telemetry/opentelemetry-collector-contrib/extension/pprofextension
- OpenTelemetry Collector configuration docs: https://opentelemetry.io/docs/collector/configuration/
- OpenTelemetry Collector internal telemetry docs: https://opentelemetry.io/docs/collector/internal-telemetry/
- OpenTelemetry Collector extensions registry: https://opentelemetry.io/docs/collector/components/extension/
- OpenTelemetry Collector exporters registry: https://opentelemetry.io/docs/collector/components/exporter/
- Go `net/http/pprof` documentation: https://pkg.go.dev/net/http/pprof
- Go `runtime.SetBlockProfileRate` and `runtime.SetMutexProfileFraction` documentation: https://pkg.go.dev/runtime
- Grafana Pyroscope Profile CLI documentation: https://grafana.com/docs/pyroscope/latest/view-and-analyze-profile-data/profile-cli/
- Grafana announcement that Phlare and Pyroscope merged under Grafana Pyroscope: https://grafana.com/press/2023/03/15/grafana-labs-acquires-pyroscope-the-company-behind-the-popular-open-source-continuous-profiling-project/
- Local validation with `otel/opentelemetry-collector-contrib:latest`, version `0.153.0`, using `otelcol-contrib validate`

## Issues Found
- The basic Collector example used the deprecated `logging` exporter and `loglevel` setting. Current Collector validation rejects this exporter. I changed the example to use the `debug` exporter with `verbosity: basic`.
- The production and continuous profiling examples showed `save_to_file` as a nested configuration with `enabled`, `directory`, `interval`, `profiles`, and retention fields. The pprof extension schema defines `save_to_file` as a string file path for a CPU profile saved on Collector shutdown. I corrected the examples and clarified that it starts profiling when the Collector starts.
- The advanced example configured a nonexistent `prometheus` extension and enabled it in `service.extensions`. I removed it and used the supported internal telemetry Prometheus reader configuration instead.
- The advanced example used `service.telemetry.metrics.address`, which is ignored/invalid in current Collector versions. I replaced it with `service.telemetry.metrics.readers[].pull.exporter.prometheus.host` and `port`.
- The block profiling comments described `block_profile_fraction` as a simple event fraction. I corrected the wording to match Go's `runtime.SetBlockProfileRate`, where higher values sample approximately one event per N nanoseconds blocked.
- The Kubernetes manifest mounted the ConfigMap at `/etc/otelcol`, but the contrib image defaults to `/etc/otelcol-contrib/config.yaml`. I updated the mount path and added `subPath: config.yaml`.
- The Kubernetes Service example did not mention that a Service can only reach pprof if the Collector pprof endpoint is bound to a pod-reachable interface. I added a note that the Service pattern requires `0.0.0.0:1777`.
- The observability platform examples used outdated/direct ingest examples for Pyroscope/Phlare. I replaced them with a current Grafana Pyroscope `profilecli upload` example and removed the obsolete Phlare endpoint reference.

## Review Notes
The post is technically relevant and remains a valid tutorial after the corrections. The pprof extension is currently beta and included in core, contrib, and Kubernetes Collector distributions. The post intentionally uses illustrative pprof output; those examples were reviewed for plausibility rather than exact reproducibility.
