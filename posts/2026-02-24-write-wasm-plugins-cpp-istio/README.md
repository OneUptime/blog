# How to Write Wasm Plugins in C++ for Istio

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Istio, WebAssembly, C++, Envoy, Proxy-wasm

Description: Writing WebAssembly plugins for Istio in C++ using the proxy-wasm C++ SDK, covering project setup, API usage, and compilation workflow.

---

C++ was the original language for Envoy filters, and it remains a solid choice for Wasm plugins when you need maximum performance or want to port existing C++ filter code to the Wasm model. The proxy-wasm C++ SDK wraps the low-level Wasm ABI in a familiar C++ class hierarchy that mirrors the Envoy filter API. This post walks through writing, building, and deploying a C++ Wasm plugin for Istio.

## Why C++ for Wasm Plugins

C++ makes sense when:

- You are porting an existing Envoy C++ filter to Wasm
- You need absolute maximum performance (no runtime overhead)
- Your plugin uses C/C++ libraries that do not exist in Rust or Go
- Your team has deep C++ expertise

The tradeoffs:

- **More complex build setup**: Requires Emscripten or a Wasm-capable C++ toolchain
- **No memory safety guarantees**: Unlike Rust, C++ will not catch buffer overflows at compile time
- **Larger project scaffolding**: More boilerplate than Rust or Go

## Setting Up the Build Environment

You need Emscripten to compile C++ to Wasm:

```bash
# Install Emscripten
git clone https://github.com/emscripten-core/emsdk.git
cd emsdk
./emsdk install latest
./emsdk activate latest
source ./emsdk_env.sh

# Verify
emcc --version
```

Alternatively, you can use a Docker-based build environment:

```bash
docker pull emscripten/emsdk:latest
```

## Project Structure

Create the following project structure:

```text
my-cpp-plugin/
  CMakeLists.txt
  src/
    plugin.cc
    plugin.h
  proxy-wasm-cpp-sdk/   (git submodule or download)
```

Get the proxy-wasm C++ SDK:

```bash
mkdir my-cpp-plugin && cd my-cpp-plugin
git clone https://github.com/proxy-wasm/proxy-wasm-cpp-sdk.git
mkdir src
```

## Writing the Plugin

Create `src/plugin.h`:

```cpp
#pragma once

#include "proxy_wasm_intrinsics.h"
#include <string>
#include <unordered_map>
#include <vector>

class MyPluginRootContext : public RootContext {
public:
    explicit MyPluginRootContext(uint32_t id, std::string_view root_id)
        : RootContext(id, root_id) {}

    bool onConfigure(size_t config_size) override;
    bool onStart(size_t vm_configuration_size) override;
    void onTick() override;

    // Configuration
    std::string header_name_;
    std::string header_value_;
    std::vector<std::string> bypass_paths_;
};

class MyPluginContext : public Context {
public:
    explicit MyPluginContext(uint32_t id, RootContext* root)
        : Context(id, root),
          root_(static_cast<MyPluginRootContext*>(root)) {}

    FilterHeadersStatus onRequestHeaders(uint32_t headers, bool end_of_stream) override;
    FilterDataStatus onRequestBody(size_t body_buffer_length, bool end_of_stream) override;
    FilterHeadersStatus onResponseHeaders(uint32_t headers, bool end_of_stream) override;
    FilterDataStatus onResponseBody(size_t body_buffer_length, bool end_of_stream) override;
    void onLog() override;

private:
    MyPluginRootContext* root_;
    uint64_t request_start_time_{0};
};
```

Create `src/plugin.cc`:

