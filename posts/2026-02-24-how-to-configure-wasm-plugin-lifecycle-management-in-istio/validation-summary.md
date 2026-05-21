# Validation Summary: How to Configure Wasm Plugin Lifecycle Management in Istio

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Istio
- Istio WasmPlugin API
- WebAssembly / Wasm
- Envoy proxy extensions
- Kubernetes
- OCI registries
- kubectl
- istioctl
- Prometheus metrics

## Sources Consulted
- Istio WasmPlugin API reference: https://istio.io/latest/docs/reference/config/proxy_extensions/wasm-plugin/
- Istio istioctl command reference: https://istio.io/latest/docs/reference/commands/istioctl/
- Istio Wasm pull policy documentation: https://istio.io/latest/docs/ops/configuration/extensibility/wasm-pull-policy/
- Istio TrafficExtension API announcement: https://istio.io/latest/blog/2026/traffic-extension-api/
- Envoy Wasm runtime documentation: https://www.envoyproxy.io/docs/envoy/latest/configuration/other_features/wasm
- Kubernetes kubectl create secret docker-registry reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_create/kubectl_create_secret_docker-registry/
- Kubernetes kubectl patch reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_patch/

## Issues Found
- The rollback verification command used `istioctl proxy-config extension`, which is not a current documented `istioctl proxy-config` subcommand. Changed it to `istioctl proxy-config ecds`, the documented command for typed extension configuration.
- The failure strategy section said there were two options, but Istio also documents `FAIL_RELOAD`. Added `FAIL_RELOAD` and changed the wording to "main options."
- The monitoring section listed only null-runtime Wasm metric examples. Updated the examples to use the V8 runtime and clarified that metric names depend on the runtime.

## Review Notes
WasmPlugin remains valid and supported in the current Istio API reference, but Istio 1.30 introduced `TrafficExtension` as the new primary proxy extensibility API for new Wasm and Lua extension configuration. A future update could mention this for readers starting new Istio 1.30+ deployments.
