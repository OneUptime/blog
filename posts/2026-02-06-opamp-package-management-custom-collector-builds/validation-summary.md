# Validation Summary: How to Use OpAMP Package Management for Distributing Custom Collector Builds

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- OpenTelemetry Collector
- OpenTelemetry Collector Builder (ocb)
- OpAMP package management
- Go
- HTTP artifact serving
- SHA256 checksums

## Sources Consulted
- OpenTelemetry OpAMP specification: https://opentelemetry.io/docs/specs/opamp/
- opamp-go protobufs API documentation: https://pkg.go.dev/github.com/open-telemetry/opamp-go/protobufs
- OpenTelemetry custom Collector builder documentation: https://opentelemetry.io/docs/collector/custom-collector/
- OpenTelemetry Collector Builder Go package documentation: https://pkg.go.dev/go.opentelemetry.io/collector/cmd/builder

## Issues Found
- The builder example used old Collector component versions and installed `builder@latest`, which can conflict with Collector Builder strict versioning checks. Updated the example to use the documented v0.150.0 Collector Builder/component versions and added the standard configuration providers used by current OpenTelemetry custom Collector examples.
- The OpAMP `PackageAvailable` examples set `DownloadableFile.content_hash` but omitted the package-level `PackageAvailable.hash`. Added `Hash` values computed separately from the file content hash because OpAMP uses the package hash to decide whether a package differs from the installed package.
- The artifact server example used plain `http.ListenAndServe`, but package download URLs used `https://`. Updated the example URLs to `http://` so they match the server shown in the post.

## Review Notes
- The OpAMP package-management fields discussed in the post are still marked Beta in the official OpAMP specification, so future schema or behavior changes are possible.
- The helper functions such as `computePackageHash`, `computeAllPackagesHash`, and `readHash` remain illustrative and would need concrete implementations in a production OpAMP server.
