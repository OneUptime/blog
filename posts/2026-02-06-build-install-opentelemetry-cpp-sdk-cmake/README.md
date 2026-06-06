# How to Build and Install OpenTelemetry C++ SDK with CMake

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTelemetry, C++, SDK, CMake, Build, Installation

Description: A comprehensive guide to building and installing the OpenTelemetry C++ SDK from source using CMake, covering prerequisites, configuration options, and troubleshooting common build issues.

Getting OpenTelemetry working in C++ applications often involves building the SDK from source, as officially maintained pre-built binaries are not consistently available across platforms. The build process involves CMake and several dependencies, but once you understand the configuration options, it becomes straightforward.

## Prerequisites

Before building the OpenTelemetry C++ SDK, you need to ensure your system has the necessary tools and libraries. The SDK requires a C++14-compliant compiler at minimum, though C++17 or later is recommended for better compatibility. CMake 3.16 or later is required.

For Linux systems, install the build essentials:

```bash
# Ubuntu/Debian

sudo apt-get update
sudo apt-get install build-essential cmake git libcurl4-openssl-dev

# RHEL/CentOS/Fedora
sudo yum groupinstall "Development Tools"
sudo yum install cmake git libcurl-devel
```

For macOS, use Homebrew:

```bash
brew install cmake git curl
```

Windows users should install Visual Studio 2019 or later with C++ build tools and CMake.

## Cloning the Repository

The OpenTelemetry C++ SDK is hosted on GitHub. Clone the repository with submodules, as the SDK depends on several third-party libraries:

```bash
# Clone the repository with all submodules
git clone --recursive https://github.com/open-telemetry/opentelemetry-cpp.git
cd opentelemetry-cpp

# If you forgot --recursive, initialize submodules separately
git submodule update --init --recursive
```

The `--recursive` flag is important because OpenTelemetry C++ includes dependencies like Google Test, Google Benchmark, opentelemetry-proto, nlohmann-json, and others as submodules. Some exporter dependencies, such as gRPC and Abseil, may also be fetched by CMake when they are not available as installed packages.

## Basic Build Configuration

Create a separate build directory to keep the source tree clean:

```bash
mkdir build
cd build
```

Run CMake with basic configuration options:

```bash
# Configure the build with essential options
cmake .. \
  -DCMAKE_BUILD_TYPE=Release \
  -DBUILD_SHARED_LIBS=ON \
  -DCMAKE_INSTALL_PREFIX=/usr/local
```

The `CMAKE_BUILD_TYPE=Release` flag optimizes the build for production use. Use `Debug` instead if you need debugging symbols.

## Enabling Exporters

OpenTelemetry supports multiple exporters for sending telemetry data. Enable the ones you need:

```bash
# Build with OTLP exporters (most common)
cmake .. \
  -DCMAKE_BUILD_TYPE=Release \
  -DBUILD_SHARED_LIBS=ON \
  -DWITH_OTLP_GRPC=ON \
  -DWITH_OTLP_HTTP=ON \
  -DCMAKE_INSTALL_PREFIX=/usr/local
```

For Zipkin or Prometheus exporters:

```bash
# Include additional exporters
cmake .. \
  -DCMAKE_BUILD_TYPE=Release \
  -DBUILD_SHARED_LIBS=ON \
  -DWITH_OTLP_GRPC=ON \
  -DWITH_OTLP_HTTP=ON \
  -DWITH_ZIPKIN=ON \
  -DWITH_PROMETHEUS=ON \
  -DCMAKE_INSTALL_PREFIX=/usr/local
```

## Configuring Dependencies

The SDK can use system-installed dependencies or fetch compatible versions during the CMake build. Using system dependencies reduces build time:

```bash
# Use system-installed gRPC, Protobuf, Abseil, and CURL packages from a custom prefix
cmake .. \
  -DCMAKE_BUILD_TYPE=Release \
  -DBUILD_SHARED_LIBS=ON \
  -DWITH_OTLP_GRPC=ON \
  -DWITH_OTLP_HTTP=ON \
  -DCMAKE_PREFIX_PATH=/opt/otel-deps \
  -DCMAKE_INSTALL_PREFIX=/usr/local
```

If the dependencies are not installed, CMake can fetch and build compatible versions:

```bash
# Let CMake fetch missing exporter dependencies
cmake .. \
  -DCMAKE_BUILD_TYPE=Release \
  -DBUILD_SHARED_LIBS=ON \
  -DWITH_OTLP_GRPC=ON \
  -DWITH_OTLP_HTTP=ON \
  -DCMAKE_INSTALL_PREFIX=/usr/local
```

## Building the SDK

After configuration, build the SDK using the generated build system:

```bash
# Build using all available CPU cores
cmake --build . --parallel

# Or specify a number of parallel jobs
cmake --build . --parallel 4
```

The build process can take 10-30 minutes depending on your system and enabled features. Monitor for errors related to missing dependencies or compiler issues.

## Installing the SDK

Once built successfully, install the SDK to your system:

```bash
# Install to the prefix specified during configuration
sudo cmake --install .
```

This installs headers to `/usr/local/include/opentelemetry` and libraries to `/usr/local/lib` (or your specified prefix).

