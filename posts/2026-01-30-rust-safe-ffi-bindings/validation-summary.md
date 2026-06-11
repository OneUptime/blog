# Validation Summary: How to Create Safe FFI Bindings in Rust

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Rust (FFI, extern "C", unsafe code, Drop trait, ManuallyDrop)
- C interoperability (calling conventions, opaque types, null-terminated strings)
- `std::os::raw` C-compatible type aliases
- `std::ffi` (CStr, CString)
- bindgen 0.69 (automatic binding generation, allowlist/blocklist, derive options)
- Cargo build scripts (`build.rs`, `cargo:rustc-link-*` directives)
- pkg-config crate for library discovery

## Sources Consulted
- The Rustonomicon, FFI chapter: https://doc.rust-lang.org/nomicon/ffi.html
- The Rust Reference, type layout (bool / _Bool ABI compatibility): https://doc.rust-lang.org/reference/types/boolean.html
- std::ffi::CString / CStr documentation: https://doc.rust-lang.org/std/ffi/
- std::os::raw documentation: https://doc.rust-lang.org/std/os/raw/
- std::mem::ManuallyDrop documentation: https://doc.rust-lang.org/std/mem/struct.ManuallyDrop.html
- Vec::from_raw_parts / Vec::into_raw_parts documentation: https://doc.rust-lang.org/std/vec/struct.Vec.html
- bindgen user guide and changelog: https://rust-lang.github.io/rust-bindgen/
- Cargo book, build scripts reference: https://doc.rust-lang.org/cargo/reference/build-scripts.html
- pkg-config crate: https://docs.rs/pkg-config/

## Issues Found
- **`TransferableBuffer::into_raw_parts` did not return capacity.** The original signature was `(*mut u8, usize)` but the paired `from_raw_parts` required `(ptr, len, cap)` to call `Vec::from_raw_parts`. Without the capacity, the round trip is unsound: `Vec::from_raw_parts` requires the original capacity to deallocate correctly, and using `len` in its place is undefined behavior whenever the Vec was over-allocated (the typical case for any `push`-grown vector). Fixed the return type to `(*mut u8, usize, usize)` and added `me.data.capacity()`. Also removed the redundant `std::mem::forget(std::mem::take(&mut me.data))` — `ManuallyDrop::new(self)` already prevents the inner `Vec` from being dropped, so the take/forget pair was unnecessary noise. Updated the doc comments to reflect the new signatures.

## Review Notes
- The `bool` / C99 `_Bool` ABI compatibility claim is correct per the current Rust Reference.
- The `extern "C" { ... }` blocks without the `unsafe` keyword are valid in Rust 2021 and earlier editions. Rust 2024 will require `unsafe extern "C" { ... }`, so authors targeting the 2024 edition will need to update these blocks. Not changed since no edition was specified in the post.
- `bindgen` 0.69 still accepts `size_t_is_usize(true)`, but the option has been the default since bindgen 0.65, so the explicit call is redundant. Left as-is for clarity.
- `bindgen` has had newer releases (0.70+) since this post was written. The 0.69 API used (allowlist/blocklist/derive_* methods, `rustified_enum`, `clang_arg`) remains valid in newer versions.
- The opaque-type pattern `_private: [u8; 0]` is the common stable idiom. Strictly the Nomicon also recommends adding a `PhantomData<(*mut u8, PhantomPinned)>` marker to make the type `!Send + !Sync + !Unpin` by default; the post instead makes those properties explicit by `unsafe impl Send`/`Sync` on the wrapper, which is acceptable.
- The unstable `Vec::into_raw_parts` in std is unrelated — the post defines a method with the same name on its own type, which is fine.
- Minor unused imports exist in some illustrative snippets (`use std::ptr;` in the database example, `use super::*;` in the `ffi` module bringing in items not all referenced). These produce compiler warnings but are not correctness issues; left untouched per the "only fix technical errors" guidance.
- `ResourceHandle` is referenced in the third error-handling pattern without being defined locally; it is clearly meant as an illustrative snippet and the surrounding prose makes this clear.
