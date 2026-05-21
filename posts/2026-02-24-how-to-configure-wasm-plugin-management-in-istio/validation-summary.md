# Validation Summary: How to Configure Wasm Plugin Management in Istio

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Istio WasmPlugin API
- WebAssembly / Wasm
- Envoy proxy
- OCI registries and ORAS
- Kubernetes Secrets and kubectl
- istioctl proxy-config
- TinyGo

## Sources Consulted
- Istio WasmPlugin API reference: https://istio.io/latest/docs/reference/config/proxy_extensions/wasm-plugin/
- Istio Distributing WebAssembly Modules task: https://istio.io/latest/docs/tasks/extensibility/wasm-module-distribution/
- Istio istioctl command reference: https://istio.io/latest/docs/reference/commands/istioctl/
- Istio Prometheus integration documentation: https://istio.io/latest/docs/ops/integrations/prometheus/
- Envoy Wasm runtime documentation: https://www.envoyproxy.io/docs/envoy/latest/configuration/other_features/wasm
- Envoy Wasm architecture documentation: https://www.envoyproxy.io/docs/envoy/latest/intro/arch_overview/advanced/wasm
- ORAS push command reference: https://oras.land/docs/commands/oras_push/
- Kubernetes kubectl create secret docker-registry reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_create/kubectl_create_secret_docker-registry/
- TinyGo WASI documentation: https://tinygo.org/docs/guides/webassembly/wasi/

## Issues Found
- The post said lower `priority` values execute first. Istio applies WasmPlugins in the same phase by priority in descending order, so I changed this to higher numbers executing first.
- The `STATS` phase was described as running after the request is processed. Istio documents it as inserted before Istio stats filters and after authorization filters, so I updated the description.
- The failure-handling explanation omitted `FAIL_RELOAD` and overstated the possible outcomes. I updated the wording and added the `FAIL_RELOAD` option.
- The monitoring section listed `wasm_filter.*` metrics that are not the current Istio module distribution metrics, and it queried the Envoy admin stats endpoint instead of the merged Istio telemetry endpoint. I replaced them with the documented `istio_agent_wasm_*` metrics and updated the example command to use `localhost:15020/stats/prometheus`.
- The mesh-wide scope example assumed `istio-system` specifically. Istio applies root-namespace WasmPlugin resources mesh-wide, so I clarified that `istio-system` is the common root namespace.
- The production versioning guidance relied only on immutable tags. I adjusted it to mention immutable tags or digest references.

## Review Notes
The WasmPlugin API is still `v1alpha1` in the current Istio reference, and Istio describes Wasm module distribution as an alpha feature for expert users. The examples use placeholder registry URLs and plugin configuration keys, so they are structurally correct but require real plugin implementations that understand those `pluginConfig` fields.
