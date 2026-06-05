# Validation Summary: How to Compare Wasm Containers vs Linux Containers

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- Docker Desktop Wasm workloads
- Docker Buildx
- Docker Compose
- WebAssembly
- WASI Preview 1 and Preview 2
- Rust WASI targets
- Go and TinyGo WebAssembly/WASI targets
- wasi-sdk
- containerd shims and runwasi
- Spin and SpinKube
- Linux containers, namespaces, cgroups, seccomp, AppArmor, and SELinux

## Sources Consulted
- Docker Docs, Wasm workloads: https://docs.docker.com/desktop/features/wasm/
- Docker Docs, alternative container runtimes: https://docs.docker.com/engine/daemon/alternative-runtimes/
- Compose Specification, services top-level element: https://compose-spec.github.io/compose-spec/05-services.html
- Rust Blog, Changes to Rust's WASI targets: https://blog.rust-lang.org/2024/04/09/updates-to-rusts-wasi-targets/
- Rustc Book, wasm32-wasip1 target: https://doc.rust-lang.org/stable/rustc/platform-support/wasm32-wasip1.html
- WebAssembly security documentation: https://webassembly.org/docs/security/
- WebAssembly/WASI capabilities documentation: https://github.com/WebAssembly/WASI/blob/main/docs/Capabilities.md
- Go Blog, WASI support in Go: https://go.dev/blog/wasi
- TinyGo documentation, Using WASI: https://tinygo.org/docs/guides/webassembly/wasi/
- WASI SDK repository: https://github.com/WebAssembly/wasi-sdk
- Spin CLI reference and quickstart: https://spinframework.dev/v2/cli-reference and https://spinframework.dev/v3/quickstart
- SpinKube overview: https://www.spinkube.dev/docs/overview/
- runwasi architecture documentation: https://runwasi.dev/developer/architecture.html

## Issues Found
- Docker Desktop Wasm support was described as simply supported. Updated the wording to note that Docker currently documents Wasm workloads as beta, deprecated, and no longer actively maintained.
- The Docker Desktop setup comment mentioned using the CLI to enable the containerd image store. Replaced it with the documented Docker Desktop setting: "Use containerd for pulling and storing images" under Settings > General.
- The Rust Dockerfile used the deprecated/removed `wasm32-wasi` target with `rust:1.75`. Updated it to `rust:1.84`, `wasm32-wasip1`, and the matching build output path.
- The explanation said a Wasm container runs "instead of a Linux kernel." Reworded this to say it uses a Wasm runtime instead of starting a normal Linux process through `runc`.
- The startup explanation said there is "no kernel boot," which is misleading because Linux containers do not boot a kernel either. Reworded it to focus on avoiding Linux userspace image initialization and container process tree setup.
- The security section claimed Wasm has "no buffer overflows" and "no kernel sharing." Reworded this to accurately describe runtime-enforced sandboxing, memory bounds checks, and the lack of direct access to the full host kernel ABI.
- Fixed over-specific performance and startup ranges that are not guaranteed across hosts, runtimes, and workloads. Reframed them as benchmark-dependent and workload-dependent.
- Updated the TinyGo example from `tinygo build -target=wasi` to the current `GOOS=wasip1 GOARCH=wasm tinygo build` form.
- Updated the Go language-support wording to refer to current `GOOS=wasip1` support and TinyGo WASI Preview 1/2 support.
- Reworded the Kubernetes outlook from "Kubernetes is adding native Wasm support through Spin, Fermyon, and runwasi" to the more accurate RuntimeClass/containerd shim model using projects like runwasi and SpinKube.

## Review Notes
The Docker examples match Docker's current documented `--runtime=io.containerd.wasmedge.v1`, `--platform=wasi/wasm`, Compose `runtime`, and Compose `platform` usage, but readers should be aware that Docker Desktop's Wasm workload feature may be removed in a future Docker Desktop release.
