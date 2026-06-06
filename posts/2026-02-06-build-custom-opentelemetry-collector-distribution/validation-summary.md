# Validation Summary: How to Build Your Own Custom OpenTelemetry Collector Distribution

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- OpenTelemetry Collector
- OpenTelemetry Collector Builder (OCB)
- Go
- YAML collector configuration
- Docker
- GitHub Actions

## Sources Consulted
- OpenTelemetry custom collector documentation: https://opentelemetry.io/docs/collector/custom-collector/
- OpenTelemetry Collector Builder README: https://github.com/open-telemetry/opentelemetry-collector/blob/main/cmd/builder/README.md
- OpenTelemetry Collector Builder v0.153.0 release assets: https://github.com/open-telemetry/opentelemetry-collector-releases/releases/tag/cmd/builder/v0.153.0
- OpenTelemetry Collector v0.153.0 go.mod: https://github.com/open-telemetry/opentelemetry-collector/blob/v0.153.0/go.mod
- OpenTelemetry Collector Contrib v0.153.0 go.mod: https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/v0.153.0/go.mod
- Memory Limiter Processor README: https://github.com/open-telemetry/opentelemetry-collector/blob/main/processor/memorylimiterprocessor/README.md
- Host Metrics Receiver README: https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/main/receiver/hostmetricsreceiver/README.md
- Debug Exporter README: https://github.com/open-telemetry/opentelemetry-collector/blob/main/exporter/debugexporter/README.md
- Official Go version endpoint: https://go.dev/VERSION?m=text

## Issues Found
- The guide used OpenTelemetry Collector component version `v0.96.0`, which is outdated for a 2026 tutorial. Updated the manifest to use the current official Collector release line, `v0.153.0`.
- The prerequisite and build examples used Go 1.22. Collector v0.153.0 declares `go 1.25.0`, so the guide now requires Go 1.25 or later.
- The OCB install commands used `@latest`, which can produce mismatches with pinned component versions. Updated the local, Docker, and CI examples to install `go.opentelemetry.io/collector/cmd/builder@v0.153.0`.
- The memory limiter comments incorrectly described `spike_limit_percentage` as a resume threshold. Updated the example to use `spike_limit_percentage: 15` and describe it as the allowed spike above the soft limit.
- The attributes processor comment said it added the environment tag to all telemetry, but the runtime config only includes it in the traces pipeline. Updated the comment to say trace data.
- The pipeline diagram showed output to the debug exporter, but the runtime pipelines export only to `otlp`. Removed the debug exporter node and edge from the diagram.
- The Dockerfile used outdated base images for the updated Collector release. Updated the builder image to `golang:1.25-alpine` and the runtime image to `alpine:3.22`.

## Review Notes
The builder manifest was parsed successfully with the official `ocb v0.153.0` binary using `--skip-compilation --skip-get-modules`. Full compilation was not run because the local environment does not have Go installed.
