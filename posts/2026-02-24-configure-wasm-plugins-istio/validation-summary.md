# Validation Summary: How to Configure Wasm Plugins in Istio

## Status
validated

## Post Type
Tutorial / configuration guide

## Technologies Covered
- Istio WasmPlugin API
- Envoy Proxy-Wasm extensions
- Kubernetes custom resources and kubectl
- Rust Proxy-Wasm SDK configuration callback
- WebAssembly module distribution with OCI images

## Sources Consulted
- Istio WasmPlugin reference: https://istio.io/latest/docs/reference/config/proxy_extensions/wasm-plugin/
- Istio API package for extensions/v1alpha1: https://pkg.go.dev/istio.io/api/extensions/v1alpha1
- Istio WebAssembly Plugin API announcement: https://istio.io/latest/blog/2021/wasm-api-alpha/
- Istio istioctl command reference: https://istio.io/latest/docs/reference/commands/istioctl/
- Kubernetes kubectl apply reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_apply/

## Issues Found
- The introductory WasmPlugin example claimed to show all configurable fields, but it omitted valid fields such as `sha256`, `match`, and `type`. Changed the wording to "common configurable fields" to avoid an inaccurate completeness claim.
- The phase example used `UNSPECIFIED`, but Istio's documented enum value is `UNSPECIFIED_PHASE`. Updated the example and softened the wording to match Istio's "generally" inserted before the router behavior.
- The priority section said equal priorities are not guaranteed. Istio documents deterministic ordering derived from the WasmPlugin name and namespace. Updated the explanation while keeping the advice to set explicit priorities.
- The VM environment examples combined `value` with `valueFrom: HOST`, which current Istio CRD validation rejects. Removed the inline value from the HOST example and clarified that HOST reads the same-named variable from the Envoy process.
- The `targetRefs` Service example lacked the important Istio caveat that Service targetRefs are only supported for waypoints and that `selector` and `targetRefs` are mutually exclusive. Added a short note.
- The configuration update section implied existing plugin instances are always reused. Reworded it to the more precise behavior that Istio pushes updated configuration and the plugin receives it through `on_configure` as applied.

## Review Notes
The `WasmPlugin` API remains `extensions.istio.io/v1alpha1` in the current Istio 1.30 documentation. `targetRefs` requires care in multi-revision environments with pre-1.22 control planes, but the post does not cover upgrade scenarios.
