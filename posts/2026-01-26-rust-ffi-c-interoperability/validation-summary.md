# Validation Summary: How to Use Rust FFI for C Interoperability

## Status
validated

## Post Type
Technical tutorial / guide

## Technologies Covered
- Rust
- Rust FFI
- C ABI interoperability
- C strings and raw pointers
- Cargo build scripts and native linking
- bindgen
- zlib
- Unsafe Rust

## Sources Consulted
- Rust Reference: External blocks - https://doc.rust-lang.org/reference/items/external-blocks.html
- Rust Edition Guide: Unsafe extern blocks - https://doc.rust-lang.org/edition-guide/rust-2024/unsafe-extern.html
- Rust Edition Guide: Unsafe attributes - https://doc.rust-lang.org/edition-guide/rust-2024/unsafe-attributes.html
- Rust Reference: Type layout and `repr(C)` - https://doc.rust-lang.org/reference/type-layout.html#the-c-representation
- Rust standard library: `std::ffi` module and C type aliases - https://doc.rust-lang.org/std/ffi/
- Rust standard library: `CString` and `CStr` - https://doc.rust-lang.org/std/ffi/struct.CString.html
- Rust standard library: `PhantomData` - https://doc.rust-lang.org/std/marker/struct.PhantomData.html
- Rust Unstable Book: `negative_impls` - https://doc.rust-lang.org/unstable-book/language-features/negative-impls.html
- Cargo Reference: Build scripts - https://doc.rust-lang.org/cargo/reference/build-scripts.html
- bindgen User Guide - https://rust-lang.github.io/rust-bindgen/
- zlib Manual - https://zlib.net/manual.html
- Local compiler checks with `rustc 1.93.0` using Rust 2024 syntax.

## Issues Found
- Updated foreign function declaration blocks from `extern "C"` to `unsafe extern "C"` to match Rust 2024 requirements and current Rust Reference guidance.
- Updated exported Rust functions from `#[no_mangle]` to `#[unsafe(no_mangle)]`, because `no_mangle` is an unsafe attribute in Rust 2024.
- Corrected the explanation that Rust and C can interoperate when both sides use a compatible ABI, rather than implying that Rust and C always share calling conventions.
- Corrected the C string explanation from "length-prefixed UTF-8" to Rust strings storing their length explicitly, matching the standard library documentation.
- Fixed a missing `c_int` import in the C string example.
- Corrected the type-mapping diagram label for `c_long` so it no longer implies `long` maps to `isize`; `c_long` is platform-specific and commonly differs between Unix-like systems and Windows.
- Replaced unstable `impl !Send` / `impl !Sync` examples with a stable marker-field approach and updated the safety guideline wording accordingly.
- Fixed the callback wrapper example so boxed callback state is stored and released when replaced or when the handle is dropped, avoiding a memory leak.
- Fixed the Rust-owned buffer transfer example so it returns a `#[repr(C)]` buffer containing pointer, length, and capacity; the matching free function can now reconstruct the `Vec` correctly.
- Removed unused imports from examples after the code corrections.

## Review Notes
- The examples remain illustrative and still require the referenced C functions or native libraries to be present at link time.
- The zlib example's compressed-size assertion was checked against the specific repeated string used in the post and is valid for that example.
