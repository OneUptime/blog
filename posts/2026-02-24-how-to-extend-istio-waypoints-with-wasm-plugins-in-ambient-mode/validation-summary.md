# Validation Summary: How to Extend Istio Waypoints with Wasm Plugins in Ambient Mode

## Status
validated

## Post Type
Technical tutorial

## Technologies Covered
- Istio ambient mode
- Istio waypoint proxies
- Istio WasmPlugin API
- Kubernetes Gateway API
- Kubernetes Service labels
- kubectl and istioctl
- Envoy WebAssembly extensions

## Sources Consulted
- Istio documentation: Extend waypoints with WebAssembly plugins - https://istio.io/latest/docs/ambient/usage/extend-waypoint-wasm/
- Istio documentation: Configure waypoint proxies - https://istio.io/latest/docs/ambient/usage/waypoint/
- Istio reference: Wasm Plugin - https://istio.io/latest/docs/reference/config/proxy_extensions/wasm-plugin/
- Istio reference: istioctl commands - https://istio.io/latest/docs/reference/commands/istioctl/
- Istio blog: Introducing the TrafficExtension API - https://istio.io/latest/blog/2026/traffic-extension-api/

## Issues Found
- The namespace waypoint deployment command created a waypoint but did not enroll the namespace to use it. Changed `istioctl waypoint apply --namespace my-app` to include `--enroll-namespace` and added a short clarification that the flag applies the `istio.io/use-waypoint=waypoint` label.
- The service-specific waypoint section said to label the service to "get" its own waypoint before showing a manually created Gateway. Updated the flow to create the waypoint first with `istioctl waypoint apply --namespace my-app --name my-api-waypoint`, then label the service to use it.
- The verification command used `istioctl proxy-config extension`, which is not a current `istioctl proxy-config` subcommand. Replaced it with `istioctl proxy-config ecds`, which is the Istio command for inspecting extension configuration discovery service output.
- The post said Wasm plugins only make sense at Layer 7 and that Wasm is not the answer for Layer 4 customization in ambient mode. Tightened the wording to the ambient-specific point that custom Wasm plugins attach to Envoy-based waypoints rather than ztunnel, and that Wasm cannot customize ztunnel's Layer 4 processing.

## Review Notes
Istio 1.30 introduces `TrafficExtension` as the recommended primary proxy extensibility API and the current ambient Wasm guide uses `TrafficExtension`. Existing `WasmPlugin` resources remain compatible with no forced migration in Istio 1.30, so the post remains technically valid after the corrections above.
