# Validation Summary: How to Configure All WasmPlugin Fields in Istio

## Status
validated

## Post Type
Reference guide

## Technologies Covered
- Istio
- WasmPlugin custom resource
- Envoy Proxy-Wasm / WebAssembly extensions
- Kubernetes custom resources and secrets
- Gateway API target references

## Sources Consulted
- Istio WasmPlugin API reference: https://istio.io/latest/docs/reference/config/proxy_extensions/wasm-plugin/
- Istio API Go documentation for `extensions/v1alpha1.WasmPlugin`: https://pkg.go.dev/istio.io/api/extensions/v1alpha1
- Istio pull policy documentation for WebAssembly modules: https://istio.io/latest/docs/ops/configuration/extensibility/wasm-pull-policy/
- Envoy Wasm v3 API reference: https://www.envoyproxy.io/docs/envoy/latest/api-v3/extensions/wasm/v3/wasm.proto

## Issues Found
- The top-level example set both `selector` and `targetRef`, which violates Istio's documented mutual exclusivity rule. I removed the target reference from that combined example and corrected the dedicated target reference snippet separately.
- The post used `targetRef`, while the current public Istio reference documents `targetRefs` as the supported attachment field. I updated the section name, field name, and YAML shape to use a list.
- Several `sha256` examples used ellipsis placeholders that would not pass Istio's 64-character lowercase hex validation. I replaced them with valid 64-character hex example values.
- The initial environment variable example set both `value` and `valueFrom: HOST`, which is invalid because inline values belong with `INLINE`. I changed the example to `valueFrom: INLINE`.
- The image pull policy section missed Istio's `latest` tag exception and overstated `Always`. I clarified that OCI images tagged `latest` default to `Always` and that `Always` pulls when the WasmPlugin resource is created or changed.
- The `pluginName` explanation described a derived default that is not stated in the current Istio reference. I replaced it with the documented meaning: the Envoy plugin name formerly called `rootID`, used by some modules to select the plugin to execute.
- The priority section said lower values run first and same-priority ordering is not guaranteed. Istio documents descending priority order and deterministic name/namespace tie-breaking, so I corrected both statements.
- The fail strategy section said `FAIL_OPEN` is the default and omitted `FAIL_RELOAD`. I removed the incorrect default claim and added `FAIL_RELOAD` with its runtime-error limitation.
- The environment variable field description said `value` is used when `valueFrom` is not `HOST`. I tightened this to say it is used with `INLINE`, matching the enum meaning.

## Review Notes
The post is now aligned with the current Istio 1.30 WasmPlugin reference. `WasmPlugin` remains `extensions.istio.io/v1alpha1`, so readers should still check their installed Istio version when using newer attachment behavior such as `targetRefs`.