```cpp
#include "plugin.h"
#include <string>
#include <sstream>

// Register the plugin
static RegisterContextFactory register_MyPluginContext(
    CONTEXT_FACTORY(MyPluginContext),
    ROOT_FACTORY(MyPluginRootContext),
    "my_plugin_root_id"
);

bool MyPluginRootContext::onStart(size_t) {
    LOG_INFO("Plugin started");
    return true;
}

bool MyPluginRootContext::onConfigure(size_t config_size) {
    if (config_size == 0) {
        LOG_INFO("No configuration provided, using defaults");
        header_name_ = "x-wasm-plugin";
        header_value_ = "cpp-plugin";
        return true;
    }

    auto config_data = getBufferBytes(WasmBufferType::PluginConfiguration, 0, config_size);
    auto config_str = config_data->toString();

    // Simple JSON parsing (in production, use a proper JSON library)
    // For this example, we parse a simple format
    LOG_INFO(std::string("Configuration received: ") + config_str);

    // Parse header_name
    auto pos = config_str.find("\"header_name\"");
    if (pos != std::string::npos) {
        auto val_start = config_str.find("\"", pos + 13) + 1;
        auto val_end = config_str.find("\"", val_start);
        header_name_ = config_str.substr(val_start, val_end - val_start);
    } else {
        header_name_ = "x-wasm-plugin";
    }

    // Parse header_value
    pos = config_str.find("\"header_value\"");
    if (pos != std::string::npos) {
        auto val_start = config_str.find("\"", pos + 14) + 1;
        auto val_end = config_str.find("\"", val_start);
        header_value_ = config_str.substr(val_start, val_end - val_start);
    } else {
        header_value_ = "cpp-plugin";
    }

    LOG_INFO(std::string("Configured: ") + header_name_ + "=" + header_value_);
    return true;
}

void MyPluginRootContext::onTick() {
    // Called periodically if setTickPeriod was used
}

FilterHeadersStatus MyPluginContext::onRequestHeaders(uint32_t headers, bool end_of_stream) {
    // Record request start time
    request_start_time_ = getCurrentTimeNanoseconds();

    // Get the request path
    auto path = getRequestHeader(":path");
    auto method = getRequestHeader(":method");

    LOG_DEBUG(std::string("Request: ") +
              std::string(method->view()) + " " +
              std::string(path->view()));

    // Check bypass paths
    for (const auto& bp : root_->bypass_paths_) {
        if (path->view().substr(0, bp.size()) == bp) {
            return FilterHeadersStatus::Continue;
        }
    }

    // Add a request header
    addRequestHeader("x-processed-by", "cpp-wasm-plugin");

    return FilterHeadersStatus::Continue;
}

FilterDataStatus MyPluginContext::onRequestBody(size_t body_buffer_length, bool end_of_stream) {
    if (!end_of_stream) {
        return FilterDataStatus::StopIterationAndBuffer;
    }

    // Get the full body
    auto body = getBufferBytes(WasmBufferType::HttpRequestBody, 0, body_buffer_length);
    if (body) {
        LOG_DEBUG(std::string("Request body size: ") + std::to_string(body_buffer_length));
    }

    return FilterDataStatus::Continue;
}

FilterHeadersStatus MyPluginContext::onResponseHeaders(uint32_t headers, bool end_of_stream) {
    // Add custom header to response
    addResponseHeader(root_->header_name_, root_->header_value_);

    // Calculate and add processing time
    uint64_t now = getCurrentTimeNanoseconds();
    uint64_t duration_ms = (now - request_start_time_) / 1000000;
    addResponseHeader("x-processing-time-ms", std::to_string(duration_ms));

    // Remove internal headers
    removeResponseHeader("x-envoy-upstream-service-time");

    return FilterHeadersStatus::Continue;
}

FilterDataStatus MyPluginContext::onResponseBody(size_t body_buffer_length, bool end_of_stream) {
    return FilterDataStatus::Continue;
}

void MyPluginContext::onLog() {
    // Called when the request is complete
    auto path = getRequestHeader(":path");
    auto status = getResponseHeader(":status");

    uint64_t now = getCurrentTimeNanoseconds();
    uint64_t duration_ms = (now - request_start_time_) / 1000000;

    LOG_INFO(std::string("Completed: ") +
             std::string(path->view()) +
             " status=" + std::string(status->view()) +
             " duration=" + std::to_string(duration_ms) + "ms");
}
```

## Building with CMake

Create `CMakeLists.txt`:

```cmake
cmake_minimum_required(VERSION 3.10)
project(my_cpp_plugin)

set(CMAKE_CXX_STANDARD 17)
set(CMAKE_CXX_STANDARD_REQUIRED ON)

# proxy-wasm C++ SDK
add_subdirectory(proxy-wasm-cpp-sdk)

add_executable(plugin.wasm
    src/plugin.cc
)

target_include_directories(plugin.wasm PRIVATE
    ${CMAKE_SOURCE_DIR}/proxy-wasm-cpp-sdk
)

target_link_libraries(plugin.wasm PRIVATE
    proxy_wasm_intrinsics
)

# Set Wasm-specific compiler flags
set_target_properties(plugin.wasm PROPERTIES
    SUFFIX ".wasm"
)
```

Build:

```bash
# Using Emscripten
mkdir build && cd build
emcmake cmake ..
emmake make

# The output will be build/plugin.wasm
```

Or using Docker:

```bash
docker run --rm -v $(pwd):/src -w /src emscripten/emsdk bash -c "
  mkdir -p build && cd build &&
  emcmake cmake .. &&
  emmake make
"
```

## Building an Authentication Filter in C++

Here is a C++ authentication filter:

