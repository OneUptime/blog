# Validation Summary: How to Build Istio WasmPlugin

## Status
validated

## Post Type
Technical tutorial / guide

## Technologies Covered
- Istio WasmPlugin
- Kubernetes
- Envoy proxy extensions
- WebAssembly
- proxy-wasm Rust SDK
- OCI registries and ORAS

## Sources Consulted
- Istio WasmPlugin API reference: https://istio.io/latest/docs/reference/config/proxy_extensions/wasm-plugin/
- Istio WebAssembly module execution task: https://istio.io/latest/docs/tasks/extensibility/wasm-modules/
- Istio WebAssembly pull policy documentation: https://istio.io/latest/docs/ops/configuration/extensibility/wasm-pull-policy/
- Istio WasmPlugin proto schema: https://github.com/istio/api/blob/release-1.30/extensions/v1alpha1/wasm.proto
- Istio istioctl command reference: https://istio.io/latest/docs/reference/commands/istioctl/
- proxy-wasm Rust SDK repository and examples: https://github.com/proxy-wasm/proxy-wasm-rust-sdk
- proxy-wasm Rust crate documentation: https://docs.rs/proxy-wasm/latest/proxy_wasm/
- ORAS push command documentation: https://oras.land/docs/commands/oras_push/

## Issues Found
- Corrected WasmPlugin priority ordering. The post said lower priority values run first, but Istio applies plugins in the same phase by descending priority, so higher values run first.
- Corrected invalid `sha256` examples. Istio validates `sha256` as a bare 64-character lowercase hexadecimal string, not a malformed placeholder or a `sha256:`-prefixed digest.
- Corrected `vmConfig.env` examples. Istio WasmPlugin environment variables support inline values and `valueFrom: HOST`; Kubernetes-style `fieldRef`, `secretKeyRef`, and `configMapKeyRef` are not valid for this field.
- Corrected use of `phase: UNSPECIFIED`. The valid enum name is `UNSPECIFIED_PHASE`, and Istio recommends omitting the phase when the plugin is independent of other filters, so the example now omits the phase.
- Updated Rust build target from `wasm32-wasi` to `wasm32-wasip1`, matching current Rust target naming and current proxy-wasm SDK examples.
- Replaced the obsolete `istioctl proxy-config wasm` command with `istioctl proxy-config ecds`, which is the supported command for inspecting Envoy typed extension configuration.

## Review Notes
Istio 1.30 documentation also introduces and documents `TrafficExtension` for proxy extensions, while `WasmPlugin` remains documented as a v1alpha1 API. Future updates could mention `TrafficExtension` for readers targeting newer Istio extension workflows, but the WasmPlugin-focused examples are now technically consistent with the current WasmPlugin schema.
