# Validation Summary: How to Test Wasm Plugins Locally Before Deploying to Istio

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Istio WasmPlugin
- Envoy HTTP Wasm filters
- Proxy-Wasm Rust test framework
- Proxy-Wasm Go SDK proxytest
- Rust WASI targets
- Docker and Docker Compose
- ORAS
- Kubernetes kubectl

## Sources Consulted
- Rust Blog: Changes to Rust's WASI targets - https://blog.rust-lang.org/2024/04/09/updates-to-rusts-wasi-targets/
- The rustc book: wasm32-wasip1 - https://doc.rust-lang.org/stable/rustc/platform-support/wasm32-wasip1.html
- Proxy-Wasm test-framework repository - https://github.com/proxy-wasm/test-framework
- Proxy-Wasm Go SDK proxytest package documentation - https://pkg.go.dev/github.com/proxy-wasm/proxy-wasm-go-sdk/proxywasm/proxytest
- Envoy HTTP Wasm filter documentation - https://www.envoyproxy.io/docs/envoy/latest/configuration/http/http_filters/wasm_filter.html
- Envoy Wasm runtime documentation - https://www.envoyproxy.io/docs/envoy/latest/configuration/other_features/wasm
- Istio WasmPlugin API reference - https://istio.io/latest/docs/reference/config/proxy_extensions/wasm-plugin/
- Docker Compose CLI documentation - https://docs.docker.com/reference/cli/docker/compose/
- Docker Compose file version documentation - https://docs.docker.com/reference/compose-file/version-and-name/
- ORAS push command documentation - https://oras.land/docs/1.1/commands/oras_push/

## Issues Found
- The Rust examples used the removed `wasm32-wasi` target and target output path. Updated commands and paths to `wasm32-wasip1`, matching the Rust target rename and removal schedule.
- The Rust dependency and test snippet did not match the actual Proxy-Wasm test-framework API. Updated the dependency to use the project repository, removed nonexistent `MockSettings` fields/defaults, added `execute_and_expect` calls, and used the framework's expectation API for plugin configuration, header mutation, and local response assertions.
- The Go example used the old Tetrate import path for `proxytest`. Updated imports to the current `github.com/proxy-wasm/proxy-wasm-go-sdk/proxywasm/proxytest` package path while keeping the shown host emulator API.
- The standalone Docker example used host networking while the Envoy cluster pointed at the Docker DNS name `upstream`, and the upstream listened on a different port than Envoy configured. Updated the commands to use a user-defined Docker network and consistent upstream port `8080`.
- The Compose example used the obsolete top-level `version` field and legacy `docker-compose` command. Removed the `version` field and updated commands to `docker compose`.
- The automated script checked Envoy logs for a runtime statistic and included a hard-coded API-key rejection test that was not configured by the shown Envoy configuration. Updated the load check to query Envoy admin stats and removed the unconfigured auth assertion.

## Review Notes
The Envoy Wasm filter remains experimental per Envoy documentation, and Istio's WasmPlugin API is still `v1alpha1`. The examples are intentionally plugin-specific; real tests should align the expected headers, response codes, and plugin configuration fields with the actual plugin implementation.