```cpp
class AuthContext : public Context {
public:
    explicit AuthContext(uint32_t id, RootContext* root)
        : Context(id, root), root_(static_cast<AuthRootContext*>(root)) {}

    FilterHeadersStatus onRequestHeaders(uint32_t headers, bool end_of_stream) override {
        auto path = getRequestHeader(":path");

        // Check bypass paths
        for (const auto& bp : root_->bypass_paths_) {
            if (path->view().substr(0, bp.size()) == bp) {
                return FilterHeadersStatus::Continue;
            }
        }

        // Check API key
        auto api_key = getRequestHeader(root_->key_header_);
        if (!api_key || api_key->view().empty()) {
            sendLocalResponse(
                401,
                "",
                "{\"error\":\"missing api key\"}",
                {{"content-type", "application/json"}}
            );
            return FilterHeadersStatus::StopIteration;
        }

        std::string key_str(api_key->view());
        auto it = root_->valid_keys_.find(key_str);
        if (it == root_->valid_keys_.end()) {
            LOG_WARN(std::string("Invalid API key attempt"));
            sendLocalResponse(
                403,
                "",
                "{\"error\":\"invalid api key\"}",
                {{"content-type", "application/json"}}
            );
            return FilterHeadersStatus::StopIteration;
        }

        // Set client identity header
        addRequestHeader("x-client-name", it->second);
        // Remove API key from downstream request
        removeRequestHeader(root_->key_header_);

        return FilterHeadersStatus::Continue;
    }

private:
    AuthRootContext* root_;
};
```

## Making HTTP Callouts in C++

```cpp
FilterHeadersStatus AuthContext::onRequestHeaders(uint32_t headers, bool end_of_stream) {
    auto token = getRequestHeader("authorization");
    if (!token) {
        sendLocalResponse(401, "", "missing authorization", {});
        return FilterHeadersStatus::StopIteration;
    }

    std::string body = "{\"token\":\"" + std::string(token->view()) + "\"}";

    auto result = httpCall(
        "auth-service.default.svc.cluster.local",
        {
            {":method", "POST"},
            {":path", "/validate"},
            {":authority", "auth-service.default.svc.cluster.local"},
            {"content-type", "application/json"},
        },
        body,
        {},
        5000,  // timeout ms
        [this](uint32_t headers, size_t body_size, uint32_t trailers) {
            auto status = getHeaderMapValue(WasmHeaderMapType::HttpCallResponseHeaders, ":status");
            if (status && status->view() == "200") {
                continueRequest();
            } else {
                sendLocalResponse(403, "", "auth failed", {});
            }
        }
    );

    if (result != WasmResult::Ok) {
        LOG_ERROR("Failed to dispatch HTTP call");
        sendLocalResponse(500, "", "auth service unavailable", {});
        return FilterHeadersStatus::StopIteration;
    }

    return FilterHeadersStatus::StopIteration;
}
```

## Deploying the C++ Plugin

```yaml
apiVersion: extensions.istio.io/v1alpha1
kind: WasmPlugin
metadata:
  name: cpp-auth-plugin
  namespace: my-app
spec:
  selector:
    matchLabels:
      app: api-gateway
  url: oci://registry.example.com/plugins/cpp-auth:v1.0
  phase: AUTHN
  failStrategy: FAIL_CLOSE
  pluginConfig:
    header_name: x-processed
    header_value: cpp-plugin-v1
```

Push the Wasm binary:

```bash
oras push registry.example.com/plugins/cpp-auth:v1.0 \
  build/plugin.wasm:application/vnd.module.wasm.content.layer.v1+wasm
```

## JSON Parsing Options

The proxy-wasm C++ SDK does not include a JSON parser. You have a few options:

1. **nlohmann/json**: Popular header-only library that works with Emscripten
2. **RapidJSON**: High-performance JSON parser that compiles to small Wasm
3. **Simple string parsing**: For very simple configurations, manual parsing avoids dependencies

To use nlohmann/json:

```cpp
#include "nlohmann/json.hpp"

bool MyPluginRootContext::onConfigure(size_t config_size) {
    auto config_data = getBufferBytes(WasmBufferType::PluginConfiguration, 0, config_size);
    auto config = nlohmann::json::parse(config_data->toString());

    header_name_ = config.value("header_name", "x-default");
    header_value_ = config.value("header_value", "default");

    if (config.contains("bypass_paths")) {
        for (const auto& path : config["bypass_paths"]) {
            bypass_paths_.push_back(path.get<std::string>());
        }
    }

    return true;
}
```

## Performance Comparison

C++ Wasm plugins are typically the fastest option:

- **Binary size**: 50KB-200KB (smallest of all languages)
- **Memory overhead**: Minimal (no runtime or GC)
- **Execution speed**: Comparable to native Envoy filters
- **Startup time**: Fastest Wasm VM initialization

## Summary

C++ is a strong choice for Wasm plugins when performance is critical or when porting existing Envoy filter code. The proxy-wasm C++ SDK provides a class hierarchy that closely mirrors Envoy's native filter API, making the transition from native filters to Wasm straightforward. The build setup is more involved than Rust or Go, requiring Emscripten and CMake, but the resulting binaries are the smallest and fastest of all proxy-wasm language options.
