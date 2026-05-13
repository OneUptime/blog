# Validation Summary: How to Deploy a Rust Application with Flux CD

## Status
validated

## Post Type
Tutorial / deployment guide

## Technologies Covered
- Rust
- Axum
- Tokio
- Docker multi-stage builds
- cargo-chef
- Kubernetes Deployments, Services, probes, security contexts, and HPAs
- Flux CD GitRepository and Kustomization resources
- Flux CD image automation resources

## Sources Consulted
- Axum `serve` documentation: https://docs.rs/axum/latest/axum/serve/
- Tokio signal handling documentation: https://docs.rs/tokio/latest/tokio/signal/
- Tokio Unix signal documentation: https://docs.rs/tokio/latest/tokio/signal/unix/
- cargo-chef README: https://github.com/LukeMathWalker/cargo-chef
- Flux GitRepository documentation: https://fluxcd.io/flux/components/source/gitrepositories/
- Flux Kustomization documentation: https://fluxcd.io/flux/components/kustomize/kustomizations/
- Flux ImageRepository documentation: https://fluxcd.io/flux/components/image/imagerepositories/
- Flux ImagePolicy documentation: https://fluxcd.io/flux/components/image/imagepolicies/
- Flux ImageUpdateAutomation documentation: https://fluxcd.io/flux/components/image/imageupdateautomations/
- Kubernetes security context documentation: https://kubernetes.io/docs/tasks/configure-pod-container/security-context/
- Kubernetes HorizontalPodAutoscaler walkthrough: https://kubernetes.io/docs/tasks/run-application/horizontal-pod-autoscale-walkthrough/
- Docker Rust image guide: https://docs.docker.com/guides/rust/build-images/
- Docker Official Rust image notes: https://hub.docker.com/_/rust

## Issues Found
- The Docker build-cache explanation described the older dummy-binary pattern, but the Dockerfile uses `cargo-chef`. Updated the explanation to accurately describe the recipe/cook pattern used by `cargo-chef`.
- The Axum graceful shutdown sample only handled Ctrl+C. Kubernetes sends SIGTERM during pod termination, so the sample would not gracefully shut down during normal rolling updates. Updated the snippet to listen for both Ctrl+C and SIGTERM with Tokio.
- The Flux `ImageUpdateAutomation` `messageTemplate` used `.Updated.Images`, which Flux v1 documentation says has been removed and will cause the automation to become Stalled. Replaced it with a static valid commit message.
- The post said Rust pods start instantly and that binaries start in milliseconds. Kubernetes pod startup depends on scheduling, image pulls, and probes, and binary startup varies by application. Reworded those claims to say Rust application containers and processes typically start quickly.

## Review Notes
- The Axum snippet was checked with `cargo check` against Axum 0.8 and Tokio 1 in a temporary project.
- `kubectl` and `flux` were not installed in the local environment, so Kubernetes and Flux snippets were validated against official API and component documentation rather than local CLI output.
- The Dockerfile pins `rust:1.78-alpine`, which is older than current stable Rust. It remains a valid image tag, but future updates should consider bumping the pinned compiler after testing the application dependencies.
