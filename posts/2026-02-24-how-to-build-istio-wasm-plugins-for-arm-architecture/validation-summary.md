# Validation Summary: How to Build Istio Wasm Plugins for ARM Architecture

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Istio WasmPlugin API
- Envoy Proxy-Wasm
- WebAssembly and WASI
- Rust and the proxy-wasm Rust SDK
- Go and the proxy-wasm Go SDK
- OCI registries and ORAS
- Kubernetes, kind, and GitHub Actions

## Sources Consulted
- Istio WasmPlugin reference: https://istio.io/latest/docs/reference/config/proxy_extensions/wasm-plugin/
- Istio Wasm pull policy documentation: https://istio.io/latest/docs/ops/configuration/extensibility/wasm-pull-policy/
- Envoy Wasm architecture overview: https://www.envoyproxy.io/docs/envoy/latest/intro/arch_overview/advanced/wasm
- Rust `wasm32-wasip1` target documentation: https://doc.rust-lang.org/stable/rustc/platform-support/wasm32-wasip1.html
- Rust blog on WASI target renaming: https://blog.rust-lang.org/2024/04/09/updates-to-rusts-wasi-targets/
- Rustup cross-compilation documentation: https://rust-lang.github.io/rustup/cross-compilation.html
- proxy-wasm Rust SDK examples and CI workflow: https://github.com/proxy-wasm/proxy-wasm-rust-sdk
- proxy-wasm Go SDK README and examples: https://github.com/proxy-wasm/proxy-wasm-go-sdk
- Archived Tetrate proxy-wasm Go SDK README: https://github.com/tetratelabs/proxy-wasm-go-sdk
- Go installation documentation: https://go.dev/doc/install
- ORAS `push` command documentation: https://oras.land/docs/commands/oras_push/
- ORAS pushing and pulling guide: https://oras.land/docs/how_to_guides/pushing_and_pulling/
- Wasm OCI image specification: https://github.com/solo-io/wasm/blob/master/spec/README.md

## Issues Found
- The post used the old Rust target name `wasm32-wasi`. Modern stable Rust renamed this target to `wasm32-wasip1`, and local Rust 1.93 rejects `wasm32-wasi`. Updated the Rust setup, build commands, artifact paths, CI command, and `wasm-opt` examples to use `wasm32-wasip1`.
- The Go section used the archived `github.com/tetratelabs/proxy-wasm-go-sdk` TinyGo-era SDK. Updated it to the maintained `github.com/proxy-wasm/proxy-wasm-go-sdk`, changed the initialization pattern to use `init()`, and replaced the TinyGo build command with the current Go 1.24+ `GOOS=wasip1 GOARCH=wasm go build -buildmode=c-shared` flow.
- The Go build snippet omitted module setup. Added `go mod init` and `go get` so the example can resolve the SDK dependency.
- The WasmPlugin YAML used `phase: RESPONSE`, but Istio's documented phases are `UNSPECIFIED_PHASE`, `AUTHN`, `AUTHZ`, and `STATS`. Removed the invalid phase field for this independent response-header plugin.
- The GitHub Actions workflow used the archived `actions-rs/toolchain@v1` action and the old Rust target. Replaced it with a direct `rustup target add wasm32-wasip1` step.
- The CI section claimed the build produces identical wasm output across x86 and ARM. Softened this to say it produces an architecture-neutral wasm artifact, avoiding a bit-for-bit reproducibility claim that depends on toolchain and build environment details.
- The summary still referenced TinyGo after the Go section was updated. Changed it to reference Go.

## Review Notes
- The Rust example was compiled locally with Rust 1.93 using `cargo build --target wasm32-wasip1 --release`, and the resulting file was verified with `file` as a WebAssembly binary.
- `go`, `oras`, `istioctl`, and `wasm-opt` were not installed in the local workspace, so those commands were validated against official documentation rather than executed locally.
- The OCI packaging example uses the Wasm layer media type commonly used for Envoy/Istio Wasm modules. For production distribution, teams may also want to include runtime config metadata and digest pinning.
