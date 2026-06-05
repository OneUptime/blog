# Validation Summary: Use OpAMP to Securely Upgrade and Downgrade Collector Versions Across Your Fleet

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- OpenTelemetry
- Open Agent Management Protocol (OpAMP)
- OpenTelemetry Collector OpAMP Supervisor
- Go
- YAML
- RSA signatures and SHA-256 content hashes

## Sources Consulted
- OpenTelemetry OpAMP specification: https://opentelemetry.io/docs/specs/opamp/
- OpenTelemetry Collector management documentation: https://opentelemetry.io/docs/collector/management/
- OpenTelemetry Collector OpAMP Supervisor config package: https://pkg.go.dev/github.com/open-telemetry/opentelemetry-collector-contrib/cmd/opampsupervisor/supervisor/config
- opamp-go protobufs package documentation: https://pkg.go.dev/github.com/open-telemetry/opamp-go/protobufs

## Issues Found
- The package offer example set `DownloadableFile.ContentHash` and `PackagesAvailable.AllPackagesHash`, but omitted `PackageAvailable.Hash`. Added the per-package `Hash` field and separated file hash, package hash, and aggregate package hash concepts because the OpAMP spec defines all three for package change detection.
- The supervisor YAML placed `storage_dir` under `agent`, which does not match the current OpAMP Supervisor config schema. Changed it to top-level `storage.directory`.
- The supervisor YAML enabled `accepts_packages` but not `reports_package_statuses`. Added `reports_package_statuses: true` so the later `PackageStatuses` monitoring example matches the configured capabilities.
- The package update flow described the supervisor as always stopping the old collector and swapping the binary. Changed this to agent-specific install or activation logic because OpAMP defines package delivery and status reporting, while package installation behavior is implementation-specific.
- The security example described signing a package hash. Changed it to signing the SHA-256 file content hash and referencing `DownloadableFile.Signature`, which matches the OpAMP protobuf field and code-signing guidance.
- The post described the whole process as authenticated and rollback as instant. Tightened the wording to authenticated OpAMP and download endpoints, cryptographic verification for downloaded binaries, and quick rollback initiation.

## Review Notes
The Go snippets are illustrative and still rely on local helper functions and types such as `computePackageHash`, `computeAllPackagesHash`, `readHashFile`, `AgentStore`, and `types.Connection`. The post does not provide complete import lists or a buildable standalone program, which is acceptable for this style of guide, but production code should ensure SHA-256 hashes are decoded to bytes before assigning them to OpAMP protobuf hash fields.
