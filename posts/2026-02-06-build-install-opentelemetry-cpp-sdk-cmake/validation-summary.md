# Validation Summary: How to Build and Install OpenTelemetry C++ SDK with CMake

## Status
validated

## Post Type
Tutorial / Build and installation guide

## Technologies Covered
- OpenTelemetry C++
- C++
- CMake
- gRPC
- Protobuf
- Abseil
- CURL
- Zipkin and Prometheus exporters

## Sources Consulted
- OpenTelemetry C++ README: https://github.com/open-telemetry/opentelemetry-cpp/blob/main/README.md
- OpenTelemetry C++ INSTALL.md: https://github.com/open-telemetry/opentelemetry-cpp/blob/main/INSTALL.md
- OpenTelemetry C++ CMakeLists.txt: https://github.com/open-telemetry/opentelemetry-cpp/blob/main/CMakeLists.txt
- OpenTelemetry C++ dependency versions: https://github.com/open-telemetry/opentelemetry-cpp/blob/main/third_party_release
- OpenTelemetry C++ submodules: https://github.com/open-telemetry/opentelemetry-cpp/blob/main/.gitmodules
- OpenTelemetry C++ getting started documentation: https://opentelemetry.io/docs/languages/cpp/getting-started/
- CMake CMAKE_INSTALL_PREFIX documentation: https://cmake.org/cmake/help/latest/variable/CMAKE_INSTALL_PREFIX.html
- CMake command-line build documentation: https://cmake.org/cmake/help/latest/manual/cmake.1.html

## Issues Found
- The introduction said C++ applications require building the SDK from source. Updated this to "often involves" because OpenTelemetry documents third-party package manager options such as Conan, vcpkg, and Alpine packages, while noting these are not officially maintained binaries.
- The prerequisites did not state the OpenTelemetry C++ CMake minimum. Added CMake 3.16 or later based on the upstream `cmake_minimum_required`.
- The Windows recommendation used Visual Studio 2017. Updated to Visual Studio 2019 or later to match the current upstream CI-supported Windows toolchains.
- The submodule explanation incorrectly listed Abseil as a direct OpenTelemetry C++ submodule. Updated the list to match current `.gitmodules` and clarified that gRPC/Abseil may be fetched by CMake for exporter dependencies.
- The exporter example used `WITH_JAEGER`, which is not a current OpenTelemetry C++ CMake option. Replaced the Jaeger example with current `WITH_ZIPKIN` and `WITH_PROMETHEUS` options.
- The dependency configuration used `WITH_ABSEIL`, which current OpenTelemetry C++ release notes and CMake files no longer support. Replaced it with `CMAKE_PREFIX_PATH` guidance for installed dependency prefixes and default CMake fetching for missing dependencies.
- The sample application used `cmake_minimum_required(VERSION 3.14)`. Updated it to 3.16 to align with the OpenTelemetry C++ package's minimum CMake version.
- Build commands used `-j$(nproc)`, which is Linux-specific and not portable to the macOS and Windows environments discussed in the post. Replaced these with CMake's portable `--parallel` syntax.
- The troubleshooting section installed an old Protobuf 3.21.12 tarball using Autotools-style commands. Updated it to use the current upstream dependency version from `third_party_release` and CMake-based build commands.
- The advanced options included `WITH_ZPAGES`, which is not a current OpenTelemetry C++ CMake option. Removed that flag.

## Review Notes
The post is now technically aligned with the current OpenTelemetry C++ CMake build system. Future updates should re-check exporter option names and dependency versions against the specific OpenTelemetry C++ release being targeted, because the project updates CMake options and third-party dependency versions over time.
