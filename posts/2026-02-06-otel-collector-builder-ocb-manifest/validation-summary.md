# Validation Summary: How to Use the OpenTelemetry Collector Builder Manifest to Include Your Custom

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- OpenTelemetry Collector
- OpenTelemetry Collector Builder (OCB)
- Go modules
- YAML builder manifests
- Docker
- GitHub Actions

## Sources Consulted
- OpenTelemetry documentation: Build a custom Collector with OpenTelemetry Collector Builder: https://opentelemetry.io/docs/collector/extend/ocb/
- OpenTelemetry documentation: Collector configuration and validate command: https://opentelemetry.io/docs/collector/configuration/
- OpenTelemetry Collector v0.96.0 builder README: https://github.com/open-telemetry/opentelemetry-collector/blob/v0.96.0/cmd/builder/README.md
- OpenTelemetry Collector v0.96.0 builder config source: https://github.com/open-telemetry/opentelemetry-collector/blob/v0.96.0/cmd/builder/internal/builder/config.go
- OpenTelemetry Collector v0.96.0 builder command source: https://github.com/open-telemetry/opentelemetry-collector/blob/v0.96.0/cmd/builder/internal/command.go
- OpenTelemetry Collector v0.96.0 generated main template: https://github.com/open-telemetry/opentelemetry-collector/blob/v0.96.0/cmd/builder/internal/builder/templates/main.go.tmpl
- OpenTelemetry Collector v0.96.0 collector command source: https://github.com/open-telemetry/opentelemetry-collector/blob/v0.96.0/otelcol/command.go
- OpenTelemetry Collector Contrib v0.96.0 component module files for routingconnector and filelogreceiver: https://github.com/open-telemetry/opentelemetry-collector-contrib/tree/v0.96.0

## Issues Found
- The manifest snippets used `dist.otel_col_version`, but OCB v0.96.0 maps the collector base version field as `otelcol_version`. Updated all occurrences to `otelcol_version`.
- The comment for `dist.description` said it was shown in `--version` output. In the generated collector, `description` is part of `component.BuildInfo`; the CLI `--version` uses `dist.version`. Updated the comment.
- The sample `--version` output showed `0.96.0`, but with no `dist.version` set the generated binary defaults to version `1.0.0`. Updated the sample output to `my-otel-collector version 1.0.0`.

## Review Notes
The examples are version-specific to OpenTelemetry Collector v0.96.0. Current OCB documentation has evolved and recommends official release binaries or Docker images over `go install`, but `go install go.opentelemetry.io/collector/cmd/builder@...` remains documented and valid when a Go toolchain is available.
