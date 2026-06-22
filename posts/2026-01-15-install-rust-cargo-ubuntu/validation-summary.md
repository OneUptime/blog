# Validation Summary: How to Install Rust and Cargo on Ubuntu

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Rust (programming language)
- Cargo (build system & package manager)
- rustup (toolchain installer)
- rustc (compiler), rustfmt, clippy, rust-analyzer
- Ubuntu / apt (build-essential, curl, pkg-config, libssl-dev)
- Cross-compilation targets (Linux gnu/musl, Windows gnu/msvc, macOS, WebAssembly, embedded)
- Cargo subcommands (cargo-edit, cargo-watch, cargo-audit, cargo-nextest, cargo-make, etc.)
- VS Code + rust-analyzer / CodeLLDB

## Sources Consulted
- Live verification against the locally installed toolchain (rustc/cargo/rustup 1.93.0, 2026-01-19)
- The Rust Programming Language & Cargo reference — https://doc.rust-lang.org/cargo/reference/manifest.html
- rustup book — https://rust-lang.github.io/rustup/
- Rust editions guide (edition 2024 stabilized in Rust 1.85) — https://doc.rust-lang.org/edition-guide/
- `unconditional_panic` lint behavior (verified via rustc)
- WASI target rename `wasm32-wasi` → `wasm32-wasip1` — verified via `rustc --print target-list` and `rustup target list`
- Compiled & executed the full lib.rs and complete main.rs examples to confirm they build, lint, and run

## Issues Found
1. **`#[should_panic]` example did not compile.** The test used `let _ = 10 / 0;`. Division of literal constants is caught at compile time by the deny-by-default `unconditional_panic` lint, so the code (and even a `let divisor = 0;` variant, due to const propagation) fails to build. Fixed by hiding the divisor behind `std::hint::black_box(0)` so the division happens at runtime and the test genuinely panics with "attempt to divide by zero". Verified the fixed test compiles and passes.
2. **Outdated edition claim.** The Cargo.toml comment stated "2021 is the current edition." As of Rust 1.85 (Feb 2025) the latest edition is 2024, and `cargo new` now defaults to `edition = "2024"`. Updated the comment to note 2024 is the latest edition while keeping `edition = "2021"` in the example (2021 is still fully supported and is consistent with the example's `rust-version = "1.70"`, since edition 2024 would require Rust 1.85+).
3. **Incorrect comment on `rustc --print target-list`.** It was labeled "Show current default target," but that command lists *all* known targets. Added `rustc -vV | grep host` (the correct way to show the host/default target) and relabeled the existing command as listing all targets.
4. **Removed WASI target name.** `rustup target add wasm32-wasi` would now fail — the target was renamed to `wasm32-wasip1` and the old name no longer appears in the target list. Updated to `wasm32-wasip1`.
5. **Misleading `rustup override set` comment.** It claimed the command "Creates a rust-toolchain.toml file or uses rustup override." It does not create any file; it records the override in rustup's internal settings. Corrected the comment.

## Review Notes
- The full `main.rs` "Complete Project" example and the `lib.rs`/tests examples were extracted and compiled successfully; the binary runs and its output matches the inline comments (e.g. `Even squares: [4, 16, 36, 64, 100]`, `Sum: 55`).
- The complete example emits benign warnings (unused `io::Write` import; `remove`/`is_empty` methods never used in the demo). These are illustrative-code warnings, not correctness errors, so they were left as-is to avoid over-editing.
- All rustup/cargo commands, flags, version-requirement syntax (caret/tilde/wildcard), dependency manifest forms (git/path/optional/features, `dep:` syntax), build profiles, target triples, VS Code extension IDs, and the rust-analyzer release URL were checked and are accurate.
- Minor version caveat: example outputs (e.g. `rustc 1.75.0`) are illustrative snapshots and will naturally lag the installed toolchain; left unchanged as they are clearly labeled "Example output."
