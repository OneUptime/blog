# Validation Summary: How to Manage OpenTelemetry C++ Dependencies (Abseil, Protobuf, gRPC)

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- OpenTelemetry C++
- C++
- CMake
- Abseil
- Protocol Buffers
- gRPC
- vcpkg
- Conan
- Docker
- Ubuntu/Debian packages

## Sources Consulted
- OpenTelemetry C++ releases: https://github.com/open-telemetry/opentelemetry-cpp/releases
- OpenTelemetry C++ v1.14.2 CMake options: https://raw.githubusercontent.com/open-telemetry/opentelemetry-cpp/v1.14.2/CMakeLists.txt
- OpenTelemetry C++ v1.27.0 CMake options: https://raw.githubusercontent.com/open-telemetry/opentelemetry-cpp/v1.27.0/CMakeLists.txt
- OpenTelemetry C++ v1.27.0 package config template and exported targets: https://raw.githubusercontent.com/open-telemetry/opentelemetry-cpp/v1.27.0/cmake/templates/opentelemetry-cpp-config.cmake.in
- gRPC C++ quickstart and source build prerequisites: https://grpc.io/docs/languages/cpp/quickstart/
- Protocol Buffers C++ migration notes for CMake and Abseil provider behavior: https://protobuf.dev/support/migration/
- vcpkg opentelemetry-cpp package and feature list: https://vcpkg.io/en/package/opentelemetry-cpp.html
- vcpkg gRPC package dependencies: https://vcpkg.io/en/package/grpc.html
- ConanCenter opentelemetry-cpp recipe and options: https://conan.io/center/recipes/opentelemetry-cpp
- Abseil C++ repository and CMake build notes: https://github.com/abseil/abseil-cpp

## Issues Found
- The version matrix said OpenTelemetry C++ 1.14.x or later worked with the `WITH_ABSEIL` guidance. OpenTelemetry C++ releases 1.16.x and later no longer use `WITH_ABSEIL`, so the matrix and system-build notes now distinguish 1.14.x/1.15.x from 1.16.x and later.
- The post claimed `WITH_ABSEIL=OFF` made OpenTelemetry build Abseil from a bundled submodule. That is incorrect for current OpenTelemetry C++ guidance. The section now describes OpenTelemetry's default dependency resolution and notes that 1.16.x and later use internal Abseil for OpenTelemetry C++ itself.
- The vcpkg command installed `opentelemetry-cpp` without enabling OTLP exporter features. It now installs `opentelemetry-cpp[otlp-grpc,otlp-http]`, matching the guide's OTLP gRPC/HTTP focus.
- The custom-prefix Protobuf and gRPC examples omitted provider/test/install options needed to consistently use the previously installed dependencies. The commands now include `protobuf_ABSL_PROVIDER=package`, `gRPC_INSTALL=ON`, `gRPC_BUILD_TESTS=OFF`, and the relevant prefix path.
- The custom-prefix OpenTelemetry build did not enable OTLP exporters despite the guide focusing on OTLP gRPC/HTTP. The command now enables `WITH_OTLP_GRPC` and `WITH_OTLP_HTTP`.
- The Docker gRPC build did not clone submodules recursively and omitted required gRPC install/test/provider flags. The Dockerfile now uses `--recurse-submodules` and includes the relevant gRPC CMake options.
- The Docker image missed gRPC build prerequisites listed in the official quickstart. It now installs `autoconf`, `libtool`, and `pkg-config`.

## Review Notes
The examples still pin older, known-compatible dependency versions instead of tracking the newest June 2026 upstream releases. That is acceptable for a reproducible guide, but future updates should refresh the pinned OpenTelemetry C++, Abseil, Protobuf, and gRPC versions together and test the full build.
