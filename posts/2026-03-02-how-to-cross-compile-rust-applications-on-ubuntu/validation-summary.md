# Validation Summary: How to Cross-Compile Rust Applications on Ubuntu

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Rust
- rustup
- Cargo
- cross
- Docker
- Ubuntu apt packages
- musl
- MinGW-w64
- osxcross
- GitHub Actions

## Sources Consulted
- Rustup Book: Cross-compilation - https://rust-lang.github.io/rustup/cross-compilation.html
- Cargo Book: Configuration - https://doc.rust-lang.org/cargo/reference/config.html
- Cargo Book: Platform-specific dependencies - https://doc.rust-lang.org/cargo/reference/specifying-dependencies.html#platform-specific-dependencies
- cross-rs/cross README - https://github.com/cross-rs/cross
- osxcross README - https://github.com/tpoechtrager/osxcross
- GitHub Docs: Store and share data with workflow artifacts - https://docs.github.com/en/actions/tutorials/store-and-share-data
- dtolnay/rust-toolchain README - https://github.com/dtolnay/rust-toolchain
- Ubuntu package metadata and manpages for musl-tools and cross-compiler packages - https://packages.ubuntu.com/ and https://manpages.ubuntu.com/

## Issues Found
- The post said Rust needs a C linker for each target. Updated this to match rustup's documentation more precisely: `rustup target add` installs the target Rust standard library, while additional tools such as a linker are typically still required for these cross targets.
- The Cargo config snippet set `ar = "x86_64-w64-mingw32-ar"`. Cargo documents `target.<triple>.ar` as deprecated and unused, so the line was removed.
- The musl linker was configured as `x86_64-linux-musl-gcc`, but Ubuntu `musl-tools` documents/provides `musl-gcc`. Updated the linker to `musl-gcc` for consistency with Ubuntu.
- The musl portability wording claimed binaries run on any Linux distribution. Softened this to say musl binaries avoid depending on the target system's glibc version, which is the technically relevant portability benefit.
- The osxcross prerequisites were incomplete for Ubuntu compared with the osxcross README. Expanded the apt install command to include the documented build dependencies.
- The osxcross Cargo linker example used fixed `darwin21` linker names and `aarch64-apple-darwin21-clang`. Updated it to use the osxcross-documented `*-apple-darwinXX-clang` pattern, with `arm64-apple-darwinXX-clang` for Apple Silicon and a note to replace `XX` with the version shown by `osxcross-conf`.

## Review Notes
The GitHub Actions example is technically plausible, but real projects may need extra setup for native dependencies, signing/notarization of macOS artifacts, or custom `cross` images for C libraries. The build script is a reasonable example, though its `VERSION` variable is currently unused.
