# Validation Summary: How to Add Third-Party Components to Your Custom Collector Build

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- OpenTelemetry Collector
- OpenTelemetry Collector Builder (OCB)
- OpenTelemetry Collector custom components
- Go modules
- Go
- YAML

## Sources Consulted
- OpenTelemetry Collector Builder documentation: https://github.com/open-telemetry/opentelemetry-collector/blob/main/cmd/builder/README.md
- OpenTelemetry custom Collector documentation: https://opentelemetry.io/docs/collector/extend/ocb/
- OpenTelemetry custom component documentation: https://opentelemetry.io/docs/collector/extend/custom-component/connector/
- OpenTelemetry Collector configuration documentation: https://opentelemetry.io/docs/collector/configuration/
- Go package documentation for go.opentelemetry.io/collector/component: https://pkg.go.dev/go.opentelemetry.io/collector/component
- Go package documentation for go.opentelemetry.io/collector/processor: https://pkg.go.dev/go.opentelemetry.io/collector/processor
- Go modules reference: https://go.dev/ref/mod/

## Issues Found
- The custom processor `processor.go` snippet used `component.Host` in `Start` methods but did not import `go.opentelemetry.io/collector/component`. Added the missing import so the snippet can compile.
- The same snippet imported `go.opentelemetry.io/collector/pdata/pcommon` without using it. Removed the unused import because Go rejects unused imports.
- The validation script prepended `v` to the supplied component version without handling the common Go module version form `v1.2.0`. Normalized the input with `${COMPONENT_VERSION#v}` so both `1.2.0` and `v1.2.0` work.
- The publishing example tagged `custom-processor/v1.0.0` even though the module path shown is `github.com/myorg/custom-processor`, which represents a repository-root module. Changed the tag and push commands to `v1.0.0`, matching Go module version tag rules for root modules.

## Review Notes
- The post uses OpenTelemetry Collector version `0.96.0`, which is older than current Collector releases as of this review. The examples are still version-consistent, but readers starting new projects should check the latest Collector and OCB release notes before copying versions.
- The official OCB binary is commonly named `ocb`, while `go install go.opentelemetry.io/collector/cmd/builder` installs a binary named `builder`. The post's `builder --config manifest.yaml` command is valid for the `go install` installation path.
