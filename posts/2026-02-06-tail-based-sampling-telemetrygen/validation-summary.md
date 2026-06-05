# Validation Summary: How to Test Tail-Based Sampling Rules Before Deploying to Production

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- OpenTelemetry Collector
- OpenTelemetry Collector contrib distribution
- Tail Sampling Processor
- telemetrygen
- OTLP gRPC
- Debug exporter
- File exporter
- Bash
- Python JSON parsing

## Sources Consulted
- OpenTelemetry Collector contrib telemetrygen README: https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/main/cmd/telemetrygen/README.md
- telemetrygen trace command source and flags: https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/main/cmd/telemetrygen/pkg/traces/config.go
- telemetrygen common flag parsing and OTLP attribute format: https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/main/cmd/telemetrygen/internal/config/config.go
- telemetrygen trace generation behavior: https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/main/cmd/telemetrygen/pkg/traces/traces.go
- OpenTelemetry Collector tail sampling processor README: https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/main/processor/tailsamplingprocessor/README.md
- OpenTelemetry Collector file exporter README: https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/main/exporter/fileexporter/README.md
- OpenTelemetry Collector debug exporter README: https://github.com/open-telemetry/opentelemetry-collector/blob/main/exporter/debugexporter/README.md
- GitHub package for telemetrygen container image: https://github.com/orgs/open-telemetry/packages/container/package/opentelemetry-collector-contrib%2Ftelemetrygen
- GitHub release API for OpenTelemetry Collector contrib v0.96.0: https://api.github.com/repos/open-telemetry/opentelemetry-collector-contrib/releases/tags/v0.96.0

## Issues Found
- The pre-built binary URL for `telemetrygen_linux_amd64` at v0.96.0 returned 404, and the release API did not list telemetrygen binary assets. Replaced that download command with the official telemetrygen container image option.
- The Collector setup text claimed two exporters were configured before and after sampling, but the YAML only exported after the `tail_sampling` processor. Updated the wording to match the actual pipeline.
- The sample config set `num_traces: 1000` while the manual test sends 1200 traces. Increased it to `2000` so the tail sampling processor can retain the whole test workload during `decision_wait`.
- The config included an unused `logging` exporter with deprecated `loglevel` syntax. Removed it because the current debug exporter is the supported local debugging exporter.
- telemetrygen uses `--span-duration` for generated span duration; `--duration` controls how long the generator runs and overrides `--traces`. Replaced `--duration` with `--span-duration` in trace examples.
- Current telemetrygen string attributes must be quoted, for example `key="value"`. Updated all `--otlp-attributes` examples to quote string values.
- The validation code counted resource batches or used grep patterns that do not match OTLP JSON file exporter output. Replaced it with Python code that counts unique sampled `traceId` values per resource scenario.

## Review Notes
- I could not run `telemetrygen --help` locally because Go is not installed in this environment and no telemetrygen binary is present. I verified the flags against the upstream source instead.
- The file exporter is alpha for traces and its README warns that exact field names are not guaranteed to remain stable. The parsing examples are accurate for current OTLP JSON file exporter output.
