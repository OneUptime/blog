# Validation Summary: How to Write Wasm Plugins in C++ for Istio

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Istio WasmPlugin
- WebAssembly
- Proxy-Wasm C++ SDK
- Envoy HTTP filters
- Emscripten
- Docker
- ORAS and OCI registries
- C++17

## Sources Consulted
- Istio WasmPlugin API reference: https://istio.io/latest/docs/reference/config/proxy_extensions/wasm-plugin/
- Istio WebAssembly module distribution task: https://istio.io/latest/docs/tasks/extensibility/wasm-module-distribution/
- proxy-wasm C++ SDK repository and README: https://github.com/proxy-wasm/proxy-wasm-cpp-sdk
- proxy-wasm C++ SDK build instructions: https://github.com/proxy-wasm/proxy-wasm-cpp-sdk/blob/main/docs/building.md
- proxy-wasm C++ SDK API overview: https://github.com/proxy-wasm/proxy-wasm-cpp-sdk/blob/main/docs/api_overview.md
- proxy-wasm C++ SDK example plugin: https://github.com/proxy-wasm/proxy-wasm-cpp-sdk/blob/main/example/http_wasm_example.cc
- Istio ecosystem Open Policy Agent Wasm extension example: https://github.com/istio-ecosystem/wasm-extensions/blob/master/extensions/open_policy_agent/plugin.cc
- ORAS push command documentation: https://oras.land/docs/commands/oras_push/

## Issues Found
- The post used a CMake build with `add_subdirectory(proxy-wasm-cpp-sdk)`, but the current proxy-wasm C++ SDK documents a Makefile-based build and does not provide that CMake integration. Replaced the CMake section with an SDK Makefile workflow.
- The Emscripten setup used `latest`; the SDK documents Emscripten 3.1.67 as a known-working version. Updated the install commands to use 3.1.67.
- The Docker build example used the generic `emscripten/emsdk` image. Updated it to build and use the SDK's documented `Dockerfile-sdk` image.
- The project structure still referred to `CMakeLists.txt` after the build workflow; changed it to `Makefile`.
- The C++ header used `std::string_view` without including `<string_view>`. Added the include.
- The HTTP callout example called `httpCall` directly from a stream `Context`. The SDK exposes the high-level `httpCall` API on `RootContext`, and Istio's canonical OPA example switches back to the stream context before continuing or responding. Updated the example to call `root_->httpCall`, capture the stream context ID, and call `setEffectiveContext()`.
- The HTTP callout used a service hostname as the call target. Updated the example to use the Istio outbound cluster-name form.
- The WasmPlugin deployment registered a root ID in C++ but did not set `pluginName`. Added `pluginName: my_plugin_root_id` so the Istio configuration matches the registered root ID.
- The ORAS command did not set an artifact type and referenced the old `build/plugin.wasm` path. Updated it to use the generated `plugin.wasm` and include `--artifact-type`.
- The performance comparison made absolute claims about size and speed that are not guaranteed by official documentation. Reworded those claims to depend on dependencies, compiler options, and runtime behavior.

## Review Notes
The authentication snippets are illustrative and still assume omitted surrounding definitions such as `AuthRootContext`, `key_header_`, and `valid_keys_`. That is acceptable for the section's scope, but a future revision could provide a complete compilable authentication example.
