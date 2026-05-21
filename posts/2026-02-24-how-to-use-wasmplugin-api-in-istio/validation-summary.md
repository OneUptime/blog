# Validation Summary: How to Use WasmPlugin API in Istio

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- Istio
- WasmPlugin
- WebAssembly / Proxy-Wasm
- Envoy proxy extensions
- Kubernetes custom resources
- istioctl

## Sources Consulted
- Istio WasmPlugin API reference: https://istio.io/latest/docs/reference/config/proxy_extensions/wasm-plugin/
- Istio Workload Selector and WorkloadMode reference: https://istio.io/latest/docs/reference/config/type/workload-selector/
- Istio istioctl command reference: https://istio.io/latest/docs/reference/commands/istioctl/
- Istio TrafficExtension announcement and migration notes: https://istio.io/latest/blog/2026/traffic-extension-api/

## Issues Found
- The description claimed the guide covered all fields, but the post only covers common WasmPlugin fields. Changed "all fields" to "common fields".
- The mesh-wide selector explanation assumed `istio-system` specifically. Updated it to refer to Istio's root configuration namespace, usually `istio-system`.
- The `UNSPECIFIED_PHASE` explanation incorrectly said it defaults to `AUTHN`. Updated it to match the Istio reference: the control plane decides placement, generally near the end of the filter chain before the router.
- The `STATS` phase explanation said it runs during stats collection. Updated it to clarify that it runs before Istio stats filters and after authorization.
- The verification command used `istioctl proxy-config extension`, which is not a current documented subcommand. Replaced it with `istioctl proxy-config ecds`.
- The traffic selector mode list said `UNDEFINED` means both directions by default. Updated it to use `CLIENT_AND_SERVER` as the WasmPlugin traffic selector default when mode is not specified.
- The summary called WasmPlugin "the proper way" to manage Wasm extensions. Updated it to note that WasmPlugin remains supported, while Istio 1.30 and later recommend TrafficExtension for new extensibility configuration.

## Review Notes
The post is technically relevant and remains useful for existing WasmPlugin resources. For new Istio 1.30+ deployments, a future article or update should consider adding TrafficExtension examples because Istio now positions TrafficExtension as the primary extensibility API.
