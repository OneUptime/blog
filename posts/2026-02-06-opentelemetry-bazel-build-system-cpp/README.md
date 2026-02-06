# How to Use OpenTelemetry with Bazel Build System in C++ Projects

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTelemetry, C++, Bazel, Build System, Dependencies

Description: Learn how to integrate OpenTelemetry into C++ projects using Bazel build system, including dependency management, configuration, and best practices.

Bazel has become the go-to build system for large-scale C++ projects, offering hermetic builds, reproducibility, and excellent dependency management. Integrating OpenTelemetry into your Bazel-based C++ project requires understanding how to properly declare dependencies, configure build rules, and structure your workspace for optimal builds.

## Understanding Bazel's Approach to Dependencies

Bazel uses a repository-based approach where external dependencies are declared in a WORKSPACE file. Unlike traditional package managers, Bazel downloads and builds dependencies from source, ensuring complete control over the build process. This hermetic approach means your OpenTelemetry instrumentation will build consistently across different environments.

The OpenTelemetry C++ SDK provides official Bazel support, but you need to configure it correctly to avoid common pitfalls like missing transitive dependencies or version conflicts.

## Setting Up Your WORKSPACE File

The WORKSPACE file is where you declare OpenTelemetry as an external dependency. Bazel supports multiple ways to include external repositories, but using `http_archive` provides the most control.

```python
# WORKSPACE file - declare OpenTelemetry as an external dependency
load("@bazel_tools//tools/build_defs/repo:http.bzl", "http_archive")

# OpenTelemetry C++ SDK
http_archive(
    name = "io_opentelemetry_cpp",
    sha256 = "your_sha256_hash_here",
    strip_prefix = "opentelemetry-cpp-1.14.2",
    urls = ["https://github.com/open-telemetry/opentelemetry-cpp/archive/refs/tags/v1.14.2.tar.gz"],
)

# Load OpenTelemetry dependencies
load("@io_opentelemetry_cpp//bazel:repository.bzl", "opentelemetry_cpp_deps")
opentelemetry_cpp_deps()

# Load additional transitive dependencies
load("@io_opentelemetry_cpp//bazel:extra_deps.bzl", "opentelemetry_extra_deps")
opentelemetry_extra_deps()
```

The `strip_prefix` removes the top-level directory from the archive, making paths consistent. Always verify the SHA256 hash to ensure build reproducibility and security.

## Declaring Build Dependencies in BUILD Files

Once the workspace is configured, you need to declare OpenTelemetry dependencies in your BUILD files. Bazel uses fine-grained dependencies, so you only link what you actually use.

```python
# BUILD file - create a library with OpenTelemetry tracing
cc_library(
    name = "instrumented_service",
    srcs = ["instrumented_service.cc"],
    hdrs = ["instrumented_service.h"],
    deps = [
        "@io_opentelemetry_cpp//api",
        "@io_opentelemetry_cpp//sdk/src/trace",
        "@io_opentelemetry_cpp//exporters/otlp:otlp_http_exporter",
        "@io_opentelemetry_cpp//exporters/otlp:otlp_grpc_exporter",
    ],
    visibility = ["//visibility:public"],
)

# Binary that uses the instrumented service
cc_binary(
    name = "service_main",
    srcs = ["main.cc"],
    deps = [
        ":instrumented_service",
        "@io_opentelemetry_cpp//sdk/src/resource",
    ],
)
```

Notice how we separate API dependencies from SDK and exporter dependencies. This separation follows OpenTelemetry's design philosophy where library code should only depend on the API, while application code wires up the SDK.

## Configuring Compiler Flags and Features

OpenTelemetry C++ uses modern C++ features, so you need to ensure your Bazel configuration enables the right language standard and compiler flags.

```python
# .bazelrc - configure C++ standard and optimization flags
build --cxxopt=-std=c++17
build --copt=-O2
build --copt=-DNDEBUG

# Enable position-independent code for shared libraries
build --copt=-fPIC

# Warnings that help catch issues
build --copt=-Wall
build --copt=-Wextra
build --copt=-Werror

# Platform-specific configurations
build:linux --cxxopt=-pthread
build:macos --cxxopt=-stdlib=libc++
```

The `.bazelrc` file allows you to set default build options that apply across your entire project. Using `--cxxopt` for C++-specific flags and `--copt` for general compiler options keeps your configuration clean.

## Managing OpenTelemetry Components

OpenTelemetry provides multiple components (tracing, metrics, logs), and Bazel's granular dependency system lets you include only what you need.

```python
# BUILD file - application with metrics and tracing
cc_binary(
    name = "full_observability_app",
    srcs = ["app.cc"],
    deps = [
        # Core APIs
        "@io_opentelemetry_cpp//api",

        # Tracing components
        "@io_opentelemetry_cpp//sdk/src/trace",

        # Metrics components
        "@io_opentelemetry_cpp//sdk/src/metrics",

        # Resource detection
        "@io_opentelemetry_cpp//sdk/src/resource",

        # OTLP exporters
        "@io_opentelemetry_cpp//exporters/otlp:otlp_http_exporter",
        "@io_opentelemetry_cpp//exporters/otlp:otlp_http_metric_exporter",
    ],
    linkopts = select({
        "@platforms//os:linux": ["-pthread"],
        "@platforms//os:macos": [],
        "//conditions:default": [],
    }),
)
```

The `select` statement provides platform-specific linker options, which is crucial when building for multiple operating systems.

## Creating Reusable OpenTelemetry Rules