Verify the installation:

```bash
# Check installed headers
ls /usr/local/include/opentelemetry

# Check installed libraries
ls /usr/local/lib | grep opentelemetry
```

## CMake Configuration for Your Project

After installing the SDK, configure your C++ project to use it. Create a `CMakeLists.txt`:

```cmake
cmake_minimum_required(VERSION 3.16)
project(MyApp CXX)

set(CMAKE_CXX_STANDARD 17)
set(CMAKE_CXX_STANDARD_REQUIRED ON)

# Find OpenTelemetry package
find_package(opentelemetry-cpp CONFIG REQUIRED)

# Create your executable
add_executable(myapp main.cpp)

# Link against OpenTelemetry libraries
target_link_libraries(myapp
    PRIVATE
    opentelemetry-cpp::api
    opentelemetry-cpp::sdk
    opentelemetry-cpp::otlp_grpc_exporter
    opentelemetry-cpp::otlp_http_exporter
)
```

## Custom Installation Prefix

If you cannot install to system directories, use a custom prefix:

```bash
# Install to a local directory
cmake .. \
  -DCMAKE_BUILD_TYPE=Release \
  -DBUILD_SHARED_LIBS=ON \
  -DWITH_OTLP_GRPC=ON \
  -DCMAKE_INSTALL_PREFIX=$HOME/opentelemetry

cmake --build . --parallel
cmake --install .
```

Then configure your project to find the custom installation:

```bash
# Set CMAKE_PREFIX_PATH when building your application
cmake -DCMAKE_PREFIX_PATH=$HOME/opentelemetry ..
```

## Static vs Shared Libraries

Choose between static and shared libraries based on your deployment needs:

```bash
# Build static libraries (easier deployment)
cmake .. \
  -DCMAKE_BUILD_TYPE=Release \
  -DBUILD_SHARED_LIBS=OFF \
  -DWITH_OTLP_GRPC=ON

# Build shared libraries (smaller binary size)
cmake .. \
  -DCMAKE_BUILD_TYPE=Release \
  -DBUILD_SHARED_LIBS=ON \
  -DWITH_OTLP_GRPC=ON
```

Static libraries increase your binary size but eliminate runtime dependencies. Shared libraries reduce binary size but require the libraries to be present at runtime.

## Troubleshooting Build Issues

If CMake cannot find Abseil, build and install a version compatible with the gRPC version you are using:

```bash
# Install Abseil separately
git clone https://github.com/abseil/abseil-cpp.git
cd abseil-cpp
git checkout 20250512.1
mkdir build && cd build
cmake .. -DCMAKE_INSTALL_PREFIX=/usr/local -DCMAKE_CXX_STANDARD=17
cmake --build . --parallel
sudo cmake --install .
```

For Protobuf version conflicts:

```bash
# Install a compatible Protobuf version with CMake
git clone https://github.com/protocolbuffers/protobuf.git
cd protobuf
git checkout v6.31.1
git submodule update --init --recursive
mkdir build && cd build
cmake .. \
  -DCMAKE_BUILD_TYPE=Release \
  -Dprotobuf_ABSL_PROVIDER=package \
  -Dprotobuf_BUILD_TESTS=OFF \
  -DCMAKE_INSTALL_PREFIX=/usr/local
cmake --build . --parallel
sudo cmake --install .
```

## Build Diagram

Here's how the build process flows:

```mermaid
graph TD
    A[Clone Repository] --> B[Initialize Submodules]
    B --> C[Configure CMake]
    C --> D{Check Dependencies}
    D -->|Missing| E[Fetch Missing Dependencies]
    D -->|Found| F[Use System Dependencies]
    E --> G[Build OpenTelemetry SDK]
    F --> G
    G --> H[Run Tests Optional]
    H --> I[Install SDK]
    I --> J[Configure Application CMake]
    J --> K[Link Application]
```

## Running Tests

Verify your build by running the test suite:

```bash
# Enable tests during configuration
cmake .. \
  -DCMAKE_BUILD_TYPE=Release \
  -DBUILD_SHARED_LIBS=ON \
  -DWITH_OTLP_GRPC=ON \
  -DBUILD_TESTING=ON

cmake --build . --parallel

# Run all tests
ctest --output-on-failure
```

Tests help ensure the SDK was built correctly for your platform.

## Advanced Configuration Options

For production builds, consider these additional flags:

```bash
cmake .. \
  -DCMAKE_BUILD_TYPE=Release \
  -DBUILD_SHARED_LIBS=ON \
  -DWITH_OTLP_GRPC=ON \
  -DWITH_OTLP_HTTP=ON \
  -DWITH_EXAMPLES=OFF \
  -DBUILD_TESTING=OFF \
  -DWITH_BENCHMARK=OFF \
  -DCMAKE_POSITION_INDEPENDENT_CODE=ON
```

The `CMAKE_POSITION_INDEPENDENT_CODE` flag is essential if you plan to use the SDK in shared libraries.

Building the OpenTelemetry C++ SDK takes some time initially, but the process is reproducible and well-documented. Once installed, you can instrument your C++ applications with distributed tracing and metrics.
