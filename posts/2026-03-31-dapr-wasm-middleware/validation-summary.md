# Validation Summary: How to Use Wasm Middleware in Dapr

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Dapr (sidecar HTTP middleware pipeline)
- WebAssembly (Wasm)
- http-wasm HTTP Handler ABI
- http-wasm-guest-tinygo SDK
- TinyGo (Wasm compilation)
- wazero (WebAssembly runtime)

## Sources Consulted
- Dapr Wasm middleware official docs: https://docs.dapr.io/reference/components-reference/supported-middleware/middleware-wasm/
- Dapr components-contrib Wasm middleware source: https://github.com/dapr/components-contrib/tree/master/middleware/http/wasm
- Official Dapr Wasm example guest module: https://github.com/dapr/components-contrib/blob/master/middleware/http/wasm/example/router.go
- http-wasm project: https://http-wasm.io/
- http-wasm HTTP Handler ABI spec: https://http-wasm.io/http-handler-abi/
- http-wasm-guest-tinygo SDK: https://github.com/http-wasm/http-wasm-guest-tinygo
- http-wasm-host-go (used by Dapr): https://github.com/http-wasm/http-wasm-host-go
- wazero WebAssembly runtime: https://wazero.io/

## Issues Found

1. **TinyGo code example was completely fabricated.** The original showed a fictional low-level ABI with `malloc`, `unsafe.Pointer` memory manipulation, and a `handle_request(ptr, size uint32) uint64` function signature. Dapr's Wasm middleware uses the http-wasm HTTP Handler ABI, and the correct way to write a guest is with the `http-wasm-guest-tinygo` SDK using `handler.HandleRequestFn` with high-level `api.Request` and `api.Response` objects. Replaced the entire code example with a correct implementation based on the official Dapr example.

2. **Rust code example was fabricated.** The original showed a `#[no_mangle] pub fn handle_request(ptr: *mut u8, len: usize) -> u64` function that does not correspond to any real ABI. There is no official http-wasm guest SDK for Rust. Replaced the Rust section with a "Language Support" section that accurately describes which languages have official guest SDKs (currently only TinyGo).

3. **TinyGo compile command was missing required flags.** The original command was missing `-scheduler=none` and `--no-debug` flags, which are recommended/required for correct Wasm output in the Dapr context. Added these flags.

4. **Language support claims were overstated.** The introduction claimed support for "Go, Rust, C, TinyGo" and the benefits section listed "Go, Rust, C, or AssemblyScript." In reality, only TinyGo has an official http-wasm guest SDK. Corrected these claims throughout the post.

5. **No mention of http-wasm.** The post never mentioned http-wasm or the http-wasm HTTP Handler ABI, which is the fundamental technology underpinning Dapr's Wasm middleware. Added references to http-wasm in the introduction, code example section, and summary.

6. **Introduction updated** to mention http-wasm, the wazero runtime, and correct language support information.

7. **Summary updated** to accurately describe the workflow using http-wasm-guest-tinygo SDK rather than claiming any Wasm-compatible language works.

## Review Notes
- The `guestConfig` metadata field (an optional string passed to the Wasm guest module) is not documented in the blog post. This is a minor omission that could be added in a future update.
- The http-wasm project may add guest SDKs for additional languages (Rust, AssemblyScript, etc.) in the future. If that happens, the language support section should be updated.
- The Dapr Wasm middleware component is marked as stable (v1) in the Dapr component spec.