For larger projects, you might want to create custom Bazel macros that encapsulate common OpenTelemetry patterns.

```python
# //bazel/otel.bzl - custom macro for OpenTelemetry-enabled services
def otel_cc_library(name, srcs, hdrs, deps = [], **kwargs):
    """Create a C++ library with OpenTelemetry dependencies included."""
    native.cc_library(
        name = name,
        srcs = srcs,
        hdrs = hdrs,
        deps = deps + [
            "@io_opentelemetry_cpp//api",
            "@io_opentelemetry_cpp//sdk/src/trace",
        ],
        **kwargs
    )

def otel_cc_binary(name, srcs, deps = [], **kwargs):
    """Create a C++ binary with full OpenTelemetry stack."""
    native.cc_binary(
        name = name,
        srcs = srcs,
        deps = deps + [
            "@io_opentelemetry_cpp//api",
            "@io_opentelemetry_cpp//sdk/src/trace",
            "@io_opentelemetry_cpp//sdk/src/metrics",
            "@io_opentelemetry_cpp//sdk/src/resource",
            "@io_opentelemetry_cpp//exporters/otlp:otlp_http_exporter",
        ],
        **kwargs
    )
```

These macros reduce boilerplate and ensure consistency across your codebase. Teams can use `otel_cc_binary` instead of `cc_binary` and get OpenTelemetry support automatically.

## Handling Version Management

Bazel makes it easy to pin specific versions of OpenTelemetry, but you should establish a strategy for updates.

```python
# //bazel/deps.bzl - centralized dependency management
OPENTELEMETRY_VERSION = "1.14.2"
OPENTELEMETRY_SHA256 = "your_sha256_here"

def opentelemetry_dependencies():
    """Load OpenTelemetry with pinned version."""
    http_archive(
        name = "io_opentelemetry_cpp",
        sha256 = OPENTELEMETRY_SHA256,
        strip_prefix = "opentelemetry-cpp-{}".format(OPENTELEMETRY_VERSION),
        urls = [
            "https://github.com/open-telemetry/opentelemetry-cpp/archive/refs/tags/v{}.tar.gz".format(OPENTELEMETRY_VERSION),
        ],
    )
```

Then in your WORKSPACE file, simply call this function. When you need to update OpenTelemetry, change the version constant in one place.

## Testing with Bazel and OpenTelemetry

Testing instrumented code requires setting up proper test fixtures and potentially mocking exporters.

```python
# BUILD file - test configuration
cc_test(
    name = "instrumentation_test",
    srcs = ["instrumentation_test.cc"],
    deps = [
        ":instrumented_service",
        "@io_opentelemetry_cpp//api",
        "@io_opentelemetry_cpp//sdk/src/trace",
        "@io_opentelemetry_cpp//exporters/memory:in_memory_span_exporter",
        "@com_google_googletest//:gtest_main",
    ],
    size = "small",
)
```

The in-memory span exporter is particularly useful for tests, allowing you to verify that your code produces the expected telemetry without requiring external infrastructure.

## Optimizing Build Performance

Bazel's caching mechanism can significantly speed up builds, but you need to configure it properly for OpenTelemetry projects.

```python
# .bazelrc - build optimization settings
build --disk_cache=~/.cache/bazel
build --experimental_remote_cache_compression

# Use multiple jobs for parallel compilation
build --jobs=auto

# Enable persistent workers for faster rebuilds
build --strategy=CppCompile=worker
build --worker_sandboxing

# Remote caching for team builds (optional)
build:remote --remote_cache=grpc://your-cache-server:9092
```

These settings enable local disk caching and, optionally, remote caching for team environments. OpenTelemetry C++ can take a while to build from scratch, so caching is essential.

## Cross-Compilation Considerations

If you're building for multiple platforms, Bazel's toolchain system works well with OpenTelemetry.

```python
# Platform-specific build configurations
config_setting(
    name = "linux_x86_64",
    constraint_values = [
        "@platforms//os:linux",
        "@platforms//cpu:x86_64",
    ],
)

config_setting(
    name = "macos_arm64",
    constraint_values = [
        "@platforms//os:macos",
        "@platforms//cpu:arm64",
    ],
)

# Use platform-specific dependencies
cc_binary(
    name = "multi_platform_service",
    srcs = ["service.cc"],
    deps = select({
        ":linux_x86_64": ["//platform:linux_specific"],
        ":macos_arm64": ["//platform:macos_specific"],
        "//conditions:default": [],
    }) + [
        "@io_opentelemetry_cpp//api",
        "@io_opentelemetry_cpp//sdk/src/trace",
    ],
)
```

## Troubleshooting Common Issues

When integrating OpenTelemetry with Bazel, you might encounter dependency resolution issues. Use `bazel query` to debug:

```bash
# Find all dependencies of your target
bazel query "deps(//your/package:target)" --output graph

# Find why a specific dependency is included
bazel query "somepath(//your/package:target, @io_opentelemetry_cpp//api)"

# Check for duplicate dependencies
bazel query "allpaths(//your/package:target, @io_opentelemetry_cpp//...)"
```

These commands help identify circular dependencies, version conflicts, or missing transitive dependencies.

Bazel provides excellent support for building reproducible, hermetic C++ projects with OpenTelemetry. By properly structuring your WORKSPACE, BUILD files, and configuration, you can create a maintainable build system that scales from small services to large distributed systems. The key is understanding Bazel's dependency model and leveraging its features like selective dependencies, custom macros, and caching to optimize both build times and code organization.
