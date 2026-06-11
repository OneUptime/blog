# Validation Summary: How to Build a Thread Pool in Rust

## Status
validated

## Post Type
Tutorial / Guide — step-by-step implementation walkthrough building a thread pool from scratch in Rust.

## Technologies Covered
- Rust standard library (`std::thread`, `std::sync::mpsc`, `std::sync::{Arc, Mutex}`, `std::panic`)
- `std::panic::catch_unwind` / `AssertUnwindSafe`
- `std::thread::Builder` (named threads, stack size)
- `num_cpus` crate (for default thread count in the builder example)
- Channel-based concurrency primitives (mpsc)

## Sources Consulted
- Rust standard library documentation: https://doc.rust-lang.org/std/
- `std::panic::catch_unwind` — https://doc.rust-lang.org/std/panic/fn.catch_unwind.html
- `std::panic::AssertUnwindSafe` — https://doc.rust-lang.org/std/panic/struct.AssertUnwindSafe.html
- `std::sync::mpsc` — https://doc.rust-lang.org/std/sync/mpsc/index.html
- `std::thread::Builder` — https://doc.rust-lang.org/std/thread/struct.Builder.html
- `std::thread::available_parallelism` — https://doc.rust-lang.org/std/thread/fn.available_parallelism.html
- The Rust Programming Language, Chapter 20 (canonical thread pool implementation): https://doc.rust-lang.org/book/ch20-02-multithreaded.html
- `num_cpus` crate — https://docs.rs/num_cpus
- `tokio::sync::oneshot` (to confirm oneshot terminology) — https://docs.rs/tokio/latest/tokio/sync/oneshot/index.html

## Issues Found
1. **"oneshot channels" misnomer (fixed).** In the "Adding Task Results" section, the post stated: *"We can add a mechanism to return values using oneshot channels."* The implementation actually uses `std::sync::mpsc::channel()`, which is a multi-producer, single-consumer FIFO channel — not a oneshot channel. "Oneshot" is a distinct concept (single-use, one-value channels like `tokio::sync::oneshot` or `futures::channel::oneshot`); the standard library does not provide one. Reworded to: *"We can add a mechanism to return values by giving each task its own mpsc channel that carries a single result."* This preserves the author's intent while accurately describing the primitive used.

## Review Notes
- The implementation follows the canonical Rust Book Chapter 20 pattern, with sensible extensions (builder, panic handling, result channels, tests). All code is syntactically and semantically correct under current stable Rust.
- `catch_unwind(AssertUnwindSafe(job))` where `job: Box<dyn FnOnce() + Send + 'static>` compiles and runs correctly: `Box<dyn FnOnce()>` is callable as `FnOnce()` (stable since Rust 1.35), and `AssertUnwindSafe<F>: FnOnce<()>` when `F: FnOnce<()>`.
- The `receiver.lock().unwrap().recv()` pattern holds the mutex across the blocking `recv()` call (because the temporary `MutexGuard`'s lifetime extends to the end of the statement). The inline comment "The lock is released as soon as we get the job" could be read as imprecise, but this is the same wording used in the official Rust Book, and it is technically true that the lock is released immediately upon the let-binding completing — so it is left unchanged.
- `num_cpus::get()` still works correctly, but since Rust 1.59 (Feb 2022), `std::thread::available_parallelism()` is the standard-library alternative and respects cgroup/CPU-affinity limits. Future versions of this post could mention or prefer it, but using `num_cpus` is not incorrect.
- The `ThreadPoolWithResults` snippet shows only `execute_with_result` and omits its `new()` constructor, relying on the reader to mirror `ThreadPool::new`. This is fine for a tutorial snippet — not a technical error.
- The `use std::sync::mpsc as std_mpsc;` alias inside the result-channel snippet is stylistically unusual (it aliases the same module that was imported earlier as `mpsc`), but it compiles and the code is correct.
- The `mpsc::Receiver<T>` being `Send` but `!Sync`, and thus requiring `Arc<Mutex<...>>` to be shared across worker threads, is correctly applied.
