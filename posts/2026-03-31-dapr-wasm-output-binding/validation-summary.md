# Validation Summary: How to Use Dapr Wasm Output Binding

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Dapr (Distributed Application Runtime)
- WebAssembly (Wasm) / WASI
- Dapr output bindings (`bindings.wasm`)
- Rust / TinyGo (Wasm compilation)
- Node.js Dapr SDK (`@dapr/dapr`)

## Sources Consulted
- Dapr official docs: Wasm output binding reference (`dapr/docs` repo, `daprdocs/content/en/reference/components-reference/supported-bindings/wasm.md`)
- Dapr components-contrib source code: `bindings/wasm/output.go`, `common/wasm/wasm.go`, `common/wasm/wasm_test.go`
- Dapr component registration: `dapr/dapr` repo, `cmd/daprd/components/bindings_webassembly.go`
- Dapr JS SDK source: `dapr/js-sdk` repo, `src/interfaces/Client/IClientBinding.ts`

## Issues Found

1. **OCI URL support claimed but not implemented**: The post stated that OCI URLs (`oci://ghcr.io/...`) are supported for referencing remote Wasm files. The source code shows this returns a `"TODO oci"` error — OCI support is not yet implemented. Changed the example to use an HTTP URL instead.

2. **Wrong Wasm compilation target and module pattern**: The post showed compiling a Rust module with `wasm32-unknown-unknown` using a simple `#[no_mangle] pub extern "C" fn transform(value: i32) -> i32` pattern. The Dapr Wasm binding requires WASI-compatible modules — it executes the `_start` entry point (i.e., `main` function), passes request data via STDIN, and captures output from STDOUT. Replaced with a correct TinyGo WASI example and updated the Rust target to `wasm32-wasip1`.

3. **Non-existent `function-name` metadata field**: The post showed passing `{ "function-name": "transform" }` as per-request metadata. This field does not exist in the Dapr Wasm binding. The only supported per-request metadata field is `args` (comma-separated CLI arguments passed as `os.Args`). Replaced with a correct `args` metadata example.

## Review Notes
- The component type (`bindings.wasm`), `url` metadata field, `file://` prefix, `execute` operation, and Node.js SDK API (`client.binding.send()`) are all correct.
- The `strictSandbox` component metadata option exists but is not mentioned in the post — this could be a useful addition in a future update.
- OCI URL support appears to be planned but not yet implemented in the Dapr components-contrib codebase.
