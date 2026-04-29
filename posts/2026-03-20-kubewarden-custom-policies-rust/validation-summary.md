# Validation Summary: How to Write Custom Kubewarden Policies in Rust

## Status
validated

## Post Type
Guide

## Technologies Covered
- Kubewarden
- Kubernetes admission policies
- Rust
- WebAssembly / WASI
- `kwctl`
- OCI registries

## Sources Consulted
- Kubewarden Rust tutorial intro: https://docs.kubewarden.io/tutorials/writing-policies/rust/intro-rust
- Kubewarden Rust validation tutorial: https://docs.kubewarden.io/tutorials/writing-policies/rust/write-validation-logic
- Kubewarden Rust build and distribution tutorial: https://docs.kubewarden.io/tutorials/writing-policies/rust/build-and-distribute
- Kubewarden `kwctl` CLI reference: https://docs.kubewarden.io/reference/kwctl-cli
- Kubewarden `kwctl` install guide: https://docs.kubewarden.io/howtos/install-kwctl
- Kubewarden CRD reference: https://docs.kubewarden.io/reference/CRDs
- Official Kubewarden Rust policy template: https://github.com/kubewarden/rust-policy-template
- Official Kubewarden Rust SDK source: https://github.com/kubewarden/policy-sdk-rust
- Kubernetes container image reference documentation: https://v1-33.docs.kubernetes.io/docs/concepts/containers/images/
- `cargo-generate` project documentation: https://github.com/cargo-generate/cargo-generate

## Issues Found
- The post used the deprecated `wasm32-wasi` target. Updated all references to `wasm32-wasip1`, which is what current Kubewarden Rust docs use.
- The `kwctl` installation example used an outdated Linux release asset name and skipped the archive extraction step. Updated it to the current official Linux x86_64 installation flow.
- The scaffold tool installation command was incorrect. Replaced `cargo install --git https://github.com/kubewarden/cargo-generate-kubewarden` with the current `cargo install cargo-generate`.
- The generated project structure shown in the post did not match the current official Rust template. Corrected it to the `test_data/` layout used by the template.
- The “Understanding the Entry Point” snippet used an outdated direct exported `validate` function signature. Replaced it with the current waPC `wapc_init` registration pattern used by Kubewarden Rust policies.
- The main policy example did not use the current SDK parsing flow, omitted the `k8s_openapi::Resource` trait import needed for `Pod::KIND`, and defined `allowed_namespaces` settings without actually applying them. Updated the code to use `ValidationRequest::new(payload)?`, imported `Resource`, and enforced the namespace allowlist.
- The image-tag detection logic was incomplete: it failed for untagged images hosted on registries with explicit ports such as `registry.example.com:5000/nginx`, and the text claimed broader coverage than the code provided. Updated the logic and clarified the code by checking containers plus init containers.
- The build section used an outdated target path and the wrong `kwctl annotate` flag (`--output`). Updated it to the template’s current `make policy.wasm` flow and the current `--output-path` flag.
- The integration test request payload was malformed for `kwctl run`. `kwctl` expects a Kubernetes `AdmissionRequest` JSON object, not a wrapped `{ "request": ... }` payload. Updated the example accordingly and corrected the directory path from `tests/data` to `test_data`.
- The publish example used a push URI without the `registry://` scheme. Updated it to match the current `kwctl push` CLI reference.

## Review Notes
- Verified the corrected Rust sample by compiling a throwaway copy of the official template with `cargo test` and `cargo build --target wasm32-wasip1 --release` on 2026-04-29.
- The manual `kwctl` install snippet is Linux x86_64-specific. The official install guide documents other platforms and package-manager options.
