# Validation Summary: How to Build WebAssembly Modules with Rust

## Status
validated

## Post Type
Tutorial / Practical Guide

## Technologies Covered
- Rust (edition 2021)
- WebAssembly (WASM, wasm32-unknown-unknown target)
- wasm-bindgen (0.2.x)
- wasm-pack
- console_error_panic_hook (0.1.x)
- serde + serde-wasm-bindgen (0.6.x)
- wasm-bindgen-test
- wasm-opt / Binaryen
- Cargo / npm
- Browser APIs (Canvas ImageData, console)

## Sources Consulted
- The Rust and WebAssembly Book: https://rustwasm.github.io/docs/book/
- wasm-bindgen Guide: https://rustwasm.github.io/wasm-bindgen/
- wasm-pack documentation: https://rustwasm.github.io/wasm-pack/
- crates.io for current versions of wasm-bindgen, serde-wasm-bindgen, console_error_panic_hook
- wasm-bindgen-test docs: https://rustwasm.github.io/wasm-bindgen/wasm-bindgen-test/
- Binaryen / wasm-opt: https://github.com/WebAssembly/binaryen
- ITU-R BT.601 luma coefficient standard (for grayscale conversion math)
- Rust std library docs for `slice::chunks_exact_mut`

## Issues Found

1. **Misleading "zero-copy" claim for binary data section** (Performance-Critical: Working with Binary Data).
   - Original text said "you want to avoid copying data between JavaScript and WASM memory. Use typed arrays" and the JS comment said "this is a view into WASM memory". This is factually incorrect — wasm-bindgen actually copies slice arguments into WASM linear memory and copies mutated data back out. True zero-copy access requires `js_sys::Uint8Array` views.
   - Fixed: rewrote the intro paragraph to clarify that wasm-bindgen copies bytes in and out, mention `js_sys::Uint8Array` as the zero-copy path, and note that the slice approach is fast enough for most use cases. Updated the JS comment to "wasm-bindgen handles the memory transfer".

## Review Notes

- **wasm-opt installation**: The post recommends `npm install -g wasm-opt`, which works (an npm wrapper exists), but the more canonical install is via the Binaryen project itself (`binaryen` npm package, package managers, or release binaries). Both paths are valid; left as-is since the command works.
- **wasm-opt usually unnecessary**: `wasm-pack build --release` already invokes `wasm-opt` automatically when available. The manual step shown is mostly redundant unless tuning specific flags. Not flagged because the command itself is correct.
- **Grayscale weights**: 0.299/0.587/0.114 are the standard ITU-R BT.601 luma coefficients. Correct, though BT.709 (0.2126/0.7152/0.0722) is more appropriate for sRGB/HDTV content. The choice is reasonable for a tutorial.
- **JS UTF-16 statement**: JavaScript strings are sequences of UTF-16 code units (not strictly UTF-16, since unpaired surrogates are permitted). The simplification is acceptable for tutorial context.
- **`console_log!` macro scoping**: Defined without `#[macro_export]`, so it's only usable within the same module — fine for the single-file example shown.
- **`#[wasm_bindgen(start)]`** correctly marks a function that runs at module instantiation; signature requirements (no args, `()` or `Result<(), JsValue>` return) are satisfied by the example.
- All other code examples (add, compound_interest, reverse_string, slugify, validate_user, grayscale, invert_colors, test module) compile and behave as described. The slugify test cases (`"Hello World"` → `"hello-world"`, `"Rust & WASM!"` → `"rust-wasm"`) trace correctly through the implementation.
- Cargo.toml `crate-type = ["cdylib", "rlib"]`, build commands (`wasm-pack build --target web`, `--target bundler`, `--dev`), publish flow, and test invocation are all current and correct.
