# Validation Summary: How to Build a Custom OpenTelemetry Collector Distribution with OCB

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- OpenTelemetry Collector
- OpenTelemetry Collector Builder (OCB)
- OpenTelemetry Collector configuration
- Go modules
- Docker
- GitHub Actions
- YAML

## Sources Consulted
- OpenTelemetry docs: Build a custom Collector with OpenTelemetry Collector Builder: https://opentelemetry.io/docs/collector/extend/ocb/
- OpenTelemetry docs: Collector configuration: https://opentelemetry.io/docs/collector/configuration/
- OpenTelemetry docs: Collector exporters list: https://opentelemetry.io/docs/collector/components/exporter/
- OpenTelemetry Collector Builder README: https://github.com/open-telemetry/opentelemetry-collector/blob/main/cmd/builder/README.md
- OpenTelemetry Collector Releases core manifest: https://github.com/open-telemetry/opentelemetry-collector-releases/blob/main/distributions/otelcol/manifest.yaml
- OpenTelemetry Collector Releases contrib manifest: https://github.com/open-telemetry/opentelemetry-collector-releases/blob/main/distributions/otelcol-contrib/manifest.yaml
- OpenTelemetry Collector `go.mod`: https://github.com/open-telemetry/opentelemetry-collector/blob/main/go.mod
- OpenTelemetry Collector Contrib `go.mod`: https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/main/go.mod
- OpenTelemetry Collector issue: logging exporter replaced by debug exporter: https://github.com/open-telemetry/opentelemetry-collector/issues/11337
- OpenTelemetry blog: Migrating away from the Jaeger exporter in the Collector: https://opentelemetry.io/blog/2023/jaeger-exporter-collector-migration/
- OpenTelemetry Collector Contrib filter processor README: https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/main/processor/filterprocessor/README.md
- OpenTelemetry Collector Contrib span metrics connector README: https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/main/connector/spanmetricsconnector/README.md

## Issues Found
- The post used OpenTelemetry Collector v0.95.0 throughout. Updated examples to v0.153.0, the current release available in the official release manifests checked during review.
- The post listed Go 1.21 and `golang:1.21`, but current Collector and contrib `go.mod` files require Go 1.25. Updated prerequisites, CI, and Docker examples.
- The prebuilt OCB download URLs pointed at the `opentelemetry-collector` repository. Updated them to the official `opentelemetry-collector-releases` repository.
- The builder manifest used `dist.go: 1.21.0`, but `dist.go` is the Go executable path/name, not a Go version. Updated it to `go`.
- The manifest and runtime config used the removed `logging` exporter and `loglevel`. Replaced them with `debugexporter`, `debug`, and `verbosity`.
- The manifest included `jaegerexporter` at v0.95.0, but the Jaeger exporter was removed from current Collector releases. Replaced that example with `zipkinexporter`; Jaeger ingestion remains covered by `jaegerreceiver`.
- The manifest used old core module paths for `healthcheckextension` and `pprofextension`. Updated them to the current contrib module paths.
- The builder manifest omitted confmap providers. Added env, file, HTTP, HTTPS, and YAML providers so generated collectors can load the example file configuration and support inline `--set` usage.
- The filter processor example used the older include/exclude `match_type` form. Updated it to current OTTL `metric_conditions` syntax.
- The span metrics connector runtime configuration used deprecated `spanmetrics`. Updated it to `span_metrics` in connectors and pipelines.
- The `--set` example used dot-separated nesting. Updated it to the current `::` nested key syntax.
- The "version range" comment showed an exact version. Updated the wording to describe matching pinned contrib component versions.

## Review Notes
- Verified the corrected main builder manifest with the official `otel/opentelemetry-collector-builder:latest` image, which reported OCB v0.153.0 and successfully generated sources with `--skip-compilation`.
- Verified the corrected runtime Collector configuration with `otel/opentelemetry-collector-contrib:0.153.0 validate --config=/etc/otelcol-contrib/config.yaml`.
- Full binary compilation was intentionally skipped because source generation and module resolution were sufficient to validate the OCB manifest schema while avoiding a long local compile.
