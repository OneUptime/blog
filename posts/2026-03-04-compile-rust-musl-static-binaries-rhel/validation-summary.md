# Validation Summary: How to Compile Rust Applications with musl for Static Binaries on RHEL

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Red Hat Enterprise Linux
- Rust
- Cargo
- rustup
- musl libc
- Static linking
- reqwest
- rustls
- OpenSSL
- Docker scratch images

## Sources Consulted
- Rust rustup book, cross-compilation: https://rust-lang.github.io/rustup/cross-compilation.html
- Rust rustc book, platform support: https://doc.rust-lang.org/rustc/platform-support.html
- Rust Cargo book, configuration: https://doc.rust-lang.org/stable/cargo/reference/config.html
- Rust rustc book, codegen options: https://doc.rust-lang.org/rustc/codegen-options/
- Rust standard library, TcpListener: https://doc.rust-lang.org/std/net/struct.TcpListener.html
- reqwest TLS documentation: https://docs.rs/reqwest/latest/reqwest/tls/
- reqwest feature flags: https://docs.rs/crate/reqwest/latest/features
- openssl crate build documentation: https://docs.rs/openssl/latest/openssl/
- Fedora packages, musl-gcc: https://packages.fedoraproject.org/pkgs/musl/musl-gcc/
- Fedora packages, musl-libc-static: https://packages.fedoraproject.org/pkgs/musl/musl-libc-static/epel-10.0.html
- Docker documentation, base images and scratch: https://docs.docker.com/build/building/base-images/

## Issues Found
- The post claimed the resulting binary would run on any Linux distribution. I narrowed this to compatible Linux systems of the same architecture, because the Rust target is specifically `x86_64-unknown-linux-musl` and platform support is target- and architecture-specific.
- The TLS example used `reqwest` 0.11 with the older `rustls-tls` feature. I updated it to current `reqwest` 0.13 syntax with the `rustls` feature.
- The OpenSSL static-linking example installed RHEL `openssl-static` and pointed `OPENSSL_DIR` at `/usr`, which is not a musl OpenSSL toolchain. I replaced it with the `openssl` crate's `vendored` feature, which builds and statically links OpenSSL from source as documented by the crate.

## Review Notes
The core Cargo, rustup, musl target, `.cargo/config.toml`, `file`, and `ldd` workflow is technically sound for a simple Rust application. Applications with extra C dependencies may still need target-compatible C libraries or crate-specific static build features.
