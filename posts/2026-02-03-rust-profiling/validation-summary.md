# Validation Summary: How to Profile Rust Applications for Performance

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Rust (cargo, RUSTFLAGS, release profile configuration)
- Linux `perf` profiler
- `cargo-flamegraph`
- `rustfilt` (Rust symbol demangler)
- Criterion benchmarking framework (v0.5)
- DHAT (Dynamic Heap Analysis Tool) — `dhat` crate v0.3
- Valgrind / Massif (`ms_print`)
- heaptrack / heaptrack-gui
- `rustc_hash::FxHashMap`
- Rayon (parallel iterators)
- Profile-Guided Optimization (PGO) via `llvm-profdata`
- `cargo-bloat`

## Sources Consulted
- Rust std HashMap documentation: https://doc.rust-lang.org/std/collections/struct.HashMap.html
- rustc Profile-Guided Optimization guide: https://doc.rust-lang.org/rustc/profile-guided-optimization.html
- Criterion.rs HTML report docs: https://bheisler.github.io/criterion.rs/book/user_guide/html_report.html
- Criterion 0.5 API docs: https://docs.rs/criterion/0.5.1/criterion/
- perf-record man page: https://man7.org/linux/man-pages/man1/perf-record.1.html
- flamegraph-rs README: https://github.com/flamegraph-rs/flamegraph
- rustc codegen options: https://doc.rust-lang.org/rustc/codegen-options/index.html
- dhat crate docs: https://docs.rs/dhat/latest/dhat/

## Issues Found
1. **HashMap default hasher described as "cryptographically secure"** — The Rust standard library's default hasher is SipHash 1-3, which is HashDoS-resistant, not cryptographically secure. Corrected the comment to "Default hasher (SipHash 1-3) is HashDoS-resistant but slow for non-adversarial data". Also removed unused `BuildHasherDefault` and `Hasher` imports from the example to make it compile cleanly.

2. **PGO workflow missing the `llvm-profdata merge` step** — The post jumped directly from running the instrumented binary to building with `-Cprofile-use`. Per the official rustc PGO guide, raw `.profraw` files must be merged into a single `.profdata` file with `llvm-profdata merge` before `-Cprofile-use` can consume them. Added the merge step and updated `-Cprofile-use` to point at `merged.profdata` in both the main PGO section and the Quick Reference block at the end of the post.

3. **`cargo bench -- --verbose` described as generating an HTML report** — Criterion automatically generates HTML reports at `target/criterion/report/index.html` when the `html_reports` feature is enabled (which the post already enables). The `--verbose` flag controls log verbosity, not HTML output. Replaced the misleading command with a comment clarifying that HTML reports are produced automatically by plain `cargo bench`.

4. **`perf record` comment claimed "30 seconds"** — The shown command has no duration flag; perf records for the lifetime of the spawned process. Reworded the comment to accurately reflect that behavior.

## Review Notes
- `criterion::black_box` is still re-exported in criterion 0.5, but `std::hint::black_box` (stable since Rust 1.66) is the more forward-compatible choice. Left the example using `criterion::black_box` since it remains valid.
- The `-g` flag on `perf record` is redundant when `--call-graph dwarf` is also specified, but harmless. Left as-is to preserve author style.
- The "O(n^2) string building" claim for the `+` operator on String is a slight oversimplification (it is amortized O(n) in practice due to the underlying Vec's doubling growth, though it triggers reallocations that the pre-allocated version avoids). The point about pre-allocation being faster is still correct, so the example was left alone.
- The "Boxing Small Values" example reuses the `Config` struct name twice; this would not compile in the same scope, but the snippet is clearly presenting a before/after contrast, so it was left as-is.
- The first build code block lists `cargo build --release` twice (once labeled "Release build" and once "Release with debug symbols"); the actual mechanism for keeping debug symbols is the `Cargo.toml` change shown directly below it. Slightly misleading but not technically wrong, so left untouched.
