# Validation Summary: How to Use OpenTelemetry with Bazel Build System in C++ Projects

## Status
validated

## Post Type
Tutorial / technical guide

## Technologies Covered
- OpenTelemetry C++
- Bazel
- C++
- Bazel WORKSPACE and BUILD files
- Bazel `.bazelrc` configuration
- OTLP exporters
- Bazel query

## Sources Consulted
- OpenTelemetry C++ v1.14.2 repository WORKSPACE: https://github.com/open-telemetry/opentelemetry-cpp/blob/v1.14.2/WORKSPACE
- OpenTelemetry C++ v1.14.2 dependency macros: https://github.com/open-telemetry/opentelemetry-cpp/blob/v1.14.2/bazel/repository.bzl and https://github.com/open-telemetry/opentelemetry-cpp/blob/v1.14.2/bazel/extra_deps.bzl
- OpenTelemetry C++ v1.14.2 Bazel targets for API, SDK, memory exporter, and OTLP exporters: https://github.com/open-telemetry/opentelemetry-cpp/tree/v1.14.2
- OpenTelemetry C++ supported C++ versions: https://github.com/open-telemetry/opentelemetry-cpp/blob/v1.14.2/README.md
- Bazel `http_archive` repository rule documentation: https://bazel.build/rules/lib/repo/http
- Bazel command-line reference: https://bazel.build/reference/command-line-reference
- Bazel query language reference: https://bazel.build/query/language
- Bazel persistent workers documentation: https://bazel.build/docs/persistent-workers

## Issues Found
- The WORKSPACE snippet used placeholder SHA-256 values. Replaced them with the verified SHA-256 for the OpenTelemetry C++ v1.14.2 source archive so the examples are reproducible.
- The WORKSPACE snippet omitted the `grpc_deps()` and `grpc_extra_deps()` calls used by OpenTelemetry C++ v1.14.2 after loading OpenTelemetry dependencies. Added both calls to match the upstream setup and avoid missing gRPC transitive dependencies.
- The centralized `//bazel/deps.bzl` example called `http_archive` without loading it. Added the required Starlark `load("@bazel_tools//tools/build_defs/repo:http.bzl", "http_archive")`.
- The build optimization snippet used the outdated `--experimental_remote_cache_compression` flag. Replaced it with the current `--remote_cache_compression` flag.
- The persistent worker example implied `CppCompile` could be enabled as a worker strategy directly. Updated the snippet to use Bazel's documented worker-strategy form with a supported mnemonic and local fallback.

## Review Notes
The post remains WORKSPACE-focused. That is valid for the shown OpenTelemetry C++ v1.14.2 setup, though modern Bazel projects may also consider Bzlmod where supported.
