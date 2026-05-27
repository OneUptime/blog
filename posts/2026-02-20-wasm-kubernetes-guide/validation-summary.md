# Validation Summary: How to Run WebAssembly Workloads on Kubernetes

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- WebAssembly (WASM)
- Kubernetes
- SpinKube
- Spin Operator
- Spin CLI and Rust SDK
- containerd
- runwasi
- Kubernetes RuntimeClass
- cert-manager
- Helm

## Sources Consulted
- SpinKube Helm installation documentation: https://www.spinkube.dev/docs/install/installing-with-helm/
- SpinKube Quickstart: https://www.spinkube.dev/docs/install/quickstart/
- SpinKube SpinApp API reference: https://www.spinkube.dev/docs/reference/spin-app/
- SpinKube SpinAppExecutor API reference: https://www.spinkube.dev/docs/reference/spin-app-executor/
- SpinKube routing documentation: https://www.spinkube.dev/docs/topics/routing/
- Spin manifest reference: https://spinframework.dev/manifest-reference
- Spin registry documentation: https://spinframework.dev/v3/registry-tutorial
- Spin Rust SDK documentation: https://docs.rs/spin-sdk/
- runwasi installation documentation: https://runwasi.dev/getting-started/installation.html
- runwasi troubleshooting documentation: https://runwasi.dev/resources/troubleshooting.html
- containerd CRI configuration documentation: https://github.com/containerd/containerd/blob/main/docs/cri/config.md
- Kubernetes RuntimeClass documentation: https://kubernetes.io/docs/concepts/containers/runtime-class/

## Issues Found
- The SpinKube installation commands used old `spinkube` GitHub and OCI chart paths and v0.4.0 artifacts. Updated them to the current `spinframework` paths and v0.6.1 operator/chart commands.
- The installation omitted Runtime Class Manager, which current SpinKube Helm documentation requires for installing shims on nodes that do not already include them. Added the Runtime Class Manager install and shim resource commands.
- The cert-manager version and wait target were outdated. Updated to cert-manager v1.20.0 and the documented `cert-manager-webhook` wait command.
- The Spin CLI workflow omitted template installation. Added `spin templates install --git https://github.com/spinframework/spin --update`.
- The Rust handler used `req.path()` and `req.query()`, which are not methods on the Spin SDK HTTP request type. Updated the example to use `req.uri().path()` and `req.uri().query().unwrap_or("")`.
- The SpinApp manifest used `readinessProbe`, which is not a SpinApp spec field. Replaced it with `spec.checks.readiness`, matching the SpinApp API.
- The deployment instructions used `kubectl expose spinapp`, but SpinKube creates a Kubernetes Service for a SpinApp. Replaced this with `kubectl get services` and `kubectl port-forward` against the generated service.
- The runwasi download URL referenced a non-existent v0.5.0 release asset. Updated it to the current v0.6.0 `containerd-shim-wasmtime-x86_64-linux-musl.tar.gz` release asset.
- The edge SpinApp example used unsupported `nodeSelector` and `tolerations` fields on `spec`. Removed those fields and changed the example to reference an executor configured for edge nodes.
- Several performance and size claims were absolute. Reworded them to avoid unsupported guarantees while preserving the intended comparison.

## Review Notes
The runwasi containerd configuration shown matches the documented CRI runtime handler pattern. In production, users should verify the exact containerd configuration path and service restart procedure for their Kubernetes distribution.
