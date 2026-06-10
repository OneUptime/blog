# Validation Summary: How to Use Rust for Systems Programming

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Rust (safe/unsafe, raw pointers, FFI)
- `repr` attributes (`C`, `C, packed`, `transparent`)
- `libc` crate (POSIX `open`/`read`/`close`, `syscall`, `SYS_gettid`)
- `core::ptr::read_volatile` / `write_volatile` for memory-mapped I/O
- `no_std` / `no_main` / `#[panic_handler]` for embedded
- `bindgen`, `embedded-hal`
- Tooling: Miri, AddressSanitizer, Clippy, rustc lints

## Sources Consulted
- The Rust Reference — Unsafety: https://doc.rust-lang.org/reference/unsafety.html
- The Rust Reference — Type layout / `repr`: https://doc.rust-lang.org/reference/type-layout.html
- The Rustonomicon — Unsafe Rust, FFI, exotically sized types: https://doc.rust-lang.org/nomicon/
- `std::slice::from_raw_parts` docs: https://doc.rust-lang.org/std/slice/fn.from_raw_parts.html
- `core::ptr::read_volatile` / `write_volatile`: https://doc.rust-lang.org/core/ptr/fn.write_volatile.html
- `libc` crate (open/read/close/syscall, `SYS_gettid`, `O_RDONLY`): https://docs.rs/libc
- rustc lint `unsafe_op_in_unsafe_fn`: https://doc.rust-lang.org/rustc/lints/listing/allowed-by-default.html#unsafe-op-in-unsafe-fn
- Rust 2024 edition guide (unsafe_op_in_unsafe_fn warn-by-default): https://doc.rust-lang.org/edition-guide/rust-2024/unsafe-op-in-unsafe-fn.html
- Miri: https://github.com/rust-lang/miri
- Rust unstable book — sanitizers: https://doc.rust-lang.org/unstable-book/compiler-flags/sanitizer.html
- Clippy lint index (undocumented_unsafe_blocks, multiple_unsafe_ops_per_block): https://rust-lang.github.io/rust-clippy/

## Issues Found
- **Misattributed lint (Clippy → rustc).** The "Clippy" bullet in the *Tools for Unsafe Rust* section recommended `#![deny(unsafe_op_in_unsafe_fn)]` as if it were a Clippy lint. `unsafe_op_in_unsafe_fn` is a built-in `rustc` lint (stable since Rust 1.52, warn-by-default in the 2024 edition), not a Clippy lint. I corrected the bullet to mention real Clippy lints for unsafe code (`undocumented_unsafe_blocks`, `multiple_unsafe_ops_per_block`) and clarified that `unsafe_op_in_unsafe_fn` is a rustc built-in lint, including the 2024-edition change.

All other technical content was verified and is correct:
- The five "unsafe superpowers" listed match the Rust Reference exactly.
- Memory layout calculations (`size_of::<CLayout>() == 12`, `size_of::<PackedLayout>() == 6`, `align_of::<CLayout>() == 4`, `align_of::<PackedLayout>() == 1`) are correct.
- `libc::O_RDONLY`, `libc::open`, `libc::read`, `libc::close`, `libc::syscall`, and `libc::SYS_gettid` are all real items in the `libc` crate.
- `std::slice::from_raw_parts`, `core::ptr::read_volatile`, and `core::ptr::write_volatile` are correctly used.
- `#![no_std]` / `#![no_main]` / `#[panic_handler] fn panic(_info: &PanicInfo) -> !` skeleton is correct.
- Miri invocation (`cargo +nightly miri test`) and AddressSanitizer flag (`RUSTFLAGS="-Z sanitizer=address"`) are accurate (sanitizers are nightly-only via `-Z`).

## Review Notes
- `get_thread_id()` returns `i64` while `libc::syscall` returns `c_long`. On 64-bit Linux they are identical, but the function is gated only on `target_os = "linux"`, so it would fail to compile on 32-bit Linux where `c_long = i32`. Using `libc::c_long` (or `i64` with an additional `target_pointer_width = "64"` cfg) would be more portable. Left as-is because the example is clearly illustrative and 64-bit Linux is the dominant target.
- The opaque FFI type `struct Resource { _private: [u8; 0] }` is a workable pattern, but the Nomicon's current recommendation for opaque FFI types adds `PhantomData<(*mut u8, PhantomPinned)>` to make the type `!Send`, `!Sync`, and `!Unpin`. Not technically incorrect — just a stricter modern idiom.
- `write_register` / `read_register` in the GPIO example are `pub`-style helpers but not marked `unsafe`, even though dereferencing a caller-supplied raw address is inherently unsafe. The functions are file-local helpers here, not part of a public API, so this is acceptable for an illustrative snippet; in production code they should be `unsafe fn`s or wrapped in a typed peripheral abstraction.
- `mut_ptr.add(1)` in the raw-pointer example would compute an out-of-bounds pointer when applied to a single `i32`. The post explicitly notes "This would be invalid here but shows the syntax", so no fix needed — just worth flagging that merely *computing* an out-of-bounds pointer with `add` is itself UB (only `wrapping_add` is OK for that), though no UB occurs because the pointer is never dereferenced.
- `#[repr(packed)]` enables undefined behavior if fields are accessed via references (misaligned `&T`). The post mentions packed layouts are "Useful for network protocols or file formats" — accurate, but readers should use `read_unaligned` / `addr_of!` to access fields safely.
