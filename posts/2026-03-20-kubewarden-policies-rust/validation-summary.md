# Validation Summary: How to Write Custom Kubewarden Policies in Rust - A Practical Guide

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Kubewarden
- Rust
- Kubernetes admission control
- WebAssembly
- WASI
- kwctl
- cargo-generate

## Sources Consulted
- Kubewarden Rust tutorial, "Creating a policy": https://docs.kubewarden.io/tutorials/writing-policies/rust/create-policy
- Kubewarden Rust tutorial, "Writing validation logic": https://docs.kubewarden.io/tutorials/writing-policies/rust/write-validation-logic
- Kubewarden Rust tutorial, "Building and distributing policies": https://docs.kubewarden.io/tutorials/writing-policies/rust/build-and-distribute
- Kubewarden tutorial, "Policy metadata": https://docs.kubewarden.io/tutorials/writing-policies/metadata
- Kubewarden tutorial, "Testing for policy authors": https://docs.kubewarden.io/tutorials/testing-policies/policy-authors
- Kubewarden reference, "kwctl CLI": https://docs.kubewarden.io/reference/kwctl-cli
- Kubewarden how-to, "Installing kwctl": https://docs.kubewarden.io/howtos/install-kwctl
- Rust compiler platform support, `wasm32-wasip1`: https://doc.rust-lang.org/stable/rustc/platform-support/wasm32-wasip1.html
- Kubewarden Rust policy template repository: https://github.com/kubewarden/rust-policy-template
- Kubewarden Rust policy template `Makefile.template`: https://raw.githubusercontent.com/kubewarden/rust-policy-template/main/Makefile.template
- Kubewarden Rust policy SDK docs: https://docs.rs/kubewarden-policy-sdk/latest/kubewarden_policy_sdk/

## Issues Found
- The post used the old Rust target name `wasm32-wasi`. I updated all commands and paths to `wasm32-wasip1`, which is the current Rust target name.
- The prerequisites did not install `cargo-generate`, so `cargo generate` would fail on a standard Rust installation. I added `cargo install cargo-generate`.
- The template repository URL was outdated. I changed `kubewarden/policy-rust-template` to the current `kubewarden/rust-policy-template` and aligned the example with the current docs by adding `--branch main`.
- The generated metadata file name was incorrect. I changed `metadata.yaml` to `metadata.yml` to match the current template.
- The Rust code sample used a non-current Kubewarden SDK style and would not compile as written against the current template. I replaced it with a template-compatible `src/lib.rs` example using `wapc_init`, `ValidationRequest<Settings>`, and the current `accept_request` / `reject_request` helpers.
- The `kwctl` Linux installation command used an outdated download artifact name. I updated it to the current `kwctl-linux-x86_64.zip` download and extraction flow.
- The local test request was wrapped as an `AdmissionReview`, but `kwctl run --request-path` expects the Kubernetes admission request object JSON. I replaced the example with an admission request object.
- The local test referenced `annotated-policy.wasm` before that file had been created. I changed the example to run the built Wasm module directly with `kwctl run -e kubewarden`.
- The annotate command used outdated names and flags. I updated the target path to `wasm32-wasip1`, changed `metadata.yaml` to `metadata.yml`, and changed `--output` to the current `--output-path`.
- The push example now uses a `registry://` URI so it matches the current `kwctl push` CLI help.

## Review Notes
- The guide remains Linux-oriented for `kwctl` installation. Kubewarden also documents Homebrew, zypper, AUR, macOS, and Windows installation paths.
- The post mentions settings validation in the description, but the walkthrough still relies on the scaffolded `src/settings.rs` rather than showing a custom settings validation example. This is technically acceptable after the code fix, but it is still only lightly covered.
