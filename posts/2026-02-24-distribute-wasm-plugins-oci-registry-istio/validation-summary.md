# Validation Summary: How to Distribute Wasm Plugins via OCI Registry in Istio

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Istio WasmPlugin API
- WebAssembly / Proxy-Wasm modules
- OCI registries and OCI image artifacts
- ORAS CLI
- Kubernetes image pull secrets
- Rust WASI compilation target
- GitHub Actions

## Sources Consulted
- Istio WasmPlugin API reference: https://istio.io/latest/docs/reference/config/proxy_extensions/wasm-plugin/
- Istio Distributing WebAssembly Modules task: https://istio.io/latest/docs/tasks/extensibility/wasm-module-distribution/
- Istio Pull Policy for WebAssembly Modules: https://istio.io/latest/docs/ops/configuration/extensibility/wasm-pull-policy/
- ORAS installation guide: https://oras.land/docs/installation/
- ORAS `push` command reference: https://oras.land/docs/commands/oras_push/
- ORAS `login` command reference: https://oras.land/docs/commands/oras_login/
- ORAS `pull`, `repo tags`, and `manifest fetch` command references: https://oras.land/docs/commands/oras_pull/, https://oras.land/docs/commands/oras_repo_tags/, https://oras.land/docs/commands/oras_manifest_fetch/
- Kubernetes `kubectl create secret docker-registry` reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_create/kubectl_create_secret_docker-registry/
- Rust `wasm32-wasip1` target documentation: https://doc.rust-lang.org/stable/rustc/platform-support/wasm32-wasip1.html
- Rust blog on WASI target renaming: https://blog.rust-lang.org/2024/04/09/updates-to-rusts-wasi-targets/
- WASM OCI Image Specification: https://github.com/solo-io/wasm-image-spec

## Issues Found
- The Rust build commands used the removed `wasm32-wasi` target and corresponding output path. Updated them to `wasm32-wasip1`, which is the current Rust target name for WASI Preview 1.
- The local build snippet did not install the Rust WASI target before building. Added `rustup target add wasm32-wasip1` so the command sequence works on a fresh Rust toolchain.
- The ORAS install snippets pinned `v1.2.0`, while the current ORAS documentation shows `v1.3.2`. Updated the download URLs and tarball names to `v1.3.2`.
- The post described `application/vnd.module.wasm.content.layer.v1+wasm` as the standard OCI registry media type for Wasm modules. Adjusted the wording to say it is the Wasm OCI image-spec media type for the compiled module layer, matching the Wasm OCI Image Specification.
- The caching section said `Always` checks the registry on every proxy start and downloads only if the digest changed. Istio documents `Always` as pulling when the corresponding WasmPlugin resource is created or changed, while digest or `sha256` references force `IfNotPresent` behavior. Updated the pull-policy explanation accordingly.

## Review Notes
The WasmPlugin `url`, `imagePullPolicy`, and `imagePullSecret` examples match the current Istio API reference. The Kubernetes docker-registry secret command and ORAS command forms are valid. In production, digest-pinned OCI references or the WasmPlugin `sha256` field would improve reproducibility beyond tag pinning.
