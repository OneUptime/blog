# Validation Summary: How to Use the OpenTelemetry Collector Builder (ocb) Tool

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- OpenTelemetry Collector Builder (OCB)
- OpenTelemetry Collector custom distributions
- Go modules and Go build tooling
- YAML builder manifests
- Docker
- Make

## Sources Consulted
- OpenTelemetry Collector Builder README: https://github.com/open-telemetry/opentelemetry-collector/blob/main/cmd/builder/README.md
- OpenTelemetry documentation, "Build a custom Collector with OpenTelemetry Collector Builder": https://opentelemetry.io/docs/collector/extend/ocb/
- OpenTelemetry Collector v0.96.0 builder README: https://github.com/open-telemetry/opentelemetry-collector/blob/v0.96.0/cmd/builder/README.md
- OpenTelemetry Collector v0.96.0 builder config source: https://github.com/open-telemetry/opentelemetry-collector/blob/v0.96.0/cmd/builder/internal/builder/config.go
- OpenTelemetry Collector v0.96.0 generated templates: https://github.com/open-telemetry/opentelemetry-collector/tree/v0.96.0/cmd/builder/internal/builder/templates
- OpenTelemetry Collector v0.96.0 builder release metadata and assets: https://github.com/open-telemetry/opentelemetry-collector/releases/tag/cmd/builder/v0.96.0
- Local v0.96.0 `ocb --help` output from the official Linux AMD64 release binary.

## Issues Found
- The Go install command used `@latest` while the manifest and release examples were pinned to v0.96.0. Updated the command to install `go.opentelemetry.io/collector/cmd/builder@v0.96.0` so the tool version matches the rest of the guide.
- The pre-built binary download URL pointed to `open-telemetry/opentelemetry-collector-releases`, but the v0.96.0 OCB release asset is under `open-telemetry/opentelemetry-collector/releases/tag/cmd/builder/v0.96.0`. Updated the URL and installed the binary as `/usr/local/bin/ocb`.
- The Docker example installed the latest builder even though the post's manifest is pinned to v0.96.0. Updated the command to install `go.opentelemetry.io/collector/cmd/builder@v0.96.0` inside the Go container.
- The manifest commented `go_os` and `go_arch` fields are not valid OCB `dist` fields in v0.96.0 or current docs. Replaced them with the supported `dist.go` example.
- The CLI section showed `--skip-generate` alone for compile-only builds. Official builder docs require skipping both generation and module retrieval for that workflow, so the example now uses `--skip-generate --skip-get-modules`.
- The CLI section showed `--go`, but v0.96.0 `ocb --help` does not expose that command-line flag. Updated the guidance to configure the Go binary through `dist.go` in the manifest.
- The generated `main.go` and `components.go` examples were incomplete relative to the OCB v0.96.0 templates and the manifest shown in the post. Updated the samples to include the `runInteractive` helper note, extension registration, connector registration, and representative imports/factories.
- The version mismatch wording said all components must use exactly the same version. Official strict versioning checks focus on matching major/minor versions after Go module resolution, so the wording was corrected.

## Review Notes
The examples remain pinned to OCB and Collector v0.96.0, which is older than the current OpenTelemetry Collector Builder release. The post is technically usable as a version-specific guide, but a future refresh should consider updating the examples to the latest supported OCB version and current module categories such as providers and converters.
