# Validation Summary: How to Create WASM Modules with Rust

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Rust (edition 2021)
- WebAssembly (WASM, wasm32-unknown-unknown target)
- wasm-pack
- wasm-bindgen 0.2
- console_error_panic_hook
- serde / serde_json
- wasm-opt (binaryen)
- Node.js
- HTML/JavaScript ES modules

## Sources Consulted
- wasm-bindgen documentation: https://docs.rs/wasm-bindgen/latest/wasm_bindgen/
- wasm-bindgen guide: https://rustwasm.github.io/wasm-bindgen/
- wasm-pack documentation: https://rustwasm.github.io/wasm-pack/
- serde-wasm-bindgen crate: https://crates.io/crates/serde-wasm-bindgen
- Rust `rustup` target documentation
- Binaryen / wasm-opt documentation

## Issues Found
- **Deprecated and unused `serde-serialize` feature**: In the "Advanced: Working with Complex Types" section, the Cargo.toml snippet enabled `wasm-bindgen = { version = "0.2", features = ["serde-serialize"] }`. The `serde-serialize` feature is deprecated in current wasm-bindgen (the docs explicitly say to use the `serde-wasm-bindgen` crate instead). Additionally, the example code does not actually use any APIs gated by that feature — it uses `serde_json::from_str` and `serde_json::to_string` directly on `&str`/`String` types. Fixed by removing the unused (and deprecated) feature flag, leaving `wasm-bindgen = "0.2"`.

## Review Notes
- The `cargo install wasm-pack` instruction works, though the wasm-pack project also recommends a curl-based installer. Either is fine.
- The `fibonacci` function logic was traced and is correct: fib(0)=0, fib(1)=1, fib(2)=1, fib(3)=2, etc. `fib(40) = 102334155` fits comfortably in `u64`.
- `#[wasm_bindgen(start)]` on a `fn() -> ()` is valid usage.
- `crate-type = ["cdylib", "rlib"]` and the release profile settings (`opt-level = "z"`, `lto = true`, `codegen-units = 1`) match current wasm-pack/Rust best practices for size-optimized WASM.
- All four `wasm-pack build --target` values (`web`, `bundler`, `nodejs`, `no-modules`) are valid.
- The `pkg/` output filenames listed (hyphens converted to underscores) match what wasm-pack actually generates for a crate named `rust-wasm-demo`.
- For u64 return values, wasm-bindgen converts to JavaScript `BigInt`. The Node.js example template-literal interpolation (`${wasmResult}`) handles BigInt correctly.
- The comment "Vec<T> becomes a typed array in JavaScript" attached to a `&[i32]` parameter is slightly imprecise (slices of primitive numeric types map to typed arrays; only Vecs of those primitive types do too — Vecs of other types become regular JS arrays). This is a minor wording nit, not a technical error, so it was left as-is per the "no stylistic changes" rule.
- Future maintenance: if the author wants to demonstrate richer Rust↔JS struct interop, switching the Advanced section from manual `serde_json` strings to the `serde-wasm-bindgen` crate (with `serde_wasm_bindgen::to_value` / `from_value`) would be the modern idiomatic approach.
